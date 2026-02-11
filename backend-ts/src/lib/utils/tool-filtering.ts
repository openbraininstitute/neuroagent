/**
 * Tool Filtering and Model Selection
 *
 * Translates Python's filter_tools_and_model_by_conversation function.
 * Uses an LLM to analyze conversation history and determine:
 * 1. Which tools are relevant (when tool count exceeds threshold)
 * 2. Query complexity for model selection (when no model pre-selected)
 *
 * Requirements: Matches backend/src/neuroagent/app/app_utils.py
 */

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { Message, ToolCall } from '@prisma/client';
import { generateObject } from 'ai';
import { z } from 'zod';

import { prisma } from '@/lib/db/client';
import { Entity, Task, TokenType } from '@/types';

/**
 * Message with tool calls for database queries
 */
type MessageWithToolCalls = Message & {
  toolCalls: ToolCall[];
};

/**
 * Tool filtering and model selection result
 */
export interface ToolFilteringResult {
  /** Filtered list of tool classes */
  filteredTools: any[];
  /** Selected model identifier */
  model: string;
  /** Reasoning level (uppercase to match Prisma enum) */
  reasoning?: 'NONE' | 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | null;
}

/**
 * Map complexity score to optimal model and reasoning effort
 *
 * Matches Python backend logic:
 * - 0-1: gpt-5-nano with minimal reasoning
 * - 2-5: gpt-5-mini with low reasoning
 * - 6-8: gpt-5-mini with medium reasoning
 * - 9-10: gpt-5.1 with medium reasoning
 *
 * @param complexity - Query complexity score from 0-10
 * @returns Object with model and reasoning keys (reasoning is uppercase to match Prisma enum)
 */
function complexityToModelAndReasoning(complexity: number): {
  model: string;
  reasoning: 'NONE' | 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | null;
} {
  if (complexity <= 1) {
    return { model: 'openai/gpt-5-nano', reasoning: 'MINIMAL' };
  } else if (complexity <= 5) {
    return { model: 'openai/gpt-5-mini', reasoning: 'LOW' };
  } else if (complexity <= 8) {
    return { model: 'openai/gpt-5-mini', reasoning: 'MEDIUM' };
  } else {
    return { model: 'openai/gpt-5.1', reasoning: 'MEDIUM' };
  }
}

/**
 * Convert database messages to OpenAI format for tool filtering
 *
 * @param messages - Messages from database with tool calls
 * @returns Array of messages in OpenAI format
 */
async function messagesToOpenAIContent(
  messages: MessageWithToolCalls[]
): Promise<Array<{ role: string; content: string; tool_call_id?: string; name?: string }>> {
  const openaiMessages: Array<{
    role: string;
    content: string;
    tool_call_id?: string;
    name?: string;
  }> = [];

  for (const msg of messages) {
    try {
      const content = JSON.parse(msg.content);

      if (msg.entity === Entity.USER) {
        openaiMessages.push({
          role: 'user',
          content: typeof content === 'string' ? content : content.content || '',
        });
      } else if (msg.entity === Entity.AI_MESSAGE || msg.entity === Entity.AI_TOOL) {
        openaiMessages.push({
          role: 'assistant',
          content: typeof content === 'string' ? content : content.content || '',
        });
      } else if (msg.entity === Entity.TOOL) {
        // Truncate tool responses to save tokens
        openaiMessages.push({
          role: 'tool',
          content: '...',
          tool_call_id: content.tool_call_id || content.toolCallId,
          name: content.tool_name || content.toolName,
        });
      }
    } catch (error) {
      console.error('[messagesToOpenAIContent] Error parsing message:', error);
      continue;
    }
  }

  return openaiMessages;
}

/**
 * Filter tools and select model based on conversation context and query complexity
 *
 * Translates Python's filter_tools_and_model_by_conversation function.
 * Uses an LLM to analyze the conversation history and determine which tools are relevant
 * and what model/reasoning level is appropriate.
 *
 * Performs tool selection when the number of available tools exceeds the minimum threshold,
 * and model selection when no model is pre-selected. Updates the last message with selection
 * metadata and token consumption.
 *
 * @param threadId - Thread ID for loading messages
 * @param toolList - Available tools to filter from
 * @param openRouterToken - OpenRouter API token
 * @param minToolSelection - Minimum number of tools to select
 * @param selectedModel - Pre-selected model name (optional)
 * @param defaultChatModel - Default model if selection fails
 * @param defaultChatReasoning - Default reasoning if selection fails
 * @returns Filtered tool list and model/reasoning dictionary
 */
