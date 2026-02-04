/**
 * Example Tool Implementation
 *
 * Translated from backend/src/neuroagent/tools/base_tool.py
 *
 * This is a reference implementation showing how to create a tool
 * by extending the BaseTool class. It demonstrates the proper separation
 * between static tool metadata and instance context variables.
 */

import { z } from 'zod';

import { BaseTool, type BaseContextVariables } from './base-tool';

/**
 * Context variables for the example tool
 *
 * These are runtime dependencies passed from the app to the tool.
 * They contain things like HTTP clients, API URLs, configuration, etc.
 *
 * In Python, this would be a subclass of BaseMetadata.
 */
interface ExampleToolContextVariables extends BaseContextVariables {
  /** Example API base URL */
  apiUrl: string;

  /** Example API key for authentication */
  apiKey?: string;

  /** HTTP client for making requests */
  httpClient?: any; // TODO: Type this properly
}

/**
 * Input schema for the example tool
 *
 * This defines the parameters that the LLM can provide to the tool.
 * Note: maxResults is optional with a default value, demonstrating
 * how optional parameters work with structuredOutputs: false.
 */
const ExampleToolInputSchema = z.object({
  query: z.string().describe('The search query or input text'),
  maxResults: z
    .number()
    .int()
    .positive()
    .default(10)
    .describe('Maximum number of results to return (default: 10)'),
  includeMetadata: z
    .boolean()
    .optional()
    .describe('Whether to include metadata in results (optional)'),
});

/**
 * Example tool demonstrating the BaseTool pattern
 *
 * This tool serves as a template for implementing new tools.
 * Replace the logic in the execute method with your actual tool implementation.
 *
 * Key concepts:
 * - Static properties (name, description, etc.) = Tool metadata for LLM
 * - contextVariables = Runtime dependencies from app (not from LLM)
 * - inputSchema = Parameters the LLM provides
 * - execute() = Tool logic using both contextVariables and input
 */
export class ExampleTool extends BaseTool<
  typeof ExampleToolInputSchema,
  ExampleToolContextVariables
> {
  // Static properties (tool metadata) - equivalent to Python ClassVar
  static readonly toolName = 'example_tool';
  static readonly toolNameFrontend = 'Example Tool';
  static readonly toolDescription =
    'An example tool that demonstrates the BaseTool implementation pattern';
  static readonly toolDescriptionFrontend =
    'Use this tool to see how tools are structured in the system';
  static readonly toolUtterances = ['example', 'demo', 'test', 'show me how'];
  static readonly toolHil = false; // Set to true if this tool requires human validation

  /**
   * Context variables (runtime dependencies)
   *
   * These are passed from the app to the tool, not from the LLM.
   * In Python, this is the `metadata` field.
   */
  override contextVariables: ExampleToolContextVariables;

  /**
   * Input validation schema
   *
   * Defines the parameters that the LLM can provide to the tool.
   */
  override inputSchema = ExampleToolInputSchema;

  /**
   * Constructor
   *
   * @param contextVariables - Runtime dependencies passed from app
   */
  constructor(contextVariables: ExampleToolContextVariables) {
    super();
    this.contextVariables = contextVariables;
  }

  /**
   * Execute the tool
   *
   * This method has access to:
   * - input: Parameters provided by the LLM
   * - this.contextVariables: Runtime dependencies from the app
   *
   * @param input - Validated input matching ExampleToolInputSchema
   * @returns Tool execution result
   */
  async execute(input: z.infer<typeof ExampleToolInputSchema>): Promise<unknown> {
    const { query, maxResults, includeMetadata } = input;

    // Access context variables (runtime dependencies)
    const { apiUrl, apiKey } = this.contextVariables;

    // Simulate some processing
    const results = Array.from({ length: Math.min(maxResults, 5) }, (_, i) => ({
      id: i + 1,
      title: `Result ${i + 1} for "${query}"`,
      content: `This is example content for result ${i + 1}`,
      source: apiUrl, // Using context variable
      ...(includeMetadata && {
        metadata: {
          timestamp: new Date().toISOString(),
          relevance: Math.random(),
          authenticated: !!apiKey, // Using context variable
        },
      }),
    }));

    return {
      query,
      resultCount: results.length,
      results,
    };
  }

  /**
   * Health check implementation
   *
   * Override this method to check if external services are available.
   * For this example, we always return true.
   *
   * Note: In Python, this is a classmethod that receives context variables
   * as parameters. In TypeScript, we use instance method with access to
   * this.contextVariables.
   */
  override async isOnline(): Promise<boolean> {
    // In a real tool, you might check:
    // - API endpoint availability using this.contextVariables.httpClient
    // - Database connectivity
    // - External service status
    return true;
  }
}
