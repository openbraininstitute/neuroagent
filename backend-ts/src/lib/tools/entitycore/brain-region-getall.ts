/**
 * EntityCore Brain Region GetAll Tool
 * 
 * Searches and retrieves brain regions from the EntityCore knowledge graph.
 */

import { z } from 'zod';
import { ToolMetadata } from '../base-tool';
import {
  EntityCoreTool,
  EntityCoreExcludeNameParamsSchema,
  EntityCorePaginationSchema,
  EntityCoreListResponseSchema,
} from './base';

/**
 * Brain region hierarchy IDs
 */
const HIERARCHY_IDS = {
  AIBS: 'e3e70682-c209-4cac-a29f-6fbed82c07cd',
  JULICH: 'e3fdfcc0-6807-4be1-aefc-b3f9116f6ced',
} as const;

/**
 * Brain region read schema
 */
const BrainRegionReadSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  acronym: z.string().optional(),
  annotation_value: z.number().optional(),
  color_hex_triplet: z.string().optional(),
  hierarchy_id: z.string().uuid(),
  parent_id: z.string().uuid().optional(),
  // Additional fields can be added as needed
});

/**
 * Input schema for Brain Region GetAll tool
 */
export const BrainRegionGetAllInputSchema = EntityCorePaginationSchema.merge(
  EntityCoreExcludeNameParamsSchema
).extend({
  semantic_search: z
    .string()
    .optional()
    .describe(
      'Perform semantic search to find brain regions by their names. Enter any text related to a brain region name (e.g., "hippocampus", "frontal cortex", "amygdala") and receive results ranked by semantic similarity to your query.'
    ),
  hierarchy_id: z
    .enum([HIERARCHY_IDS.AIBS, HIERARCHY_IDS.JULICH])
    .default(HIERARCHY_IDS.AIBS)
    .describe(
      'The hierarchy ID for brain regions. The default value is the most commonly used hierarchy ID called "aibs". The second one is: "Julich-Brain Probabilistic Cytoarchitectonic Atlas".'
    ),
  acronym: z.string().optional().describe('Filter by brain region acronym'),
  annotation_value: z
    .number()
    .optional()
    .describe('Filter by annotation value'),
});

/**
 * Output schema for Brain Region GetAll tool
 */
export const BrainRegionGetAllOutputSchema = EntityCoreListResponseSchema(
  BrainRegionReadSchema
);

export type BrainRegionGetAllInput = z.infer<typeof BrainRegionGetAllInputSchema>;
export type BrainRegionGetAllOutput = z.infer<typeof BrainRegionGetAllOutputSchema>;

/**
 * Brain Region GetAll Tool implementation
 * 
 * Searches a neuroscience-based knowledge graph to retrieve brain regions.
 * Returns a list of brain regions with their IDs, names, acronyms, and hierarchy information.
 */
export class BrainRegionGetAllTool extends EntityCoreTool<
  typeof BrainRegionGetAllInputSchema
> {
  metadata: ToolMetadata = {
    name: 'entitycore-brainregion-getall',
    nameFrontend: 'Get All Brain Regions',
    description:
      'Searches a neuroscience based knowledge graph to retrieve brain regions. ' +
      'The output is a list of brain regions, containing: ' +
      '- The brain region ID ' +
      '- The brain region name ' +
      '- The brain region acronym ' +
      '- The brain region annotation value ' +
      '- The brain region color hex triplet ' +
      '- The brain region hierarchy information\n\n' +
      'Note: The `semantic_search` parameter will always return results even for irrelevant queries - critically evaluate whether returned brain regions are actually related to your search terms.',
    descriptionFrontend:
      'Search and retrieve brain regions. Use this tool to: ' +
      '• Find brain regions by name or acronym ' +
      '• Access detailed brain region data ' +
      '• Filter brain regions by various criteria\n\n' +
      'Specify optional criteria to find relevant brain regions.',
    utterances: [
      'Find a morphology in the isocortex and give me its features.',
      'Find brain regions.',
      'Show me available brain regions.',
      'What brain regions are there?',
      'Find an electrical recording in the thalamus and make an in depth analysis of it.',
      'Are there circuits in the sscx ?',
      'Find all of the thalamical neurons.',
    ],
    hil: false,
  };

  inputSchema = BrainRegionGetAllInputSchema;

  /**
   * Execute brain region search
   * 
   * @param input - Validated search parameters
   * @returns List of brain regions matching the criteria
   */
  override async execute(input: BrainRegionGetAllInput): Promise<BrainRegionGetAllOutput> {
    // Build query parameters, excluding defaults
    const queryParams: Record<string, unknown> = {
      page_size: input.page_size,
      hierarchy_id: input.hierarchy_id,
    };

    if (input.page !== 1) {
      queryParams['page'] = input.page;
    }

    if (input.semantic_search) {
      queryParams['semantic_search'] = input.semantic_search;
    }

    if (input.acronym) {
      queryParams['acronym'] = input.acronym;
    }

    if (input.annotation_value !== undefined) {
      queryParams['annotation_value'] = input.annotation_value;
    }

    const response = await this.get<BrainRegionGetAllOutput>(
      '/brain-region',
      queryParams
    );

    return BrainRegionGetAllOutputSchema.parse(response);
  }
}
