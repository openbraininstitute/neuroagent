/**
 * Agent Routine with Vercel AI SDK Integration
 * 
 * This module implements the core agent orchestration logic using Vercel AI SDK's
 * streamText function. It handles:
 * - Message history conversion to CoreMessage format
 * - Tool execution and response formatting
 * - Token consumption tracking
 * - Streaming interruption handling
 * - Multi-turn conversation management
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 6.7
 */

import { streamText, CoreMessage, CoreTool, LanguageModelUsage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { BaseTool } from '../tools/base-tool';
import { prisma } from '../db/client';
import { Entity, Task, TokenType } from '../../types';
import type { Message, ToolCall } from '@prisma/client';

/**
 * Agent configuration interface
 * Defines all parameters needed to configure an agent's behavior
 */
export interface AgentConfig {
  /** Model identifier (e.g., 'openai/gpt-4', 'openrouter/anthropic/claude-3') */
  model: string;
  
  /** Temperature for response generation (0-2) */
  temperature: number;
  
  /** Maximum tokens to generate (optional) */
  maxTokens?: number;
  
  /** Reasoning level for model selection (optional) */
  reasoning?: 'none' | 'minimal' | 'low' | 'medium' | 'high';
  
  /** Array of tools available to the agent */
  tools: BaseTool<any>[];
  
  /** System instructions for the agent */
  instructions: string;
}

/**
 * Message with tool calls for database queries
 */
type MessageWithToolCalls = Message & {
  toolCalls: ToolCall[];
};

/**
 * Agent Routine Class
 * 
 * Orchestrates LLM interactions using Vercel AI SDK's streamText function.
 * Handles message history, tool execution, and token tracking.
 */
export class AgentsRoutine {
  private openaiClient: ReturnType<typeof createOpenAI> | null = null;
  private openrouterClient: ReturnType<typeof createOpenRouter> | null = null;

  /**
   * Initialize the agent routine with API credentials
   * 
   * @param openaiApiKey - OpenAI API key (optional)
   * @param openaiBaseUrl - OpenAI base URL (optional)
   * @param openrouterApiKey - OpenRouter API key (optional)
   */
  constructor(
    openaiApiKey?: string,
    openaiBaseUrl?: string,
    openrouterApiKey?: string
  ) {
    if (openaiApiKey) {
      // Initialize OpenAI provider with API key
      this.openaiClient = createOpenAI({
        apiKey: openaiApiKey,
        baseURL: openaiBaseUrl,
      });
    }
    if (openrouterApiKey) {
      this.openrouterClient = createOpenRouter({
        apiKey: openrouterApiKey,
      });
    }
  }

  /**
   * Stream a chat response using Vercel AI SDK
   * 
   * This method:
   * 1. Loads message history from database
   * 2. Converts messages to CoreMessage format
   * 3. Streams LLM response with tool execution
   * 4. Saves messages and token consumption to database
   * 
   * @param agent - Agent configuration
   * @param threadId - Thread ID for message history
   * @param maxTurns - Maximum number of conversation turns (default: 10)
   * @param _maxParallelToolCalls - Maximum parallel tool calls (reserved for future use)
   * @returns Data stream response for client consumption
   * 
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.7
   */
  async streamChat(
    agent: AgentConfig,
    threadId: string,
    maxTurns: number = 10,
    _maxParallelToolCalls: number = 5
  ) {
    console.log('[streamChat] Starting stream for thread:', threadId);
    console.log('[streamChat] Agent config:', {
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      toolCount: agent.tools.length,
      maxTurns,
    });

    // Track if streaming was interrupted (needs to be in outer scope)
    let partialContent = '';
    let chunkCount = 0;

    try {
      // Load message history from database
      console.log('[streamChat] Loading message history from database...');
      const messages = await prisma.message.findMany({
        where: { threadId },
        orderBy: { creationDate: 'asc' },
        include: { toolCalls: true },
      });
      console.log('[streamChat] Loaded', messages.length, 'messages from database');

      // Convert to Vercel AI SDK format
      console.log('[streamChat] Converting messages to CoreMessage format...');
      const coreMessages: CoreMessage[] = this.convertToCoreMessages(messages);
      console.log('[streamChat] Converted to', coreMessages.length, 'core messages');

      // Convert tools to Vercel AI SDK format
      console.log('[streamChat] Converting tools to Vercel format...');
      const tools: Record<string, CoreTool> = {};
      for (const tool of agent.tools) {
        tools[tool.metadata.name] = tool.toVercelTool();
      }
      console.log('[streamChat] Converted', Object.keys(tools).length, 'tools:', Object.keys(tools));

      // Determine provider and model
      console.log('[streamChat] Determining provider and model...');
      const model = this.getProviderAndModel(agent.model);
      console.log('[streamChat] Using model:', agent.model);

      console.log('[streamChat] Initiating streamText...');
      // Stream with Vercel AI SDK
      const result = streamText({
        model,
        messages: [
          { role: 'system', content: agent.instructions },
          ...coreMessages,
        ],
        maxSteps: maxTurns,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        experimental_telemetry: {
          isEnabled: false,
          functionId: 'neuroagent-chat',
        },
        onFinish: async ({ usage, response, finishReason }) => {
          console.log('[streamChat] Stream finished:', {
            finishReason,
            usage,
            messagesCount: response.messages?.length || 0,
          });
          
          // Save message and token consumption to database
          try {
            await this.saveMessageToDatabase(
              threadId,
              response,
              usage,
              agent.model,
              finishReason === 'stop' || finishReason === 'length'
            );
            console.log('[streamChat] Message saved to database successfully');
          } catch (error) {
            console.error('[streamChat] Error saving message to database:', error);
            throw error;
          }
        },
        onChunk: ({ chunk }) => {
          chunkCount++;
          if (chunkCount % 10 === 0) {
            console.log('[streamChat] Received', chunkCount, 'chunks');
          }
          
          // Track partial content for interruption handling
          if (chunk.type === 'text-delta') {
            partialContent += chunk.textDelta;
          }
        },
      });

      console.log('[streamChat] Converting to DataStreamResponse...');
      const response = result.toDataStreamResponse({
        getErrorMessage: (error: unknown) => {
          // Log the error for debugging
          console.error('[streamChat] Error in stream:', error);
          
          // Return detailed error message
          if (error == null) {
            return 'Unknown error occurred';
          }
          
          if (typeof error === 'string') {
            return error;
          }
          
          if (error instanceof Error) {
            // Return the full error message with stack trace in development
            if (process.env.NODE_ENV === 'development') {
              return `${error.message}\n\nStack trace:\n${error.stack}`;
            }
            return error.message;
          }
          
          // For other error types, stringify them
          try {
            return JSON.stringify(error);
          } catch {
            return 'An error occurred while processing your request';
          }
        },
      });
      console.log('[streamChat] DataStreamResponse created successfully');
      return response;
    } catch (error) {
      console.error('[streamChat] Error occurred before streaming:', error);
      console.error('[streamChat] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Save partial message if we have content
      if (partialContent) {
        console.log('[streamChat] Saving partial message with', partialContent.length, 'characters');
        try {
          await this.savePartialMessage(threadId, partialContent, agent.model);
        } catch (saveError) {
          console.error('[streamChat] Error saving partial message:', saveError);
        }
      }
      
      // Return a proper error response instead of throwing
      // This creates a stream with an error part
      let errorMessage: string;
      
      if (error == null) {
        errorMessage = 'An error occurred';
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = 'An error occurred';
        }
      }
      
      const errorStream = new ReadableStream({
        start(controller) {
          // Send error part in Vercel AI SDK format
          // Format: 3:"error message"\n
          const errorPart = `3:${JSON.stringify(errorMessage)}\n`;
          controller.enqueue(new TextEncoder().encode(errorPart));
          controller.close();
        },
      });
      
      return new Response(errorStream, {
        status: 200, // Keep 200 to allow streaming
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Vercel-AI-Data-Stream': 'v1',
        },
      });
    }
  }

  /**
   * Convert database messages to Vercel AI SDK CoreMessage format
   * 
   * Handles conversion of:
   * - User messages
   * - Assistant messages
   * - Tool call messages
   * - Tool result messages
   * 
   * @param messages - Messages from database with tool calls
   * @returns Array of CoreMessage objects
   * 
   * Requirement: 6.2
   */
  private convertToCoreMessages(
    messages: MessageWithToolCalls[]
  ): CoreMessage[] {
    console.log('[convertToCoreMessages] Converting', messages.length, 'messages');
    const coreMessages: CoreMessage[] = [];

    for (const msg of messages) {
      try {
        const content = JSON.parse(msg.content);

        if (msg.entity === Entity.USER) {
          // User message
          const userContent = typeof content === 'string' ? content : content.content || '';
          console.log('[convertToCoreMessages] User message:', userContent.substring(0, 50) + '...');
          coreMessages.push({
            role: 'user',
            content: userContent,
          });
        } else if (msg.entity === Entity.AI_MESSAGE) {
          // Assistant message (may include tool calls)
          const assistantContent = typeof content === 'string' ? content : content.content || '';
          console.log('[convertToCoreMessages] Assistant message with', msg.toolCalls?.length || 0, 'tool calls');
          
          const assistantMessage: CoreMessage = {
            role: 'assistant',
            content: assistantContent,
          };

          // Add tool calls if present
          if (msg.toolCalls && msg.toolCalls.length > 0) {
            assistantMessage.content = [
              {
                type: 'text',
                text: assistantContent,
              },
              ...msg.toolCalls.map((tc) => {
                console.log('[convertToCoreMessages] Tool call:', tc.name, 'with ID:', tc.id);
                return {
                  type: 'tool-call' as const,
                  toolCallId: tc.id,
                  toolName: tc.name,
                  args: JSON.parse(tc.arguments),
                };
              }),
            ];
          }

          coreMessages.push(assistantMessage);
        } else if (msg.entity === Entity.TOOL) {
          // Tool result message
          const toolCallId = content.tool_call_id || content.toolCallId;
          const toolName = content.tool_name || content.toolName;
          console.log('[convertToCoreMessages] Tool result for:', toolName, 'ID:', toolCallId);
          
          coreMessages.push({
            role: 'tool',
            content: [
              {
                type: 'tool-result',
                toolCallId,
                toolName,
                result: content.content || content.result || content,
              },
            ],
          });
        }
      } catch (error) {
        console.error('[convertToCoreMessages] Error parsing message:', error);
        console.error('[convertToCoreMessages] Message ID:', msg.id);
        console.error('[convertToCoreMessages] Message content:', msg.content);
        // Skip malformed messages
        continue;
      }
    }

    console.log('[convertToCoreMessages] Converted to', coreMessages.length, 'core messages');
    return coreMessages;
  }

  /**
   * Get provider and model name from model identifier
   * 
   * Supports formats:
   * - 'openai/gpt-4' -> OpenAI provider, 'gpt-4' model
   * - 'openrouter/anthropic/claude-3' -> OpenRouter provider, 'anthropic/claude-3' model
   * - 'gpt-4' -> OpenAI provider (default), 'gpt-4' model
   * 
   * @param modelIdentifier - Model identifier string
   * @returns Provider model instance
   * @throws Error if provider is not configured
   * 
   * Requirement: 2.3
   */
  private getProviderAndModel(modelIdentifier: string): any {
    if (modelIdentifier.startsWith('openai/')) {
      if (!this.openaiClient) {
        throw new Error('OpenAI provider not configured');
      }
      const modelName = modelIdentifier.replace('openai/', '');
      return this.openaiClient(modelName);
    } else if (modelIdentifier.startsWith('openrouter/')) {
      if (!this.openrouterClient) {
        throw new Error('OpenRouter provider not configured');
      }
      const modelName = modelIdentifier.replace('openrouter/', '');
      return this.openrouterClient(modelName);
    } else {
      // Default to OpenAI
      if (!this.openaiClient) {
        throw new Error('OpenAI provider not configured');
      }
      return this.openaiClient(modelIdentifier);
    }
  }

  /**
   * Save message and token consumption to database
   * 
   * Creates a message record with:
   * - Message content
   * - Tool calls (if any)
   * - Token consumption records
   * 
   * @param threadId - Thread ID
   * @param response - Response from LLM (contains messages array)
   * @param usage - Token usage information
   * @param model - Model identifier
   * @param isComplete - Whether the message is complete
   * 
   * Requirements: 6.4, 6.7
   */
  private async saveMessageToDatabase(
    threadId: string,
    response: any,
    usage: LanguageModelUsage | undefined,
    model: string,
    isComplete: boolean
  ): Promise<void> {
    try {
      console.log('[saveMessageToDatabase] Response structure:', {
        hasMessages: !!response.messages,
        messagesCount: response.messages?.length || 0,
      });

      // Extract messages from response
      const messages = response.messages || [];
      
      // Find the last assistant message
      const lastAssistantMessage = messages
        .filter((m: any) => m.role === 'assistant')
        .pop();

      if (!lastAssistantMessage) {
        console.warn('[saveMessageToDatabase] No assistant message found in response');
        return;
      }

      console.log('[saveMessageToDatabase] Last assistant message:', {
        role: lastAssistantMessage.role,
        contentLength: JSON.stringify(lastAssistantMessage.content).length,
      });

      // Extract text content and tool calls
      let textContent = '';
      const toolCalls: any[] = [];

      if (typeof lastAssistantMessage.content === 'string') {
        textContent = lastAssistantMessage.content;
      } else if (Array.isArray(lastAssistantMessage.content)) {
        // Content is an array of parts
        for (const part of lastAssistantMessage.content) {
          if (part.type === 'text') {
            textContent += part.text;
          } else if (part.type === 'tool-call') {
            toolCalls.push({
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              args: part.args,
            });
          }
        }
      }

      console.log('[saveMessageToDatabase] Extracted:', {
        textLength: textContent.length,
        toolCallsCount: toolCalls.length,
      });

      // Create message record with tool calls and token consumption
      await prisma.message.create({
        data: {
          id: crypto.randomUUID(),
          creationDate: new Date(),
          threadId,
          entity: Entity.AI_MESSAGE,
          content: JSON.stringify({
            role: 'assistant',
            content: textContent,
          }),
          isComplete,
          toolCalls: {
            create: toolCalls.map((tc: any) => ({
              id: tc.toolCallId,
              name: tc.toolName,
              arguments: JSON.stringify(tc.args),
              validated: null,
            })),
          },
          tokenConsumption: {
            create: this.createTokenConsumptionRecords(usage, model),
          },
        },
      });

      console.log('[saveMessageToDatabase] Message saved successfully');
    } catch (error) {
      console.error('[saveMessageToDatabase] Error:', error);
      throw error;
    }
  }

  /**
   * Save partial message to database (for interrupted streams)
   * 
   * Creates a message record with isComplete=false to indicate
   * the message was interrupted during streaming.
   * 
   * @param threadId - Thread ID
   * @param partialContent - Partial content received before interruption
   * @param _model - Model identifier (unused but kept for signature consistency)
   * 
   * Requirement: 6.6
   */
  private async savePartialMessage(
    threadId: string,
    partialContent: string,
    _model: string
  ): Promise<void> {
    try {
      await prisma.message.create({
        data: {
          id: crypto.randomUUID(),
          creationDate: new Date(),
          threadId,
          entity: Entity.AI_MESSAGE,
          content: JSON.stringify({
            role: 'assistant',
            content: partialContent,
          }),
          isComplete: false,
        },
      });
    } catch (error) {
      console.error('Error saving partial message:', error);
      // Don't throw - this is a best-effort operation
    }
  }

  /**
   * Create token consumption records from usage information
   * 
   * Generates records for:
   * - Input tokens (cached and non-cached)
   * - Completion tokens
   * 
   * @param usage - Token usage from LLM
   * @param model - Model identifier
   * @returns Array of token consumption records
   * 
   * Requirement: 6.7
   */
  private createTokenConsumptionRecords(
    usage: LanguageModelUsage | undefined,
    model: string
  ): Array<{
    id: string;
    type: TokenType;
    task: Task;
    count: number;
    model: string;
  }> {
    if (!usage) {
      return [];
    }

    const records: Array<{
      id: string;
      type: TokenType;
      task: Task;
      count: number;
      model: string;
    }> = [];

    // Input tokens (non-cached)
    if (usage.promptTokens) {
      records.push({
        id: crypto.randomUUID(),
        type: TokenType.INPUT_NONCACHED,
        task: Task.CHAT_COMPLETION,
        count: usage.promptTokens,
        model,
      });
    }

    // Completion tokens
    if (usage.completionTokens) {
      records.push({
        id: crypto.randomUUID(),
        type: TokenType.COMPLETION,
        task: Task.CHAT_COMPLETION,
        count: usage.completionTokens,
        model,
      });
    }

    return records;
  }
}
