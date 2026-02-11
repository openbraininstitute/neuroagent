/**
 * Question Suggestions API Route
 *
 * Generates three suggested user actions based on:
 * - In-chat: Recent conversation history from a thread
 * - Out-of-chat: Current page context from frontend URL
 *
 * Uses Vercel AI SDK's generateObject for structured output generation.
 */

import { createOpenAI } from '@ai-sdk/openai';
import { entity } from '@prisma/client';
import { generateObject } from 'ai';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSettings } from '@/lib/config/settings';
import { prisma } from '@/lib/db/client';
import { validateAuth } from '@/lib/middleware/auth';
import { checkRateLimit } from '@/lib/middleware/rate-limit';

// ============================================================================
// Schemas
// ============================================================================

/**
 * Schema for question suggestions response
 * Must match frontend expectation: { suggestions: [{ question: string }, ...] }
 */
const QuestionsSuggestionsSchema = z.object({
  suggestions: z.array(z.object({ question: z.string() })).length(3),
});

/**
 * Schema for request body
 * Note: Uses snake_case to match Python backend and frontend expectations
 */
const RequestBodySchema = z.object({
  thread_id: z.string().uuid().optional(),
  frontend_url: z.string().url().optional(),
  vlab_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
});

// ============================================================================
// Context Analyzer
// ============================================================================

/**
 * Get tool descriptions for LLM context
 *
 * Returns tool descriptions from the actual tool registry.
 * This ensures the LLM has accurate information about available tools.
 */
async function getToolDescriptions(): Promise<string[]> {
  // Initialize tools first to ensure they're registered
  const { initializeTools } = await import('@/lib/tools');
  const { getSettings } = await import('@/lib/config/settings');

  const settings = getSettings();

  // Initialize tools with configuration
  await initializeTools({
    exaApiKey: settings.tools.exaApiKey,
    sanityUrl: settings.tools.sanity.url,
    entitycoreUrl: settings.tools.entitycore.url,
    obiOneUrl: settings.tools.obiOne.url,
    mcpConfig: settings.mcp,
  });

  // Get metadata from registry
  const { toolRegistry } = await import('@/lib/tools/base-tool');
  const allMetadata = toolRegistry.getAllMetadata();

  return allMetadata.map((tool) => `${tool.name}: ${tool.description}`);
}

/**
 * Analyzes frontend URL to extract page context
 */
