/**
 * OBIOne Circuit Metrics GetOne Tool
 * 
 * Computes comprehensive circuit metrics including node populations,
 * edge populations, and available filterable properties.
 */

import { z } from 'zod';
import { ToolMetadata } from '../base-tool';
import { OBIOneTool, LevelOfDetailSchema } from './base';

/**
 * Node population schema
 */
const NodePopulationSchema = z.object({
  name: z.string(),
  count: z.number().int(),
  property_names: z.array(z.string()).optional(),
  property_unique_values: z.record(z.array(z.unknown())).optional(),
  property_value_counts: z.record(z.record(z.number())).optional(),
});

/**
 * Edge population schema
 */
const EdgePopulationSchema = z.object({
  name: z.string(),
  source: z.string(),
  target: z.string(),
  count: z.number().int(),
  property_names: z.array(z.string()).optional(),
});

/**
 * Circuit metrics output schema
 */
const CircuitMetricsOutputSchema = z.object({
  circuit_id: z.string().uuid(),
  biophysical_node_populations: z.array(NodePopulationSchema).optional(),
  virtual_node_populations: z.array(NodePopulationSchema).optional(),
  chemical_edge_populations: z.array(EdgePopulationSchema).optional(),
  electrical_edge_populations: z.array(EdgePopulationSchema).optional(),
  names_of_nodesets: z.array(z.string()).optional(),
});

/**
 * Input schema for Circuit Metrics GetOne tool
 */
export const CircuitMetricsGetOneInputSchema = z.object({
  circuit_id: z
    .string()
    .uuid()
    .describe('ID of the circuit from which the metrics should be computed.'),
  level_of_detail_nodes: LevelOfDetailSchema.default(1).describe(
    'Level of detail for nodes in the response.'
  ),
  level_of_detail_edges: LevelOfDetailSchema.default(1).describe(
    'Level of detail for edges in the response.'
  ),
});

export type CircuitMetricsGetOneInput = z.infer<
  typeof CircuitMetricsGetOneInputSchema
>;
export type CircuitMetricsGetOneOutput = z.infer<typeof CircuitMetricsOutputSchema>;

/**
 * Circuit Metrics GetOne Tool implementation
 * 
 * Given a circuit ID, computes comprehensive circuit features including:
 * - Node populations (biophysical and virtual)
 * - Edge populations (chemical and electrical)
 * - Filterable properties and their unique values
 * - Available node sets for connectivity analysis
 */
export class CircuitMetricsGetOneTool extends OBIOneTool<
  typeof CircuitMetricsGetOneInputSchema
> {
  metadata: ToolMetadata = {
    name: 'obione-circuitmetrics-getone',
    nameFrontend: 'Compute Circuit Metrics',
    description:
      'Given a circuit ID, compute the features of it. ' +
      'This tool returns comprehensive circuit metadata including node populations, edge populations, and available filterable properties.\n\n' +
      '## What This Tool Provides\n' +
      '- **Circuit structure**: Node populations, edge populations, and their properties\n' +
      '- **Filterable properties**: Available columns and values for connectivity analysis\n' +
      '- **Node sets**: Predefined groups for connectivity filtering\n' +
      '- **Population statistics**: Counts and property distributions\n\n' +
      '## What This Tool Does NOT Provide\n' +
      '- **Connection probabilities**: Use `obione-circuitconnectivitymetrics-getone` instead\n' +
      '- **Synapse counts**: Use `obione-circuitconnectivitymetrics-getone` instead\n' +
      '- **Connectivity patterns**: Use `obione-circuitconnectivitymetrics-getone` instead\n' +
      '- **Functional analysis**: Use `obione-circuitconnectivitymetrics-getone` instead\n\n' +
      '## Top-Level Output Fields\n\n' +
      '### Node Populations\n' +
      '- **biophysical_node_populations**: Contains biophysical neuron populations with detailed properties including:\n' +
      '  - `property_names`: List of available column names for filtering (e.g., "layer", "mtype", "synapse_class")\n' +
      '  - `property_unique_values`: For categorical columns, shows all unique values available for filtering\n' +
      '  - `property_value_counts`: Count of occurrences for each unique value\n' +
      '- **virtual_node_populations**: Contains virtual/artificial neuron populations with similar property structure\n' +
      '- **names_of_nodesets**: Predefined node sets that can be referenced in connectivity analysis\n\n' +
      '### Edge Populations\n' +
      '- **chemical_edge_populations**: Chemical synaptic connections between populations with properties like:\n' +
      '  - Synaptic properties (conductance, delay, decay_time, etc.)\n' +
      '  - Spatial properties (afferent/efferent coordinates, section info)\n' +
      '  - Connection statistics and degree metrics\n' +
      '- **electrical_edge_populations**: Electrical gap junction connections (if present)\n\n' +
      '### Usage for Connectivity Analysis\n' +
      'The `property_names` and `property_unique_values` from node populations are essential for:\n' +
      '- Building `pre_selection` and `post_selection` filters in connectivity metrics tools\n' +
      '- Understanding available categorical values for filtering (e.g., layer values, mtype values)\n' +
      '- Identifying which properties can be used for grouping and analysis\n\n' +
      'Example: Use `level_of_detail_nodes=1` to get detailed property information for filtering in connectivity analysis.',
    descriptionFrontend: 'Analyze a circuit, and get more insights into its properties.',
    utterances: [
      'Analyze the circuit features',
      'Compute metrics for this circuit',
      'Get some more information about this circuit',
    ],
    hil: false,
  };

  inputSchema = CircuitMetricsGetOneInputSchema;

  /**
   * Execute circuit metrics computation
   * 
   * @param input - Validated input with circuit ID and detail levels
   * @returns Circuit metrics including populations and properties
   */
  override async execute(input: CircuitMetricsGetOneInput): Promise<CircuitMetricsGetOneOutput> {
    const queryParams: Record<string, unknown> = {};

    if (input.level_of_detail_nodes !== 1) {
      queryParams['level_of_detail_nodes'] = input.level_of_detail_nodes;
    }

    if (input.level_of_detail_edges !== 1) {
      queryParams['level_of_detail_edges'] = input.level_of_detail_edges;
    }

    const response = await this.get<CircuitMetricsGetOneOutput>(
      `/declared/circuit-metrics/${input.circuit_id}`,
      queryParams
    );

    return CircuitMetricsOutputSchema.parse(response);
  }
}
