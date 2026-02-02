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

import { streamText, CoreMessage, Tool, LanguageModelUsage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
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

  /** Array of tool CLASSES available to the agent (not instances) */
  tools: any[];

  /** System instructions for the agent */
  instructions: string;

  /** Context variables for tool instantiation (optional) */
  contextVariables?: any;
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
      // Note: We don't set compatibility mode to let Vercel AI SDK handle
      // OpenAI's structured outputs correctly with strict: false by default
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
   * Stream a chat response using Vercel AI SDK with automatic multi-step tool execution
   *
   * This method leverages Vercel AI SDK's built-in multi-step capabilities:
   * 1. Loads message history from database
   * 2. Converts messages to CoreMessage format
   * 3. Calls streamText with maxSteps to enable automatic multi-turn execution
   * 4. Vercel AI SDK automatically:
   *    - Calls tools when requested by the LLM
   *    - Adds tool results to message history
   *    - Continues generation until completion or maxSteps reached
   * 5. Saves messages and token consumption via onFinish callback
   *
   * @param agent - Agent configuration
   * @param threadId - Thread ID for message history
   * @param maxTurns - Maximum number of conversation turns (default: 10)
   * @param _maxParallelToolCalls - Reserved for future use
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
    console.log('[streamChat] Starting multi-turn agent for thread:', threadId);
    console.log('[streamChat] Agent config:', {
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      toolCount: agent.tools.length,
      maxTurns,
    });

    try {
      // Load message history from database
      console.log('[streamChat] Loading message history from database...');
      const dbMessages = await prisma.message.findMany({
        where: { threadId },
        orderBy: { creationDate: 'asc' },
        include: { toolCalls: true },
      });
      console.log('[streamChat] Loaded', dbMessages.length, 'messages from database');

      // Convert to Vercel AI SDK format
      console.log('[streamChat] Converting messages to CoreMessage format...');
      const coreMessages: CoreMessage[] = this.convertToCoreMessages(dbMessages);
      console.log('[streamChat] Converted to', coreMessages.length, 'core messages');

      // Convert tool classes to Vercel AI SDK format WITH execute functions
      console.log('[streamChat] Converting tool classes to Vercel format...');
      const tools: Record<string, Tool> = {};
      for (const ToolClass of agent.tools) {
        const toolName = ToolClass.toolName;
        const tempInstance = new ToolClass(agent.contextVariables || {});

        // Get the full tool definition with execute function
        // Vercel AI SDK will handle automatic execution
        tools[toolName] = tempInstance.toVercelTool();
      }
      console.log('[streamChat] Converted', Object.keys(tools).length, 'tools:', Object.keys(tools));

      // Log the tool schemas before sending to LLM
      console.log('[streamChat] ========== TOOL SCHEMAS SENT TO LLM ==========');
      for (const [toolName, tool] of Object.entries(tools)) {
        try {
          console.log(`Tool: ${toolName}`);
          console.log(`Description: ${(tool as any).description}`);
          console.log(`Parameters schema:`, (tool as any).parameters);
        } catch (error) {
          console.error(`[streamChat] Failed to log schema for tool "${toolName}":`, error);
        }
      }
      console.log('[streamChat] ================================================');

      // Determine provider and model
      const model = this.getProviderAndModel(agent.model);

      // Use Vercel AI SDK's built-in multi-step execution
      console.log('[streamChat] Initiating streamText with maxSteps:', maxTurns);
      const result = streamText({
        model,
        messages: [
          { role: 'system', content: agent.instructions },
          ...coreMessages,
        ],
        tools,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        maxSteps: maxTurns, // Enable automatic multi-step tool execution
        experimental_telemetry: {
          isEnabled: false,
          functionId: 'neuroagent-chat',
        },
        onFinish: async ({ response, usage, finishReason }) => {
          console.log('[streamChat] Stream finished:', {
            finishReason,
            usage,
            messagesCount: response.messages?.length || 0,
          });

          // Save all messages generated during the multi-step execution
          try {
            await this.saveMessagesToDatabase(
              threadId,
              response.messages || [],
              usage,
              agent.model
            );
            console.log('[streamChat] Messages saved to database successfully');
          } catch (error) {
            console.error('[streamChat] Error saving messages to database:', error);
            throw error;
          }
        },
      });

      console.log('[streamChat] Converting to DataStreamResponse...');
      const response = result.toDataStreamResponse({
        getErrorMessage: (error: unknown) => {
          console.error('[streamChat] Error in stream:', error);

          if (error == null) {
            return 'Unknown error occurred';
          }

          if (typeof error === 'string') {
            return error;
          }

          if (error instanceof Error) {
            if (process.env.NODE_ENV === 'development') {
              return `${error.message}\n\nStack trace:\n${error.stack}`;
            }
            return error.message;
          }

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
      console.error('[streamChat] Error setting up agent:', error);
      console.error('[streamChat] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

      // Return error response
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStream = new ReadableStream({
        start(controller) {
          const errorPart = `3:${JSON.stringify(errorMessage)}\n`;
          controller.enqueue(new TextEncoder().encode(errorPart));
          controller.close();
        },
      });

      return new Response(errorStream, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Vercel-AI-Data-Stream': 'v1',
        },
      });
    }
  }

  /**
   * Save messages to database from Vercel AI SDK response
   *
   * Processes all messages generated during multi-step execution and saves them
   * to the database with appropriate entity types and tool call information.
   *
   * @param threadId - Thread ID
   * @param messages - Messages from Vercel AI SDK response
   * @param usage - Token usage information
   * @param model - Model identifier
   */
  private async saveMessagesToDatabase(
    threadId: string,
    messages: CoreMessage[],
    usage: LanguageModelUsage | undefined,
    model: string
  ): Promise<void> {
    try {
      console.log('[saveMessagesToDatabase] Saving', messages.length, 'messages');

      for (const message of messages) {
        if (message.role === 'assistant') {
          // Extract text content and tool calls
          let textContent = '';
          const toolCalls: Array<{
            toolCallId: string;
            toolName: string;
            args: any;
          }> = [];

          if (typeof message.content === 'string') {
            textContent = message.content;
          } else if (Array.isArray(message.content)) {
            for (const part of message.content) {
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

          // Save assistant message
          await prisma.message.create({
            data: {
              id: crypto.randomUUID(),
              creationDate: new Date(),
              threadId,
              entity: toolCalls.length > 0 ? Entity.AI_TOOL : Entity.AI_MESSAGE,
              content: JSON.stringify({
                role: 'assistant',
                content: textContent,
              }),
              isComplete: true,
              toolCalls: {
                create: toolCalls.map((tc) => ({
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
        } else if (message.role === 'tool') {
          // Save tool result messages
          if (Array.isArray(message.content)) {
            for (const part of message.content) {
              if (part.type === 'tool-result') {
                await prisma.message.create({
                  data: {
                    id: crypto.randomUUID(),
                    creationDate: new Date(),
                    threadId,
                    entity: Entity.TOOL,
                    content: JSON.stringify({
                      role: 'tool',
                      tool_call_id: part.toolCallId,
                      tool_name: part.toolName,
                      content: typeof part.result === 'string'
                        ? part.result
                        : JSON.stringify(part.result),
                    }),
                    isComplete: true,
                  },
                });
              }
            }
          }
        }
      }

      console.log('[saveMessagesToDatabase] All messages saved successfully');
    } catch (error) {
      console.error('[saveMessagesToDatabase] Error:', error);
      throw error;
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
   * Note: For OpenAI models, we set structuredOutputs: false to allow optional parameters
   * in tool schemas without requiring strict mode validation. This matches the Python
   * backend behavior where tools have "strict": false.
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
      // Set structuredOutputs: false to allow optional parameters in tool schemas
      return this.openaiClient(modelName, { structuredOutputs: false });
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
      // Set structuredOutputs: false to allow optional parameters in tool schemas
      return this.openaiClient(modelIdentifier, { structuredOutputs: false });
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
