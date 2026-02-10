/**
 * Read Paper tool for extracting content from URLs.
 * Translated from backend/src/neuroagent/tools/read_paper.py
 */

import { z } from 'zod';
import { BaseTool } from '../base-tool';
import type { KyInstance } from 'ky';

// Input schema for Read Paper tool
const ReadPaperInputSchema = z.object({
  urls: z
    .array(z.string().url())
    .min(1)
    .describe('URLs to extract content from.'),
});

// Content result schema
const ContentResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  publishedDate: z.string().datetime().nullable().optional(),
  author: z.string().nullable().optional(),
  id: z.string(),
  image: z.string().nullable().optional(),
  text: z.string(),
});

// Content error schema
const ContentErrorSchema = z.object({
  tag: z.string(),
  httpStatusCode: z.number().int().nullable().optional(),
});

// Content status schema
const ContentStatusSchema = z.object({
  id: z.string(),
  status: z.string(),
  error: ContentErrorSchema.nullable().optional(),
});

// Output schema for Read Paper tool
const ReadPaperOutputSchema = z.object({
  results: z.array(ContentResultSchema),
  statuses: z.array(ContentStatusSchema),
});

// Context variables interface
export interface ReadPaperContextVariables {
  /** HTTP client (ky instance) pre-configured with JWT token */
  httpClient: KyInstance;

  /** Exa API key for content extraction */
  exaApiKey: string;
}

/**
 * Tool that extracts content from specific URLs using Exa AI.
 */
export class ReadPaperTool extends BaseTool<
  typeof ReadPaperInputSchema,
  ReadPaperContextVariables
> {
  static toolName = 'read-paper';
  static toolNameFrontend = 'Read Paper';
  static utterances = [
    'Extract content from this URL',
    'Get the full text of this article',
    'Read this paper for me',
    'Tell me more about the second paper.',
  ];
  static toolDescription =
    'Extract content from specific URLs using Exa AI - performs targeted crawling of web pages to retrieve their full content. ' +
    'Useful for reading articles, PDFs, or any web page when you have the exact URL. ' +
    'Typically to be used when the user asks for more information about a paper/link, or asks for full text.' +
    'Use in combination with `literature-search-tool` and `web-search-tool` when the user asks for more info about a paper/url. ' +
    'Returns the complete text content of the specified URL.' +
    'Each returned article has an `image` field. When it is not None, feel free to embed the images in the chat throughout your response (e.g. ()[https://url.of.image.png]).';
  static toolDescriptionFrontend =
    'Extract content from specific URLs. Performs targeted crawling of web pages to retrieve their full content. ' +
    'Useful for reading articles, PDFs, or any web page when you have the exact URL. ' +
    'Returns the complete text content of the specified URL.';

  contextVariables: ReadPaperContextVariables;

  constructor(contextVariables: ReadPaperContextVariables) {
    super();
    this.contextVariables = contextVariables;
  }

  get inputSchema() {
    return ReadPaperInputSchema;
  }

  /**
   * Extract content from the specified URLs.
   *
   * @returns ReadPaperOutput containing the extracted content
   */
  async execute(
    input: z.infer<typeof ReadPaperInputSchema>
  ): Promise<z.infer<typeof ReadPaperOutputSchema>> {
    const { exaApiKey } = this.contextVariables;

    // Build payload
    const payload: Record<string, unknown> = {
      urls: input.urls,
      contents: {
        text: true, // Full text
        livecrawl: 'preferred',
        extras: { imageLinks: 3 },
      },
    };

    // Make request to Exa API
    const response = await fetch('https://api.exa.ai/contents', {
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
        `The Exa contents endpoint returned a non 200 response code. Error: ${errorText}`
      );
    }

    const data = await response.json();

    // Validate and return results
    return ReadPaperOutputSchema.parse({
      results: data.results,
      statuses: data.statuses || [],
    });
  }

  /**
   * Check if the tool is online.
   * No known way of checking if the API is live.
   */
  static async isOnline(
    _contextVariables: ReadPaperContextVariables
  ): Promise<boolean> {
    return true;
  }
}
