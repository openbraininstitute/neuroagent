/**
 * OBI Expert Tool - Retrieves documents from the OBI Sanity API
 *
 * This tool provides access to various document types from the OBI platform including:
 * - News articles and announcements
 * - Glossary terms and definitions
 * - Future features and roadmap
 * - Tutorials and educational content
 * - Public research projects
 * - Product documentation
 * - Static pages (About, Privacy, etc.)
 * - Pricing plans (planV2)
 *
 * Translated from: backend/src/neuroagent/tools/obi_expert.py
 */

import { z } from 'zod';
import { BaseTool, type BaseContextVariables } from '../base-tool';

/**
 * Context variables required for OBI Expert tool
 */
export interface OBIExpertContextVariables extends BaseContextVariables {
  sanityUrl: string;
}

/**
 * Input schema for OBI Expert tool
 */
export const OBIExpertInputSchema = z.object({
  document_type: z
    .enum([
      'documentationProduct',
      'futureFeaturesItem',
      'glossaryItem',
      'news',
      'pages',
      'planV2',
      'publicProjects',
      'tutorial',
    ])
    .describe('Type of documents to retrieve'),
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe('Page number to retrieve (1-based index)'),
  page_size: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe('Number of documents to retrieve per page'),
  sort: z
    .enum(['newest', 'oldest'])
    .default('newest')
    .describe('Sort order of the documents'),
  query: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional()
    .describe(
      'Optional single word to match in title or content. Use whenever you want to narrow down the results.'
    ),
});

export type OBIExpertInput = z.infer<typeof OBIExpertInputSchema>;

/**
 * Output schema for OBI Expert tool
 */
export const OBIExpertOutputSchema = z.object({
  results: z.array(z.record(z.any())),
  total_items: z.number().int(),
});

export type OBIExpertOutput = z.infer<typeof OBIExpertOutputSchema>;

/**
 * Sanity field mappings for each document type
 */
const SANITY_MAPPINGS: Record<string, Record<string, string>> = {
  documentationProduct: {
    id: '_id',
    created_at: '_createdAt',
    updated_at: '_updatedAt',
    title: 'title',
    slug: 'slug',
    product: 'product',
    file_path: 'filePath',
    content: 'content',
    content_hash: 'contentHash',
    upload_date: 'uploadDate',
  },
  futureFeaturesItem: {
    id: '_id',
    created_at: '_createdAt',
    updated_at: '_updatedAt',
    topic: 'Topic',
    feature_title: 'Feature_title',
    description: 'Description',
    scale: 'Scale',
  },
  glossaryItem: {
    id: '_id',
    created_at: '_createdAt',
    updated_at: '_updatedAt',
    name: 'Name',
    description: 'Description',
    definition: 'definition',
  },
  news: {
    id: '_id',
    created_at: '_createdAt',
    updated_at: '_updatedAt',
    title: 'title',
    category: 'category',
    content: 'content',
  },
  pages: {
    id: '_id',
    created_at: '_createdAt',
    updated_at: '_updatedAt',
    title: 'title',
    introduction: 'introduction',
    content: 'content',
  },
  planV2: {
    id: '_id',
    created_at: '_createdAt',
    updated_at: '_updatedAt',
    name: 'name',
    has_subtitle: 'has_subtitle',
    subtitle: 'subtitle',
    custom_plan: 'custom_plan',
    has_contact_button: 'has_contact_button',
    has_subscription: 'has_subscription',
    monthly_subscriptions: 'monthly_subscriptions',
    yearly_subscriptions: 'yearly_subscriptions',
    advantages: 'advantages',
    general_features: 'general_features',
    ai_assistant_features: 'ai_assistant_features',
    build_features: 'build_features',
    simulate_features: 'simulate_features',
    notebooks_features: 'notebooks_features',
    support: 'support',
  },
  publicProjects: {
    id: '_id',
    created_at: '_createdAt',
    updated_at: '_updatedAt',
    name: 'name',
    introduction: 'introduction',
    description: 'description',
    videos_list: 'videosList',
    authors_list: 'authorsList',
  },
  tutorial: {
    id: '_id',
    created_at: '_createdAt',
    updated_at: '_updatedAt',
    title: 'title',
    description: 'description',
    transcript: 'transcript',
    video_url: 'videoUrl',
  },
};

/**
 * Flatten portable text blocks into a single string
 */
