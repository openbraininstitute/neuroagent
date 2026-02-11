/**
 * Agent Routine with Vercel AI SDK Integration
 *
 * This module implements the core agent orchestration logic using Vercel AI SDK's
 * streamText function. It handles:
 * - Message history conversion to CoreMessage format
 * - Tool execution and response formatting
 * - Token consumption tracking
 * - Streaming interruption handling via abortSignal listener + onChunk tracking
 * - Multi-turn conversation management
 * - Real-time tool call streaming (enabled via toolCallStreaming: true)
 *
 * Tool Call Streaming:
 * In Vercel AI SDK v4.x, tool call streaming is DISABLED by default. We enable it
 * via toolCallStreaming: true to match Python backend behavior where tool calls
 * appear in the UI as soon as the LLM starts generating them (not after completion).
 * This provides immediate feedback with:
 * - 'tool-call-streaming-start' events when tool call begins
 * - 'tool-call-delta' events as arguments stream in
 * - 'tool-call' events when tool call completes
 * Note: In AI SDK v5+, tool call streaming is enabled by default.
 *
 * Streaming Interruption Handling:
 * When a client disconnects or stops streaming (e.g., user clicks stop button),
 * the request's abortSignal is triggered. We handle this by:
 * 1. Tracking streaming content in real-time using onChunk callback
 * 2. Tracking completed steps using onStepFinish callback
 * 3. Listening to abort signal to save immediately when triggered
 * 4. Combining current streaming content with completed steps
 * 5. Saving all partial messages with is_complete=false
 *
 * This approach ensures:
 * - Stream stops immediately (no background continuation)
 * - Current streaming message is captured and saved
 * - Partial messages are saved with is_complete=false
 * - User sees the partial message immediately
 * - Matches Python backend's asyncio.CancelledError behavior
 *
 * Using Vercel AI SDK v4.3.19
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 6.7
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { Message, ToolCall } from '@prisma/client';
import { streamText, type CoreMessage, type Tool, type LanguageModelUsage } from 'ai';

import { Entity, Task, TokenType } from '../../types';
import { prisma } from '../db/client';

import { getSystemPrompt } from './system-prompt';

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
  constructor(openaiApiKey?: string, openaiBaseUrl?: string, openrouterApiKey?: string) {
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
   * 5. Limits parallel tool execution to maxParallelToolCalls
   * 6. Saves messages via onFinish (complete) or abort listener (partial)
   *
   * Streaming Interruption Handling:
   * When the client disconnects (e.g., user clicks stop button), we:
   * - Track streaming content in real-time via onChunk callback
   * - Track completed steps via onStepFinish callback
   * - Listen to abortSignal 'abort' event
   * - Combine current streaming content with completed steps
   * - Save all partial messages immediately when abort fires
   * - Skip onFinish save if already aborted
   * This ensures the currently streaming message is captured and saved with
   * is_complete=false, matching the Python backend's asyncio.CancelledError behavior.
   *
   * @param agent - Agent configuration
   * @param threadId - Thread ID for message history
   * @param maxTurns - Maximum number of conversation turns (default: 10)
   * @param maxParallelToolCalls - Maximum number of tools to execute in parallel (default: 5)
   * @param abortSignal - Optional abort signal for cancellation (from request.signal)
   * @returns Data stream response for client consumption
   *
   * Requirements: 2.6, 6.1, 6.2, 6.3, 6.4, 6.7
   */
  async streamChat(
    agent: AgentConfig,
    threadId: string,
    maxTurns: number = 10,
    maxParallelToolCalls: number = 5,
    abortSignal?: AbortSignal
  ) {
    try {
      // Load message history from database
      const dbMessages = await prisma.message.findMany({
        where: { threadId },
        orderBy: { creationDate: 'asc' },
        include: { toolCalls: true },
      });

      // Convert to Vercel AI SDK format
      const coreMessages: CoreMessage[] = this.convertToCoreMessages(dbMessages);

      // Convert tool classes to Vercel AI SDK format WITH execute functions
      // and wrap them to enforce parallel execution limits
      const tools: Record<string, Tool> = {};

      // Track tool calls per step to enforce parallel execution limits
      // Key: message count (step identifier), Value: number of tools called in that step
      const toolCallsPerStep = new Map<number, number>();

      for (const ToolClass of agent.tools) {
        // All tools are now classes (including MCP tools)
        const toolName = ToolClass.toolName;
        const tempInstance = new ToolClass(agent.contextVariables || {});

        // Get the original tool definition
        const originalTool = tempInstance.toVercelTool();
        const originalExecute = originalTool.execute;

        // Wrap the execute function to enforce parallel execution limits
        // This matches the Python backend behavior where:
        // 1. Tool calls beyond the limit receive an error message asking them to retry
        // 2. Tool execution errors are caught and returned as error messages (not thrown)
        const wrappedTool = {
          ...originalTool,
          execute: async (
            args: any,
            options: { toolCallId: string; messages: any[]; abortSignal?: AbortSignal }
          ) => {
            const { toolCallId, messages } = options;

            // Use message count as step identifier
            // All tool calls in the same step will have the same message count
            const stepId = messages.length;

            // Get or initialize counter for this step
            const currentCount = toolCallsPerStep.get(stepId) || 0;
            const toolPosition = currentCount + 1;

            // Update counter
            toolCallsPerStep.set(stepId, toolPosition);

            // Check if we've exceeded the parallel limit for this step
            if (toolPosition > maxParallelToolCalls) {
              // Return error message matching Python backend behavior
              // This tells the LLM to retry the tool call in the next step
              return `The tool ${toolName} with arguments ${JSON.stringify(args)} could not be executed due to rate limit. Call it again.`;
            }

            // Execute the tool and catch any errors
            // Matches Python backend behavior where errors are returned as tool results
            // instead of breaking the agent loop
            try {
              const result = await originalExecute(args, options);
              return result;
            } catch (error) {
              // Log the error for debugging
              console.error(
                `[streamChat] Tool execution failed: ${toolName} (ID: ${toolCallId})`,
                error
              );

              // Return error as a string result instead of throwing
              // This allows the LLM to see the error and potentially retry or adjust
              // Matches Python backend: return {"role": "tool", "content": str(err)}
              if (error instanceof Error) {
                return `Error executing tool: ${error.message}`;
              } else if (typeof error === 'string') {
                return `Error executing tool: ${error}`;
              } else {
                return `Error executing tool: ${JSON.stringify(error)}`;
              }
            }
          },
        };

        tools[toolName] = wrappedTool as Tool;
      }

      // Determine provider and model
      const model = this.getProviderAndModel(agent.model);

      // Get the assembled system prompt from MDC rule files
      const systemPrompt = await getSystemPrompt();

      // Set up abort signal listener to save partial messages
      // THIS IS NATIVE IN VERCEL AI SDK V5 (it adds an onAbort callback)
      let partialMessages: CoreMessage[] = [];
      let partialUsage: LanguageModelUsage | undefined;
      let currentStreamingMessage: string = '';
      let currentToolCalls: Array<{
        toolCallId: string;
        toolName: string;
        args: any;
      }> = [];

      if (abortSignal) {
        abortSignal.addEventListener('abort', async () => {
          // If we have a currently streaming message, add it to partial messages
          if (currentStreamingMessage || currentToolCalls.length > 0) {
            // Build the partial assistant message
            const partialAssistantMessage: CoreMessage = {
              role: 'assistant',
              content: currentToolCalls.length > 0
                ? [
                    { type: 'text', text: currentStreamingMessage },
                    ...currentToolCalls.map(tc => ({
                      type: 'tool-call' as const,
                      toolCallId: tc.toolCallId,
                      toolName: tc.toolName,
                      args: tc.args,
                    }))
                  ]
                : currentStreamingMessage,
            };

            // Add to partial messages if not already there
            const messagesToSave = [...partialMessages, partialAssistantMessage];

            try {
              await this.saveMessagesToDatabase(
                threadId,
                messagesToSave,
                partialUsage,
                agent.model,
                true // Mark as aborted (is_complete=false)
              );
            } catch (error) {
              console.error('[streamChat] Error saving partial messages after abort:', error);
            }
          } else if (partialMessages.length > 0) {
            // Save completed steps only
            try {
              await this.saveMessagesToDatabase(
                threadId,
                partialMessages,
                partialUsage,
                agent.model,
                true // Mark as aborted (is_complete=false)
              );
            } catch (error) {
              console.error('[streamChat] Error saving partial messages after abort:', error);
            }
          }
        });
      }

      const result = streamText({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...coreMessages],
        tools,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        maxSteps: maxTurns, // Enable automatic multi-step tool execution
        toolCallStreaming: true, // Enable streaming of tool call deltas (disabled by default in v4)
        abortSignal, // Forward abort signal from request to detect client disconnect
        onChunk: async ({ chunk }) => {
          // Track streaming content in real-time for abort handling
          if (chunk.type === 'text-delta') {
            currentStreamingMessage += chunk.textDelta;
          } else if (chunk.type === 'tool-call-delta') {
            // Track tool call deltas for abort handling
            const existingToolCall = currentToolCalls.find(tc => tc.toolCallId === chunk.toolCallId);
            if (!existingToolCall && chunk.toolName) {
              currentToolCalls.push({
                toolCallId: chunk.toolCallId,
                toolName: chunk.toolName,
                args: {},
              });
            }
            if (chunk.argsTextDelta && existingToolCall) {
              // Accumulate args (they come as JSON string deltas)
              try {
                const currentArgs = JSON.stringify(existingToolCall.args);
                existingToolCall.args = JSON.parse(currentArgs + chunk.argsTextDelta);
              } catch {
                // Ignore parse errors during streaming
              }
            }
          } else if (chunk.type === 'tool-call') {
            // Complete tool call received
            const existingIndex = currentToolCalls.findIndex(tc => tc.toolCallId === chunk.toolCallId);
            if (existingIndex >= 0) {
              currentToolCalls[existingIndex] = {
                toolCallId: chunk.toolCallId,
                toolName: chunk.toolName,
                args: chunk.args,
              };
            } else {
              currentToolCalls.push({
                toolCallId: chunk.toolCallId,
                toolName: chunk.toolName,
                args: chunk.args,
              });
            }
          }
        },
        onStepFinish: async ({ response, usage }) => {
          // Track partial state as each step completes
          // This allows us to save the latest state when abort is triggered
          partialMessages = response.messages || [];
          partialUsage = usage;

          // Reset current streaming state after step completes
          currentStreamingMessage = '';
          currentToolCalls = [];
        },
        onFinish: async ({ response, usage }) => {
          // Only save if not aborted (abort handler will save partial messages)
          if (!abortSignal?.aborted) {
            try {
              await this.saveMessagesToDatabase(
                threadId,
                response.messages || [],
                usage,
                agent.model,
                false // Mark as complete (is_complete=true)
              );
            } catch (error) {
              console.error('[streamChat] Error saving messages to database:', error);
              throw error;
            }
          }
        },
      });

      // Convert to data stream response with error handling
      // Note: Vercel AI SDK v4.3.19 automatically streams tool-call-delta chunks
      // in the data stream format, so tool calls appear in real-time in the UI
      return result.toDataStreamResponse({
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
    } catch (error) {
      console.error('[streamChat] Error setting up agent:', error);
      console.error(
        '[streamChat] Error stack:',
        error instanceof Error ? error.stack : 'No stack trace'
      );

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
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
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
   * Matches Python backend behavior:
   * - Assistant messages with tool calls use Entity.AI_TOOL
   * - Assistant messages without tool calls use Entity.AI_MESSAGE
   * - Tool results use Entity.TOOL
   * - Message content follows Python format with role, content, and optional tool_calls
   * - When stream is aborted, messages are marked with is_complete=false
   *
   * @param threadId - Thread ID
   * @param messages - Messages from Vercel AI SDK response
   * @param usage - Token usage information
   * @param model - Model identifier
   * @param isAborted - Whether the stream was aborted by the client
   */
  private async saveMessagesToDatabase(
    threadId: string,
    messages: CoreMessage[],
    usage: LanguageModelUsage | undefined,
    model: string,
    isAborted: boolean = false
  ): Promise<void> {
    try {
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

          // Determine entity type based on whether there are tool calls
          const entity = toolCalls.length > 0 ? Entity.AI_TOOL : Entity.AI_MESSAGE;

          // Build message content matching Python backend format
          const messageContent: any = {
            role: 'assistant',
            content: textContent,
            sender: 'Agent', // Default sender name
            function_call: null,
          };

          // Add tool_calls to content if present (matching Python format)
          if (toolCalls.length > 0) {
            messageContent.tool_calls = toolCalls.map((tc) => ({
              id: tc.toolCallId,
              function: {
                name: tc.toolName,
                arguments: JSON.stringify(tc.args),
              },
              type: 'function',
            }));
          }

          // Save assistant message with tool calls as nested records
          await prisma.message.create({
            data: {
              id: crypto.randomUUID(),
              creationDate: new Date(),
              threadId,
              entity,
              content: JSON.stringify(messageContent),
              isComplete: !isAborted, // Mark as incomplete if stream was aborted
              toolCalls: {
                create: toolCalls.map((tc) => ({
                  id: tc.toolCallId,
                  name: tc.toolName,
                  arguments: JSON.stringify(tc.args),
                  validated: null, // Will be set to true/false after validation
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
                      content:
                        typeof part.result === 'string' ? part.result : JSON.stringify(part.result),
                    }),
                    isComplete: true,
                  },
                });
              }
            }
          }
        }
      }
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
   * - Assistant messages (AI_MESSAGE and AI_TOOL)
   * - Tool result messages
   *
   * Matches Python backend message format where:
   * - AI_MESSAGE: Assistant message without tool calls
   * - AI_TOOL: Assistant message with tool calls
   * - TOOL: Tool execution results
   *
   * @param messages - Messages from database with tool calls
   * @returns Array of CoreMessage objects
   *
   * Requirement: 6.2
   */
  private convertToCoreMessages(messages: MessageWithToolCalls[]): CoreMessage[] {
    const coreMessages: CoreMessage[] = [];

    for (const msg of messages) {
      try {
        const content = JSON.parse(msg.content);

        if (msg.entity === Entity.USER) {
          // User message
          const userContent = typeof content === 'string' ? content : content.content || '';
          coreMessages.push({
            role: 'user',
            content: userContent,
          });
        } else if (msg.entity === Entity.AI_MESSAGE || msg.entity === Entity.AI_TOOL) {
          // Assistant message (with or without tool calls)
          const assistantContent = typeof content === 'string' ? content : content.content || '';

          // Check if there are tool calls in the message content (Python format)
          const hasToolCalls =
            content.tool_calls &&
            Array.isArray(content.tool_calls) &&
            content.tool_calls.length > 0;

          if (hasToolCalls) {
            // Assistant message with tool calls
            const assistantMessage: CoreMessage = {
              role: 'assistant',
              content: [
                {
                  type: 'text',
                  text: assistantContent,
                },
                ...content.tool_calls.map((tc: any) => {
                  return {
                    type: 'tool-call' as const,
                    toolCallId: tc.id,
                    toolName: tc.function?.name || tc.name,
                    args:
                      typeof tc.function?.arguments === 'string'
                        ? JSON.parse(tc.function.arguments)
                        : tc.function?.arguments || tc.args || {},
                  };
                }),
              ],
            };
            coreMessages.push(assistantMessage);
          } else {
            // Assistant message without tool calls
            coreMessages.push({
              role: 'assistant',
              content: assistantContent,
            });
          }
        } else if (msg.entity === Entity.TOOL) {
          // Tool result message
          const toolCallId = content.tool_call_id || content.toolCallId;
          const toolName = content.tool_name || content.toolName;
          const toolContent = content.content || content.result || '';

          coreMessages.push({
            role: 'tool',
            content: [
              {
                type: 'tool-result',
                toolCallId,
                toolName,
                result: toolContent,
              },
            ],
          });
        }
      } catch (error) {
        console.error('[convertToCoreMessages] Error parsing message:', error);
        console.error('[convertToCoreMessages] Message ID:', msg.id);
        console.error('[convertToCoreMessages] Message entity:', msg.entity);
        console.error('[convertToCoreMessages] Message content:', msg.content);
        // Skip malformed messages
        continue;
      }
    }

    return coreMessages;
  }

  /**
   * Get provider and model name from model identifier
   *
   * Supports formats:
   * - 'openai/gpt-4' -> OpenAI provider, 'gpt-4' model
   * - 'openrouter/anthropic/claude-3' -> OpenRouter provider, 'anthropic/claude-3' model
   * - 'anthropic/claude-3' -> OpenRouter provider (default), 'anthropic/claude-3' model
   *
   * Logic matches Python backend:
   * - If model starts with 'openai/', use OpenAI provider and strip prefix
   * - Otherwise, use OpenRouter provider (no prefix stripping needed)
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
      // OpenAI models: strip 'openai/' prefix
      if (!this.openaiClient) {
        throw new Error('OpenAI provider not configured');
      }
      const modelName = modelIdentifier.replace('openai/', '');
      // Set structuredOutputs: false to allow optional parameters in tool schemas
      return this.openaiClient(modelName, { structuredOutputs: false });
    } else {
      // Default to OpenRouter for all other models (including 'openrouter/' prefix)
      if (!this.openrouterClient) {
        throw new Error('OpenRouter provider not configured');
      }
      // OpenRouter expects the full model identifier (e.g., 'anthropic/claude-3-5-sonnet')
      // Don't strip 'openrouter/' prefix as it's not part of the model name format
      return this.openrouterClient(modelIdentifier);
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
