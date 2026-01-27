/**
 * Example Tool Implementation
 * 
 * This is a reference implementation showing how to create a tool
 * by extending the BaseTool class.
 */

import { z } from 'zod';
import { BaseTool, ToolMetadata } from './base-tool';

/**
 * Input schema for the example tool
 */
const ExampleToolInputSchema = z.object({
  query: z.string().describe('The search query or input text'),
  maxResults: z
    .number()
    .int()
    .positive()
    .default(10)
    .describe('Maximum number of results to return'),
  includeMetadata: z
    .boolean()
    .default(false)
    .describe('Whether to include metadata in results'),
});

/**
 * Example tool demonstrating the BaseTool pattern
 * 
 * This tool serves as a template for implementing new tools.
 * Replace the logic in the execute method with your actual tool implementation.
 */
export class ExampleTool extends BaseTool<typeof ExampleToolInputSchema> {
  /**
   * Tool metadata
   */
  metadata: ToolMetadata = {
    name: 'example_tool',
    nameFrontend: 'Example Tool',
    description:
      'An example tool that demonstrates the BaseTool implementation pattern',
    descriptionFrontend:
      'Use this tool to see how tools are structured in the system',
    utterances: ['example', 'demo', 'test', 'show me how'],
    hil: false, // Set to true if this tool requires human validation
  };

  /**
   * Input validation schema
   */
  inputSchema = ExampleToolInputSchema;

  /**
   * Execute the tool
   * 
   * @param input - Validated input matching ExampleToolInputSchema
   * @returns Tool execution result
   */
  async execute(
    input: z.infer<typeof ExampleToolInputSchema>
  ): Promise<unknown> {
    const { query, maxResults, includeMetadata } = input;

    // Simulate some processing
    const results = Array.from({ length: Math.min(maxResults, 5) }, (_, i) => ({
      id: i + 1,
      title: `Result ${i + 1} for "${query}"`,
      content: `This is example content for result ${i + 1}`,
      ...(includeMetadata && {
        metadata: {
          timestamp: new Date().toISOString(),
          relevance: Math.random(),
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
   */
  override async isOnline(): Promise<boolean> {
    // In a real tool, you might check:
    // - API endpoint availability
    // - Database connectivity
    // - External service status
    return true;
  }
}
