/**
 * Web Search tool for searching the web.
 * Translated from backend/src/neuroagent/tools/web_search.py
 */

import { z } from 'zod';
import { BaseTool } from '../base-tool';
import type { KyInstance } from 'ky';

// Input schema for Web Search tool
const WebSearchInputSchema = z.object({
  query: z.string().describe('Search query for web search'),
  num_results: z
    .number()
    .int()
    .gte(1)
    .lte(10)
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

// Search results schema
const SearchResultsSchema = z.object({
  title: z.string(),
  url: z.string(),
  publishedDate: z.string().datetime().nullable().optional(),
  author: z.string().nullable().optional(),
  id: z.string(),
  image: z.string().nullable().optional(),
  text: z.string(),
});

// Output schema for Web Search tool
const WebSearchOutputSchema = z.object({
  results: z.array(SearchResultsSchema),
});

// Context variables interface
export interface WebSearchContextVariables {
  /** HTTP client (ky instance) pre-configured with JWT token */
  httpClient: KyInstance;

  /** Exa API key for web search */
  exaApiKey: string;
}

/**
 * Tool that performs real-time web searches.
 */
export class WebSearchTool extends BaseTool<
  typeof WebSearchInputSchema,
  WebSearchContextVariables
> {
  static toolName = 'web-search-tool';
  static toolNameFrontend = 'Web Search';
  static utterances = [
    'Find information online',
    'Look up this topic on the internet',
    'Search the web for this',
  ];
  static toolDescription =
    'Search the web. Performs real-time web searches and can scrape content from specific URLs. ' +
    'Supports configurable result counts and returns the content from the most relevant websites.';
  static toolDescriptionFrontend =
    'Search the web. Performs real-time web searches and can scrape content from specific URLs. ' +
    'Supports configurable result counts and returns the content from the most relevant websites.';

  contextVariables: WebSearchContextVariables;

  constructor(contextVariables: WebSearchContextVariables) {
    super();
    this.contextVariables = contextVariables;
  }

  get inputSchema() {
    return WebSearchInputSchema;
  }

  /**
   * Perform web search.
   *
   * @returns WebSearchOutput containing search results
   */
  async execute(
    input: z.infer<typeof WebSearchInputSchema>
  ): Promise<z.infer<typeof WebSearchOutputSchema>> {
    const { exaApiKey } = this.contextVariables;

    // Build payload
    const payload: Record<string, unknown> = {
      query: input.query,
      type: 'auto',
      numResults: input.num_results,
      contents: {
        text: {
          maxCharacters: 3000, // Len of excerpts. Not specified = full page
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

    // Make request to Exa API
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'x-api-key': exaApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(300000), // 5 minutes timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `The Exa search endpoint returned a non 200 response code. Error: ${errorText}`
      );
    }

    const data = await response.json();

    // Validate and return results
    return WebSearchOutputSchema.parse({
      results: data.results,
    });
  }

  /**
   * Check if the tool is online.
   * No known way of checking if the API is live.
   */
  static async isOnline(
    _contextVariables: WebSearchContextVariables
  ): Promise<boolean> {
    return true;
  }
}