export async function filterToolsAndModelByConversation(
  threadId: string,
  toolList: any[],
  openRouterToken: string,
  minToolSelection: number,
  selectedModel?: string | null,
  defaultChatModel: string = 'openai/gpt-5-mini',
  defaultChatReasoning: string = 'low'
): Promise<ToolFilteringResult> {
  const needToolSelection = toolList.length > minToolSelection;
  const needModelSelection = !selectedModel;

  // Load messages from database
  const messages = await prisma.message.findMany({
    where: { threadId },
    orderBy: { creationDate: 'asc' },
    include: { toolCalls: true },
  });

  // If neither selection is needed, return defaults
  if (!needToolSelection && selectedModel) {
    // Save model selection to last message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      await prisma.complexityEstimation.create({
        data: {
          id: crypto.randomUUID(),
          model: selectedModel,
          reasoning: null,
          messageId: lastMessage.id,
        },
      });
    }

    return {
      filteredTools: toolList,
      model: selectedModel,
      reasoning: null,
    };
  }

  // Convert messages to OpenAI format
  const openaiMessages = await messagesToOpenAIContent(messages);

  // Build system prompt conditionally
  const instructions: string[] = [];
  const outputFields: string[] = [];

  if (needToolSelection) {
    instructions.push(`TOOL SELECTION:
1. Analyze the conversation to identify required capabilities
2. Select at least ${minToolSelection} of the most relevant tools by name only
3. BIAS TOWARD INCLUSION: If uncertain about a tool's relevance, include it - better to provide too many tools than too few
4. Only exclude tools that are clearly irrelevant to the conversation
5. Each tool must be selected only once`);
    outputFields.push('selected_tools: [tool_name1, tool_name2, ...]');
  }

  if (needModelSelection) {
    instructions.push(`COMPLEXITY RANKING (0-10):
Evaluate the inherent complexity of the query while considering how well the selected tools can address it. This determines model selection and reasoning effort.
- 0-1: Simple query answerable directly from LLM knowledge (no tools needed)
- 2-3: Straightforward query with a tool that directly solves it (single call, minimal reasoning)
- 4-6: Moderate query requiring some reasoning, even with helpful tools (2-3 calls, basic orchestration)
- 7-8: Complex query requiring significant reasoning despite tool support (multi-step workflows, cross-referencing)
- 9-10: Highly complex query demanding deep reasoning even with available tools (extensive orchestration, novel problem-solving)`);
    outputFields.push('complexity: int');
  }

  const taskDesc: string[] = [];
  if (needToolSelection) {
    taskDesc.push('filter tools');
  }
  if (needModelSelection) {
    taskDesc.push('rank query complexity');
  }

  const systemPrompt = `TASK: ${taskDesc.join(' and ').charAt(0).toUpperCase() + taskDesc.join(' and ').slice(1)}.

${instructions.join('\n\n')}

Do not respond to user queries - only ${taskDesc.join(' and ')}.

OUTPUT: { ${outputFields.join(', ')} }

AVAILABLE TOOLS:
${toolList
  .map(
    (tool) =>
      `${tool.toolName}: ${tool.toolDescription}\nExample utterances:\n${tool.toolUtterances?.map((u: string) => `- ${u}`).join('\n') || '- No examples'}`
  )
  .join('\n\n')}`;

  // Build dynamic Zod schema
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  if (needToolSelection) {
    const toolNames = toolList.map((tool) => tool.toolName);
    schemaFields['selected_tools'] = z
      .array(z.enum(toolNames as [string, ...string[]]))
      .min(minToolSelection)
      .describe(
        `List of selected tool names, minimum ${minToolSelection} items. Must contain all of the tools relevant to the conversation. Must not contain duplicates.`
      );
  }

  if (needModelSelection) {
    schemaFields['complexity'] = z
      .number()
      .int()
      .min(0)
      .max(10)
      .describe(
        'Complexity of the query on a scale from 0 to 10. Trivial queries are ranked 0, extremely hard ones are ranked 10'
      );
  }

  const ToolModelFilteringSchema = z.object(schemaFields);

  try {
    // Initialize OpenRouter client
    const openrouterClient = createOpenRouter({
      apiKey: openRouterToken,
    });

    const model = 'google/gemini-2.5-flash';
    const startRequest = Date.now();

    // Call LLM with structured output
    // Note: Using .chat() method for OpenRouter provider compatibility
    // Type assertion needed due to version mismatch between AI SDK and OpenRouter provider
    // Filter out tool messages as generateObject only accepts system/user/assistant roles
    const result = await generateObject({
      model: openrouterClient.chat(model) as any,
      messages: [
        { role: 'system', content: systemPrompt },
        ...openaiMessages
          .filter((msg) => msg.role !== 'tool')
          .map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
      ],
      schema: ToolModelFilteringSchema,
    });

    // Parse the output - use bracket notation to avoid index signature issues
    const parsed = result.object as any;

    // Handle tool selection
    let filteredTools: any[]
    if (needToolSelection && 'selected_tools' in parsed) {
      const selectedToolsRaw = parsed['selected_tools'];
      const selectedTools = Array.from(new Set(selectedToolsRaw as string[]));
      filteredTools = toolList.filter((tool) => selectedTools.includes(tool.toolName));
    } else {
      filteredTools = toolList;
    }

    // Handle model selection
    let modelReasonDict: {
      model: string;
      reasoning: 'NONE' | 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | null;
    };
    let complexity: number | null = null;

    if (needModelSelection && 'complexity' in parsed) {
      const complexityRaw = parsed['complexity'];
      complexity = complexityRaw as number;
      modelReasonDict = complexityToModelAndReasoning(complexity);
    } else {
      modelReasonDict = {
        model: selectedModel || defaultChatModel,
        reasoning: null,
      };
    }

    const elapsedTime = ((Date.now() - startRequest) / 1000).toFixed(2);
    // Log tool filtering summary (matches Python backend logger.debug)
    console.log(
      `Query complexity: ${complexity !== null ? complexity : 'N/A'} / 10, selected model ${modelReasonDict.model.replace('openai/', '')} with reasoning effort ${modelReasonDict.reasoning || 'N/A'}  #TOOLS: ${filteredTools.length}, SELECTED TOOLS: ${filteredTools.map((t) => t.toolName)} in ${elapsedTime} s`
    );

    // Save to database
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      // Save tool selection
      if (needToolSelection && filteredTools.length > 0) {
        await prisma.toolSelection.createMany({
          data: filteredTools.map((tool) => ({
            id: crypto.randomUUID(),
            toolName: tool.toolName,
            messageId: lastMessage.id,
          })),
        });
      }

      // Save model selection
      await prisma.complexityEstimation.create({
        data: {
          id: crypto.randomUUID(),
          complexity,
          model: modelReasonDict.model,
          reasoning: modelReasonDict.reasoning,
          messageId: lastMessage.id,
        },
      });

      // Save token consumption
      if (result.usage) {
        const tokenRecords = [];

        if (result.usage.promptTokens) {
          tokenRecords.push({
            id: crypto.randomUUID(),
            type: TokenType.INPUT_NONCACHED,
            task: Task.TOOL_SELECTION,
            count: result.usage.promptTokens,
            model,
            messageId: lastMessage.id,
          });
        }

        if (result.usage.completionTokens) {
          tokenRecords.push({
            id: crypto.randomUUID(),
            type: TokenType.COMPLETION,
            task: Task.TOOL_SELECTION,
            count: result.usage.completionTokens,
            model,
            messageId: lastMessage.id,
          });
        }

        if (tokenRecords.length > 0) {
          await prisma.tokenConsumption.createMany({
            data: tokenRecords,
          });
        }
      }
    }

    return {
      filteredTools,
      model: modelReasonDict.model,
      reasoning: modelReasonDict.reasoning,
    };
  } catch (error) {
    console.error('[filterToolsAndModelByConversation] Error filtering tools:', error);

    // Return defaults on error
    const filteredTools = needToolSelection ? [] : toolList;
    const modelReasonDict: {
      model: string;
      reasoning: 'NONE' | 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | null;
    } = {
      model: selectedModel || defaultChatModel,
      reasoning: selectedModel
        ? null
        : (defaultChatReasoning.toUpperCase() as 'NONE' | 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH'),
    };

    // Save model selection to database even on error
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      await prisma.complexityEstimation.create({
        data: {
          id: crypto.randomUUID(),
          complexity: null,
          model: modelReasonDict.model,
          reasoning: modelReasonDict.reasoning,
          messageId: lastMessage.id,
        },
      });
    }

    return {
      filteredTools,
      model: modelReasonDict.model,
      reasoning: modelReasonDict.reasoning,
    };
  }
}
