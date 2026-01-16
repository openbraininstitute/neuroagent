/**
 * Web Search Tool
 * 
 * Performs real-time web searches using Exa AI API.
 * Supports configurable result counts and date filtering.
 */

import { z } from 'zod';
import { BaseTool, ToolMetadata } from './base-tool';

/**
 * Input schema for Web Search tool
 */
export const WebSearchInputSchema = z.object({
  query: z.string().describe('Search query for web search'),
  num_results: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe('Number of results to return'),
  start_publish_date: z
    .string()
    .datetime()
    .optional()
    .describe('Filter results published after this date (ISO 8601 format)'),
  end_publish_date: z
    .string()
    .datetime()
    .optional()
    .describe('Filter results published before this date (ISO 8601 format)'),
});

/**
 * Search result schema
 */
const SearchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  publishedDate: z.string().datetime().nullable().optional(),
  author: z.string().nullable().optional(),
  id: z.string(),
  image: z.string().nullable().optional(),
  text: z.string(),
});

/**
 * Output schema for Web Search tool
 */
export const WebSearchOutputSchema = z.object({
  results: z.array(SearchResultSchema),
});

export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;
export type WebSearchOutput = z.infer<typeof WebSearchOutputSchema>;

/**
 * Web Search Tool implementation
 * 
 * Performs real-time web searches and can scrape content from specific URLs.
 * Supports configurable result counts and returns content from the most relevant websites.
 */
export class WebSearchTool extends BaseTool<typeof WebSearchInputSchema> {
  metadata: ToolMetadata = {
    name: 'web-search-tool',
    nameFrontend: 'Web Search',
    description:
      'Search the web. Performs real-time web searches and can scrape content from specific URLs. ' +
      'Supports configurable result counts and returns the content from the most relevant websites.',
    descriptionFrontend:
      'Search the web. Performs real-time web searches and can scrape content from specific URLs. ' +
      'Supports configurable result counts and returns the content from the most relevant websites.',
    utterances: [
      'Find information online',
      'Look up this topic on the internet',
      'Search the web for this',
    ],
    hil: false,
  };

  inputSchema = WebSearchInputSchema;

  constructor(private exaApiKey: string) {
    super();
  }

  /**
   * Execute web search
   * 
   * @param input - Validated search parameters
   * @returns Search results with titles, URLs, and content excerpts
   */
  async execute(input: WebSearchInput): Promise<WebSearchOutput> {
    const payload: Record<string, unknown> = {
      query: input.query,
      type: 'auto',
      numResults: input.num_results,
      contents: {
        text: {
          maxCharacters: 3000, // Length of excerpts
        },
        livecrawl: 'preferred',
        extras: { imageLinks: 1 },
      },
    };

    if (input.start_publish_date) {
      payload['startPublishedDate'] = input.start_publish_date;
    }
    if (input.end_publish_date) {
      payload['endPublishedDate'] = input.end_publish_date;
    }

    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'x-api-key': this.exaApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(300000), // 5 minute timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `The Exa search endpoint returned a non 200 response code. Error: ${errorText}`
      );
    }

    const data = await response.json();
    
    return WebSearchOutputSchema.parse({
      results: data.results,
    });
  }

  /**
   * Check if the Exa API is accessible
   * 
   * @returns Always returns true (no known way to check API health)
   */
  override async isOnline(): Promise<boolean> {
    // No known way of checking if the API is live
    return true;
  }
}