interface PageContext {
  rawPath: string;
  queryParams: Record<string, string[]>;
  brainRegionId: string | null;
  observedEntityType: string | null;
  currentEntityId: string | null;
}

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function analyzePageContext(frontendUrl: string): PageContext {
  const url = new URL(frontendUrl);
  const queryParams: Record<string, string[]> = {};

  // Parse query parameters
  url.searchParams.forEach((value, key) => {
    if (!queryParams[key]) {
      queryParams[key] = [];
    }
    queryParams[key].push(value);
  });

  // Get path without leading slash
  const path = url.pathname.replace(/^\//, '');

  if (!path.startsWith('app/virtual-lab/')) {
    throw new Error('Invalid URL: must start with app/virtual-lab/');
  }

  // Skip 'app/virtual-lab/{vlab_id}/{proj_id}' and get the rest
  const pathParts = path.split('/');
  const currentPage = pathParts.slice(4);

  // Valid entity types from EntityCore + frontend extensions
  const validEntityTypes = [
    'brain-region',
    'cell-morphology',
    'e-model',
    'me-model',
    'simulation-campaign',
    'small-microcircuit-simulation',
    'paired-neuron-circuit-simulation',
  ];

  let observedEntityType: string | null = null;
  let currentEntityId: string | null = null;

  // Find entity type and ID (searching backwards)
  for (let i = currentPage.length - 1; i >= 0; i--) {
    const currentPart = currentPage[i];
    if (currentPart && validEntityTypes.includes(currentPart)) {
      observedEntityType = currentPart;

      // Check if next segment is a UUID
      const nextPart = currentPage[i + 1];
      if (nextPart && isUUID(nextPart)) {
        currentEntityId = nextPart;
      }
      break;
    }
  }

  // Map frontend types to EC native types
  if (
    observedEntityType === 'small-microcircuit-simulation' ||
    observedEntityType === 'paired-neuron-circuit-simulation'
  ) {
    queryParams['circuit__scale'] = [
      observedEntityType === 'small-microcircuit-simulation' ? 'small' : 'pair',
    ];
    observedEntityType = 'simulation-campaign';
  }

  return {
    rawPath: currentPage.join('/'),
    queryParams,
    brainRegionId: queryParams['br_id']?.[0] || null,
    observedEntityType,
    currentEntityId,
  };
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const settings = getSettings();

    // Validate authentication
    const userInfo = await validateAuth(request);
    if (!userInfo) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const validatedBody = RequestBodySchema.parse(body);
    const { thread_id: threadId, frontend_url: frontendUrl, vlab_id: vlabId, project_id: projectId } = validatedBody;

    console.log('[question_suggestions] Request params:', { threadId, frontendUrl, vlabId, projectId });

    // Determine rate limit based on vlab/project context
    const limit =
      vlabId && projectId
        ? settings.rateLimiter.limitSuggestionsInside
        : settings.rateLimiter.limitSuggestionsOutside;

    // Check rate limiting
    const rateLimitResult = await checkRateLimit(
      userInfo.sub,
      'question_suggestions',
      limit,
      settings.rateLimiter.expirySuggestions
    );

    if (rateLimitResult.limited) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: rateLimitResult.headers,
        }
      );
    }

    // Get tool descriptions from actual tool registry
    const toolInfo = await getToolDescriptions();

    let systemPrompt = '';
    let userMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    let isInChat = false;

    // ========================================================================
    // Determine if we're in chat by checking for thread messages
    // ========================================================================
    if (!threadId) {
      // No thread ID means we're not in a chat context
      isInChat = false;
      console.log('[question_suggestions] No threadId provided, isInChat: false');
    } else {
      // Fetch last 4 user/AI messages
      const messages = await prisma.message.findMany({
        where: {
          threadId,
          entity: {
            in: [entity.USER, entity.AI_MESSAGE],
          },
        },
        orderBy: {
          creationDate: 'desc',
        },
        take: 4,
      });

      // Set isInChat based on whether we have messages
      isInChat = messages.length > 0;

      console.log(`[question_suggestions] threadId: ${threadId}, messages.length: ${messages.length}, isInChat: ${isInChat}`);

      // ========================================================================
      // IN CHAT - Generate suggestions based on conversation history
      // ========================================================================
      if (isInChat) {
        console.log('[question_suggestions] Using IN CHAT prompt');

        // Reverse to get chronological order
        const chronologicalMessages = messages.reverse();

        // Convert to OpenAI format
        userMessages = chronologicalMessages.map((msg) => {
          let content: any;
          try {
            content = JSON.parse(msg.content);
          } catch {
            content = msg.content;
          }

          // Extract text content from various message formats
          let textContent: string;
          if (typeof content === 'string') {
            textContent = content;
          } else if (content.content) {
            if (typeof content.content === 'string') {
              textContent = content.content;
            } else if (Array.isArray(content.content)) {
              // Handle array of content parts (e.g., [{type: 'text', text: '...'}])
              textContent = content.content
                .filter((part: any) => part.type === 'text')
                .map((part: any) => part.text)
                .join('\n');
            } else {
              textContent = JSON.stringify(content.content);
            }
          } else {
            textContent = JSON.stringify(content);
          }

          return {
            role: msg.entity === entity.USER ? ('user' as const) : ('assistant' as const),
            content: textContent,
          };
        });

        systemPrompt = `
Guidelines:

- Generate three user actions, each targeting a significantly different aspect or subtopic relevant to the main topic of the conversation. Each action should be phrased exactly as if the user is instructing the system to perform the action (e.g., "Show...", "Find...", "Analyze..."). Each action should be independent, and information contained or revealed in one action cannot be re-used, referred to, or assumed in the others. Any shared context or information must be restated in each action where necessary.

- **CRITICAL**: Actions must be in imperative mood (commands), NOT interrogative (questions). Do NOT end actions with question marks. Actions must always be phrased strictly from the user's perspective only. Do NOT generate or rephrase actions from the LLM's perspective. Avoid any formulations such as: "Would you like me to...", "Should I analyze...", "Do you want me to...", "Would it be helpful if I...", "Shall I retrieve...", "Can you...", "What is..." etc.
- Explore various distinct possibilities, e.g., visuals, metrics, literature, associated models, etc. Be creative.
- Only include actions that can be performed using the available tools described below.
- This LLM cannot call any tools; actions suggested must be based solely on the tool descriptions. Do not assume access to tools beyond what is described.
- Focus on advancing the user's workflow and showcasing what the chat can help with. Suggest logical next steps, deeper exploration, or related topics using the available tool information. Avoid producing mere variations of previous actions.
- Keep actions succinct and clear.
- When evaluating which actions make sense, refer only to the tools' purposes and minimal relevant input as described in the provided list; do not call or simulate tool execution.
- When suggesting actions, take into account any relevant entities, such as IDs, parameters, or references that have already been provided earlier in the conversation. If a tool requires such an input and it is already present and contextually appropriate, suggest actions that utilize this information directly.
- Ensure that the three actions each address substantially different elements of the main topic, leveraging the diversity of the tool set, while still remaining contextually relevant.
- The system does not allow export of data in any format (CSV, JSON, Excel, etc.). Do not suggest actions about exporting, downloading, or saving data to files.
- Do not suggest actions that have already been carried out in the conversation.
- Suggest workflows on subsets of data (max 5 elements). Do not suggest analysis or retrieval of large datasets, such as retrieving full lists of entities or resolving full hierarchies (e.g., all child brain regions). Suggested actions must only span small, manageable subsets (no more than 5 entities) to avoid triggering huge workflows. Do not suggest actions that can generate a lot of data.

Tool Description Format
- \`tool_name: tool_description\`

Output Format
- Output must be a JSON object with a "suggestions" array containing exactly three objects, each with a "question" field.
- Always return exactly three appropriate actions (never more, never less). If the conversation context or tools do not support three contextually relevant actions, produce the most logically appropriate or useful actions, ensuring the output contains three question objects.

Available Tools:
${toolInfo.join('\n')}`;
      }
    } // end if (threadId)

    // ========================================================================
    // OUT OF CHAT - Generate suggestions based on page context
    // ========================================================================
    if (!isInChat) {
      console.log('[question_suggestions] Using OUT OF CHAT prompt');
      let contextInfo = '';
      let brainRegionName: string | null = null;

      if (frontendUrl) {
        try {
          const pageContext = analyzePageContext(frontendUrl);

          // Resolve brain region name if ID is present
          if (pageContext.brainRegionId && settings.tools.entitycore.url) {
            try {
              const headers: Record<string, string> = {};
              if (vlabId) {
                headers['virtual-lab-id'] = vlabId;
              }
              if (projectId) {
                headers['project-id'] = projectId;
              }

              // Add JWT token for authentication
              const authHeader = request.headers.get('authorization');
              if (authHeader) {
                headers['Authorization'] = authHeader;
              }

              const response = await fetch(
                `${settings.tools.entitycore.url.replace(/\/$/, '')}/brain-region/${pageContext.brainRegionId}`,
                { headers }
              );

              if (response.ok) {
                const data = await response.json();
                brainRegionName = data.name;
              }
            } catch (error) {
              // Ignore errors in brain region name resolution
              console.error('Failed to resolve brain region name:', error);
            }
          }

          // Build context output
          const contextOutput = {
            ...pageContext,
            brainRegionName,
          };

          // Remove internal fields
          delete (contextOutput as any).rawPath;
          delete (contextOutput as any).queryParams;

          contextInfo = `\nCurrent page context: ${JSON.stringify(contextOutput)}`;
        } catch (error) {
          console.error('Failed to analyze page context:', error);
          contextInfo = '';
        }
      }

      userMessages = [
        {
          role: 'user',
          content: contextInfo || 'No specific page context available',
        },
      ];

      systemPrompt = `
Guidelines:
- Generate three user actions based on the user's current location, each action targeting a distinctly different aspect. Each action must be written as a natural, conversational command a user would say (e.g., "Show me...", "Find papers about...", "Analyze the...", "Compare...", "Visualize...").
- **CRITICAL**: Actions must use the imperative mood (commands), not interrogative (questions). Do not end actions with question marks. User actions must always be worded from the user's perspective only, never rephrase from the LLM or system's viewpoint. Avoid phrases such as: "Would you like me to...", "Should I analyze...", "Do you want me to...", "Can you...", "What is..." etc.
- Use conversational, natural phrasing that sounds like how real users speak. Prefer phrases like "Show me...", "Find...", "Get...", "Compare...", "Visualize..." and avoid robotic or stiff language.
- At least one action MUST be literature-related (such as searching for papers or finding publications).
- For non-literature actions, focus on the current page context provided in the user message.
- Explore a diverse set of possibilities: visuals, metrics, literature, related models, etc. Apply creativity and use the variety of tools available.
- Only include actions possible with the provided toolset. Reference only described tool capabilities and minimal required inputs, and do not simulate tool responses.
- The LLM cannot execute tools directly; base all actions on tool descriptions alone. Do not assume access to tools beyond their described capabilities.
- Focus on demonstrating what the chat can help with based on the user's current page. Explore creative options based on available tools.
- Keep actions succinct and clear.
- When selecting actions, refer only to described tool purposes and minimal required inputs. Do not simulate or mimic tool usage.
- If the current page context contains entity IDs or other parameters, explicitly state these values in the action text for clarity.
- Refer to brain regions by their names (e.g., "Somatosensory cortex", "Hippocampus"), never by their IDs.
- Ignore any page context information with value \`None\` or \`null\`; do not use such values in suggested actions.
- Ensure all three actions cover substantially different features or elements, making use of the tool set's diversity.
- Do not suggest actions involving exporting, downloading, or saving data/files (e.g., CSV, JSON, Excel).
- Suggest workflows on subsets of data (max 5 elements). Do not suggest analysis of large datasets, such as full hierarchies. Do not suggest actions that can generate a lot of data.

Tool Description Format
- \`tool_name: tool_description\`

Input format:
- Current page context with fields:
- \`observed_entity_type\`: Type of entity being viewed. \`None\` means a general page.
- \`current_entity_id\`: UUID of the specific entity being viewed. (\`brain_region_id\` is NOT an entity ID.) \`None\` means a list/overview page.
- \`brain_region_id\`: This identifies the selected brain region but is not an entity ID. \`None\` means no region filter is active.
- \`brain_region_name\`: Name of the brain region with this ID. \`None\` means that the name resolving could not be performed from the ID

Typical action patterns:
- If \`current_entity_id\` is present: Suggest actions to analyze, visualize, or get more details about that specific entity (mention the entity ID explicitly. The entity ID is NOT \`brain_region_id\`.).
- If \`current_entity_id\` is None but \`observed_entity_type\` is present: Suggest actions to search, filter, or retrieve entities of that type.
- If \`brain_region_name\` is present: Suggest actions about that brain region by name (e.g., find related entities in the region, search literature about it etc...).
- If most fields are None, or there is no user input: Suggest exploratory actions to help users discover available data or features.
- For the literature-related action, use only high-level concepts or keywords from the current page context (e.g., page topics, regions, or scientific terms), not database-specific IDs.
- The remaining two actions must focus on features or data available from the current page context.

Output format:
- Output must strictly be a JSON object with a "suggestions" array containing exactly three objects, each with a "question" field containing the action string.
- After producing the actions, briefly validate that all requirements are satisfied (distinctness, literature, page context, tool set limits) before finalizing the output.

Tool description:
${toolInfo.join('\n')}`;
    }

    // ========================================================================
    // Generate suggestions using Vercel AI SDK
    // ========================================================================
    const messages = [{ role: 'system' as const, content: systemPrompt }, ...userMessages];

    // Create OpenAI client with API key from settings
    const openai = createOpenAI({
      apiKey: settings.llm.openaiToken,
    });

    // Prepare generation parameters
    const generateParams: any = {
      model: openai(settings.llm.suggestionModel),
      schema: QuestionsSuggestionsSchema,
      messages,
    };
    console.log(systemPrompt)

    // Add reasoning effort for gpt-5 models
    if (settings.llm.suggestionModel.includes('gpt-5')) {
      generateParams.experimental_telemetry = {
        isEnabled: true,
        functionId: 'question-suggestions',
      };
      // Note: reasoning_effort is not yet supported in Vercel AI SDK
      // Will be added when available
    }

    const result = await generateObject(generateParams);

    // Return suggestions with rate limit headers
    return NextResponse.json(result.object, {
      headers: rateLimitResult.headers,
    });
  } catch (error) {
    console.error('Question suggestions error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('Invalid URL')) {
      return NextResponse.json(
        {
          error: 'Invalid URL',
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to generate question suggestions',
      },
      { status: 500 }
    );
  }
}
