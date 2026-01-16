/**
 * EntityCore Cell Morphology GetAll Tool
 * 
 * Searches and retrieves cell morphologies from the EntityCore knowledge graph.
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
 * Cell morphology read schema
 */
const CellMorphologyReadSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  brain_region: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      acronym: z.string().optional(),
    })
    .optional(),
  mtype: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
    })
    .optional(),
  etype: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
    })
    .optional(),
  // Additional fields can be added as needed
});

/**
 * Input schema for Cell Morphology GetAll tool
 */
export const CellMorphologyGetAllInputSchema = EntityCorePaginationSchema.merge(
  EntityCoreExcludeNameParamsSchema
).extend({
  semantic_search: z
    .string()
    .optional()
    .describe(
      'Perform semantic search to find cell morphologies by their names or descriptions. Enter any text related to morphology characteristics and receive results ranked by semantic similarity.'
    ),
  within_brain_region_brain_region_id: z
    .string()
    .uuid()
    .optional()
    .describe(
      'Filter morphologies within a specific brain region and its descendants in the hierarchy. Provide the brain region ID.'
    ),
  mtype__name: z
    .string()
    .optional()
    .describe('Filter by morphological type (mtype) name'),
  etype__name: z
    .string()
    .optional()
    .describe('Filter by electrical type (etype) name'),
});

/**
 * Output schema for Cell Morphology GetAll tool
 */
export const CellMorphologyGetAllOutputSchema = EntityCoreListResponseSchema(
  CellMorphologyReadSchema
);

export type CellMorphologyGetAllInput = z.infer<
  typeof CellMorphologyGetAllInputSchema
>;
export type CellMorphologyGetAllOutput = z.infer<
  typeof CellMorphologyGetAllOutputSchema
>;

/**
 * Cell Morphology GetAll Tool implementation
 * 
 * Searches a neuroscience-based knowledge graph to retrieve cell morphologies.
 * Returns a list of morphologies with their IDs, names, brain regions, and cell types.
 */
export class CellMorphologyGetAllTool extends EntityCoreTool<
  typeof CellMorphologyGetAllInputSchema
> {
  metadata: ToolMetadata = {
    name: 'entitycore-cellmorphology-getall',
    nameFrontend: 'Get All Cell Morphologies',
    description:
      'Searches a neuroscience based knowledge graph to retrieve cell morphologies. ' +
      'The output is a list of cell morphologies, containing: ' +
      '- The morphology ID ' +
      '- The morphology name and description ' +
      '- Associated brain region information ' +
      '- Morphological type (mtype) ' +
      '- Electrical type (etype)\n\n' +
      'Use this tool to find morphologies by semantic search, brain region, or cell type. ' +
      'The within_brain_region_brain_region_id parameter filters for morphologies in a region and all its descendants.',
    descriptionFrontend:
      'Search and retrieve cell morphologies. Use this tool to: ' +
      '• Find morphologies by semantic search ' +
      '• Filter by brain region (including descendants) ' +
      '• Filter by morphological or electrical type ' +
      '• Access detailed morphology metadata',
    utterances: [
      'Find morphologies in the hippocampus',
      'Show me pyramidal cell morphologies',
      'What morphologies are available?',
      'Find morphologies with specific mtype',
      'Search for cell morphologies',
    ],
    hil: false,
  };

  inputSchema = CellMorphologyGetAllInputSchema;

  /**
   * Execute cell morphology search
   * 
   * @param input - Validated search parameters
   * @returns List of cell morphologies matching the criteria
   */
  override async execute(
    input: CellMorphologyGetAllInput
  ): Promise<CellMorphologyGetAllOutput> {
    // Build query parameters
    const queryParams: Record<string, unknown> = {
      page_size: input.page_size,
    };

    if (input.page !== 1) {
      queryParams['page'] = input.page;
    }

    if (input.semantic_search) {
      queryParams['semantic_search'] = input.semantic_search;
    }

    if (input.mtype__name) {
      queryParams['mtype__name'] = input.mtype__name;
    }

    if (input.etype__name) {
      queryParams['etype__name'] = input.etype__name;
    }

    // Handle brain region filtering with hierarchy
    if (input.within_brain_region_brain_region_id) {
      // Resolve brain region ID to hierarchy ID
      const hierarchyId = await this.resolveBrainRegionToHierarchyId(
        input.within_brain_region_brain_region_id
      );
      queryParams['within_brain_region_hierarchy_id'] = hierarchyId;
    }

    const response = await this.get<CellMorphologyGetAllOutput>(
      '/cell-morphology',
      queryParams
    );

    return CellMorphologyGetAllOutputSchema.parse(response);
  }
}