function flattenPortableText(blocks: any): any {
  if (blocks === null || blocks === undefined) {
    return blocks;
  }

  if (!Array.isArray(blocks) && typeof blocks !== 'object') {
    return blocks;
  }

  // Handle array
  if (Array.isArray(blocks)) {
    // Check if first element is a block type
    if (
      blocks.length > 0 &&
      typeof blocks[0] === 'object' &&
      blocks[0]?._type === 'block'
    ) {
      // All elements are blocks, join them together
      const textParts: string[] = [];
      for (const block of blocks) {
        if (block.children) {
          for (const child of block.children) {
            if (typeof child === 'object' && child.text) {
              textParts.push(child.text);
            }
          }
        }
      }
      return textParts.join('');
    } else {
      // Regular list - iterate and call recursively
      return blocks.map((item) => flattenPortableText(item));
    }
  }

  // Handle object - iterate through all values and call recursively
  if (typeof blocks === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(blocks)) {
      result[key] = flattenPortableText(value);
    }
    return result;
  }

  return blocks;
}

/**
 * Build GROQ query for retrieving documents
 */
function buildQuery(
  documentType: string,
  page: number,
  pageSize: number,
  sort: 'newest' | 'oldest',
  query?: string
): string {
  const mapping = SANITY_MAPPINGS[documentType];
  if (!mapping) {
    throw new Error(`Unsupported document type: ${documentType}`);
  }

  // Base query with type filter
  let groqQuery = `*[_type == "${documentType}"`;

  // Add text matching if query is provided
  if (query) {
    const searchableFields = Object.values(mapping).filter(
      (field) => !['_id', '_createdAt', '_updatedAt'].includes(field)
    );
    const matchConditions = searchableFields.map(
      (field) => `${field} match "*${query}*"`
    );
    groqQuery += ` && (${matchConditions.join(' || ')})`;
  }

  groqQuery += ']';

  // Add sorting
  const sortField = '_createdAt';
  const sortOrder = sort === 'newest' ? 'desc' : 'asc';
  groqQuery += ` | order(${sortField} ${sortOrder})`;

  // Add pagination
  const start = (page - 1) * pageSize;
  groqQuery += `[${start}...${start + pageSize}]`;

  // Add field projection
  const fieldSelection = Object.entries(mapping)
    .map(([key, value]) => `"${key}": ${value}`)
    .concat(['"_type": _type'])
    .join(', ');
  groqQuery += ` { ${fieldSelection} }`;

  return groqQuery;
}

/**
 * Build GROQ count query
 */
function buildCountQuery(documentType: string, query?: string): string {
  const mapping = SANITY_MAPPINGS[documentType];
  if (!mapping) {
    throw new Error(`Unsupported document type: ${documentType}`);
  }

  let groqQuery = `*[_type == "${documentType}"`;

  if (query) {
    const searchableFields = Object.values(mapping).filter(
      (field) => !['_id', '_createdAt', '_updatedAt'].includes(field)
    );
    const matchConditions = searchableFields.map(
      (field) => `${field} match "*${query}*"`
    );
    groqQuery += ` && (${matchConditions.join(' || ')})`;
  }

  groqQuery += ']';

  return `count(${groqQuery})`;
}

/**
 * Process document by flattening portable text fields
 */
function processDocument(doc: Record<string, any>): Record<string, any> {
  const processed = { ...doc };

  // Fields that typically contain portable text
  const portableTextFields = [
    'content',
    'definition',
    'transcript',
    'description',
  ];

  for (const field of portableTextFields) {
    if (processed[field]) {
      const flattened = flattenPortableText(processed[field]);
      if (typeof flattened === 'string') {
        processed[field] = flattened;
      } else if (Array.isArray(flattened)) {
        // Extract text from remaining array structure
        const textParts: string[] = [];
        for (const item of flattened) {
          if (typeof item === 'string') {
            textParts.push(item);
          } else if (typeof item === 'object' && item !== null) {
            if (item.title) textParts.push(item.title);
            if (item.text) textParts.push(item.text);
            if (item.content && typeof item.content === 'string') {
              textParts.push(item.content);
            }
          }
        }
        processed[field] = textParts.join(' ');
      }
    }
  }

  // Handle slug normalization
  if (processed.slug && typeof processed.slug === 'object') {
    processed.slug = processed.slug.current || String(processed.slug);
  }

  return processed;
}

/**
 * OBI Expert Tool
 *
 * Searches and retrieves documents from the OBI Sanity API with support for:
 * - Multiple document types
 * - Pagination
 * - Sorting
 * - Text search across fields
 */
export class OBIExpertTool extends BaseTool<
  typeof OBIExpertInputSchema,
  OBIExpertContextVariables
