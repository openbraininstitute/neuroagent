/**
 * Literature Search tool for searching academic papers.
 * Translated from backend/src/neuroagent/tools/literature_search.py
 */

import { z } from 'zod';
import { BaseTool } from '../base-tool';
import type { KyInstance } from 'ky';

// Input schema for Literature Search tool
const LiteratureSearchInputSchema = z.object({
  query: z.string().describe('Search query for academic papers'),
  start_publish_date: z
    .string()
    .datetime()
    .optional()
    .describe('Filter papers published after this date (ISO 8601 format)'),
  end_publish_date: z
    .string()
    .datetime()
    .optional()
    .describe('Filter papers published before this date (ISO 8601 format)'),
  num_results: z
    .number()
    .int()
    .gte(1)
    .lte(10)
    .default(5)
    .describe('Number of results to return'),
});

// Article results schema
const ArticleResultsSchema = z.object({
  title: z.string(),
  url: z.string(),
  publishedDate: z.string().datetime().nullable().optional(),
  author: z.string().nullable().optional(),
  id: z.string(),
  image: z.string().nullable().optional(),
  text: z.string(),
});

// Output schema for Literature Search tool
const LiteratureSearchOutputSchema = z.object({
  results: z.array(ArticleResultsSchema),
});

// Context variables interface
export interface LiteratureSearchContextVariables {
  /** HTTP client (ky instance) pre-configured with JWT token */
  httpClient: KyInstance;

  /** Exa API key for literature search */
  exaApiKey: string;
}

/**
 * Tool that searches across 100M+ research papers using Exa AI.
 */
export class LiteratureSearchTool extends BaseTool<
  typeof LiteratureSearchInputSchema,
  LiteratureSearchContextVariables
> {
  static toolName = 'literature-search-tool';
  static toolNameFrontend = 'Literature Search';
  static utterances = [
    'Find literature on this topic',
    'Look up academic papers',
    'Search for research papers',
    'Find papers about',
    'Search scientific literature',
    'Look for studies on',
    'Find research about',
    'Search for publications',
    'What papers exist on',
    'Find academic articles',
    'Search for scholarly articles',
    'Look up scientific papers',
    'Find recent papers on',
    'Search neuroscience literature',
    'What research has been done on',
  ];
  static toolDescription =
    'Search across 100M+ research papers with full text access using Exa AI - performs targeted academic paper searches with deep research content coverage. ' +
    'Returns detailed information about relevant academic papers including titles, authors, publication dates, and full text excerpts. ' +
    'You can control the number of results as well as the start/end publication date.' +
    'This tool returns only partial content of pages. In your reply, mention that you can attempt to read the full articles using the `read-paper-tool` if the paper is publicly available.' +
    '*CRITICAL* : Each returned article has an `image` field. When it is not None, you MUST systematically embed the url in the chat in markdown (e.g. ()[https://url.of.image.png]).';
  static toolDescriptionFrontend =
    'Search across 100M+ research papers with full text access. Performs targeted academic paper searches with deep research content coverage. ' +
    'Returns detailed information about relevant academic papers including titles, authors, publication dates, and full text excerpts. ' +
    'Control the number of results and character counts returned to balance comprehensiveness with conciseness based on your task requirements.';

  contextVariables: LiteratureSearchContextVariables;

  constructor(contextVariables: LiteratureSearchContextVariables) {
    super();
    this.contextVariables = contextVariables;
  }

  get inputSchema() {
    return LiteratureSearchInputSchema;
  }

  /**
   * Search for academic papers.
   *
   * @returns LiteratureSearchOutput containing search results
   */
  async execute(
    input: z.infer<typeof LiteratureSearchInputSchema>
  ): Promise<z.infer<typeof LiteratureSearchOutputSchema>> {
    const { exaApiKey } = this.contextVariables;

    // Build payload
    const payload: Record<string, unknown> = {
      query: `${input.query} academic paper research study`,
      type: 'neural',
      category: 'research paper',
      numResults: input.num_results,
      includeDomains: [
        'arxiv.org',
        'scholar.google.com',
        'researchgate.net',
        'pubmed.ncbi.nlm.nih.gov',
        'ieee.org',
        'acm.org',
        'nature.com',
        'cell.com',
        'elsevier.com',
        'elifesciences.org',
        'frontiersin.org',
      ],
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
    return LiteratureSearchOutputSchema.parse({
      results: data.results,
    });
  }

  /**
   * Check if the tool is online.
   * No known way of checking if the API is live.
   */
  static async isOnline(
    _contextVariables: LiteratureSearchContextVariables
  ): Promise<boolean> {
    return true;
  }
}