> {
  static override toolName = 'obi-expert';
  static override toolNameFrontend = 'OBI Expert';

  static override utterances = [
    'Any updates about features?',
    'Define synaptic plasticity',
    'How can I simulate on the platform?',
    'How do I build a model?',
    'How do I contact support?',
    'How do I simulate?',
    'How much does it cost?',
    'Show me example projects',
    'Show me planned improvements',
    'Show me recent announcements',
    'Show me tutorials for beginners',
    'What can I do with this platform?',
    'What does ME model mean?',
    'What features are coming soon?',
    'What is a brain region?',
    'What is this platform about?',
    'What research projects are available?',
    "What's new in the platform?",
    'When will brain region simulation be available?',
    'Where can I learn about the platform?',
    // Pricing-related utterances
    'What are your pricing plans?',
    'How much does a subscription cost?',
    "What's the difference between Free and Pro?",
    'What features are included in each plan?',
    'Do you have monthly or yearly pricing?',
    "What's included in the Pro plan?",
    'Is there a free tier?',
    'Compare your subscription options',
    'What AI assistant features come with each plan?',
    'How much does simulation cost per plan?',
    'What support options do I get with Pro?',
    'Tell me about your pricing tiers',
    'What are the plan advantages?',
  ];

  static override toolDescription = `Search and retrieve documents from the OBI Sanity API.

IMPORTANT:
- Use the 'query' parameter when you can identify a clear keyword to search for (e.g., "neuron", "simulation", "tutorial"). The search is case-insensitive.
- Results are paginated. If you don't find what you're looking for on the first page, try:
  * Dropping the query parameter to see all results, or
  * Increasing the page number to see more results
  * Adjusting the query keyword if it's too specific

Use this tool to:

1. Find News Articles (document_type: "news")
   - Access platform news and announcements
   - Browse articles by category
   - Get latest updates and content

2. Search Glossary Terms (document_type: "glossaryItem")
   - Look up technical terms and definitions
   - Find explanations of platform concepts
   - Access detailed term descriptions

3. Explore Future Features (document_type: "futureFeaturesItem")
   - Learn about upcoming platform capabilities
   - View planned improvements by topic
   - Track feature development progress

4. Access Tutorials (document_type: "tutorial")
   - Find educational content and guides
   - Get video-based learning materials
   - Access tutorial transcripts when available

5. Browse Public Projects (document_type: "publicProjects")
   - View showcase research projects
   - Access project documentation and videos
   - See project contributors and authors

6. Product Documentation (document_type: "documentationProduct")
   - Access product-specific docs (Explore, Single Cell Simulation, Circuit Simulation, etc.)
   - Find guides by product (e.g. launch-notebook, virtual-labs, neuron-skeletonization)

7. Read Static Pages (document_type: "pages")
   - Access platform information (About, Mission, Team)
   - View legal documents (Privacy Policy, Terms)
   - Find product information (Pricing, Resources)
   - Get support information (Contact)

8. Pricing Plans (document_type: "planV2")
   - Get detailed information about subscription plans and pricing tiers
   - Compare Free vs Pro plan features and costs
   - View monthly and yearly subscription pricing
   - Access plan advantages and highlights
   - See feature breakdowns by category`;

  inputSchema = OBIExpertInputSchema;
  contextVariables: OBIExpertContextVariables;

  constructor(contextVariables: OBIExpertContextVariables) {
    super();
    this.contextVariables = contextVariables;
  }

  /**
   * Execute the OBI Expert tool
   */
  async execute(input: OBIExpertInput): Promise<OBIExpertOutput> {
    // Build queries
    const resultsQuery = buildQuery(
      input.document_type,
      input.page,
      input.page_size,
      input.sort,
      input.query
    );
    const countQuery = buildCountQuery(input.document_type, input.query);

    // Make both requests concurrently
    const [resultsResponse, countResponse] = await Promise.all([
      fetch(`${this.contextVariables.sanityUrl}?query=${encodeURIComponent(resultsQuery)}`),
      fetch(`${this.contextVariables.sanityUrl}?query=${encodeURIComponent(countQuery)}`),
    ]);

    if (!resultsResponse.ok) {
      throw new Error(
        `Sanity API returned ${resultsResponse.status}: ${await resultsResponse.text()}`
      );
    }

    if (!countResponse.ok) {
      throw new Error(
        `Sanity API count query returned ${countResponse.status}: ${await countResponse.text()}`
      );
    }

    const resultsData = await resultsResponse.json();
    const countData = await countResponse.json();

    // Process results
    const processedResults = (resultsData.result || []).map((doc: any) =>
      processDocument(doc)
    );

    return {
      results: processedResults,
      total_items: countData.result || 0,
    };
  }

  static async isOnline(
    _contextVariables: OBIExpertContextVariables
  ): Promise<boolean> {
    return true;
  }
}
