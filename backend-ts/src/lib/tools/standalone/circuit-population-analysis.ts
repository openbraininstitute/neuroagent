/**
 * Circuit Population Analysis Tool
 *
 * Analyzes SONATA neural circuit population data using natural language questions.
 * Converts natural language to SQL queries and executes them against circuit population data.
 *
 * Translated from: backend/src/neuroagent/tools/circuit_population_analysis_tool.py
 *
 * NOTE: This is a simplified implementation. Full implementation would require:
 * - bluepysnap equivalent for TypeScript (circuit data loading)
 * - DuckDB WASM or Node.js bindings
 * - Circuit data download and extraction
 * - SONATA format parsing
 *
 * For now, this provides the interface and basic structure.
 */

import { z } from 'zod';
import { BaseTool, type BaseContextVariables } from '../base-tool';
import type { KyInstance } from 'ky';

/**
 * Context variables required for Circuit Population Analysis tool
 */
export interface CircuitPopulationAnalysisContextVariables
  extends BaseContextVariables {
  httpClient: KyInstance;
  entitycoreUrl: string;
  openaiApiKey: string;
  vlabId?: string;
  projectId?: string;
}

/**
 * Input schema for Circuit Population Analysis tool
 */
export const CircuitPopulationAnalysisInputSchema = z.object({
  circuit_id: z.string().uuid().describe('ID of the circuit'),
  population_name: z
    .string()
    .default('S1nonbarrel_neurons')
    .describe("Name of the circuit's population of interest"),
  question: z
    .string()
    .describe(
      'Natural language question about the neurons in the circuit population. DO NOT mention the population name, it is already filtered by the `population_name` argument of this tool.'
    ),
});

export type CircuitPopulationAnalysisInput = z.infer<
  typeof CircuitPopulationAnalysisInputSchema
>;

/**
 * Output schema for Circuit Population Analysis tool
 */
export const CircuitPopulationAnalysisOutputSchema = z.object({
  result_data: z.string().describe('JSON string of analysis results'),
  query_executed: z.string().describe('SQL query that was executed'),
});

export type CircuitPopulationAnalysisOutput = z.infer<
  typeof CircuitPopulationAnalysisOutputSchema
>;

/**
 * Circuit Population Analysis Tool
 *
 * Analyzes SONATA neural circuit populations using natural language questions.
 * Supports comprehensive analysis of neuron populations including:
 * - Spatial properties (3D coordinates, layer, region)
 * - Cell types (biophysical, point_neuron, etc.)
 * - Morphological properties (mtype, morphology files)
 * - Electrical properties (etype, excitatory/inhibitory)
 * - Statistical analysis and distributions
 */
export class CircuitPopulationAnalysisTool extends BaseTool<
  typeof CircuitPopulationAnalysisInputSchema,
  CircuitPopulationAnalysisContextVariables
> {
  static override toolName = 'circuit-population-data-analysis';
  static override toolNameFrontend = 'Analyze Circuit Population';

  static override utterances = [
    'What is the most common morphological type in the circuit?',
    'What is the number of excitatory neurons in layer 3?',
    'What is the distribution of cells per layer',
    'How many me-type combinations and what are number of each me-type combinations used in circuit?',
    'Give me the unique e-types of the population S1nonbarrel_neurons.',
  ];

  static override toolDescription = `This tool allows analyzing SONATA neural circuit population data using natural language questions about neurons.

It converts natural language questions about neural circuit populations into SQL queries and executes them
against the population DataFrame. The tool supports comprehensive analysis of neuron populations following
the SONATA data format specification, including:

- Filtering neurons by spatial properties (3D coordinates, layer, region, subregion)
- Analyzing cell types (biophysical, point_neuron, single_compartment, virtual)
- Examining morphological properties (mtype, morphology files, model templates)
- Investigating electrical properties (etype, excitatory/inhibitory classification)
- Statistical analysis of population distributions and characteristics
- Spatial queries for neuron positioning and circuit topology

The tool understands SONATA-specific terminology and data structures, including node types, model types,
morphological classifications, and circuit organization principles.

Input:
- circuit_id: UUID of the circuit
- population_name: Name of the neural population to analyze, it will only keep this particular population.
- question: A natural language question about the neurons in the population, DO NOT MENTION the population name in the question.

Output: Analysis results showing neuron data based on the query, formatted according to SONATA standards`;

  inputSchema = CircuitPopulationAnalysisInputSchema;
  contextVariables: CircuitPopulationAnalysisContextVariables;

  constructor(
    contextVariables: CircuitPopulationAnalysisContextVariables
  ) {
    super();
    this.contextVariables = contextVariables;
  }

  /**
   * Execute the Circuit Population Analysis tool
   *
   * NOTE: This is a simplified implementation that provides the interface.
   * Full implementation requires:
   * 1. Circuit data download from EntityCore (circuit.gz file)
   * 2. Extraction and parsing of SONATA circuit_config.json
   * 3. Loading population data using bluepysnap equivalent
   * 4. DuckDB integration for SQL query execution
   * 5. OpenAI API call to convert natural language to SQL
   * 6. SQL safety validation
   * 7. Query execution and result formatting
   *
   * The Python implementation uses:
   * - bluepysnap for circuit loading
   * - duckdb for SQL execution
   * - OpenAI structured outputs for SQL generation
   * - httpx for async HTTP requests
   * - tarfile for extraction
   *
   * TypeScript equivalents would need:
   * - Custom SONATA parser or port of bluepysnap
   * - duckdb-wasm or @duckdb/duckdb-wasm
   * - OpenAI SDK with structured outputs
   * - node-fetch or ky for HTTP
   * - tar-stream or decompress for extraction
   */
  async execute(
    input: CircuitPopulationAnalysisInput
  ): Promise<CircuitPopulationAnalysisOutput> {
    // This would require significant infrastructure:
    // 1. Download circuit.gz from EntityCore
    // 2. Extract and parse SONATA format
    // 3. Load population data
    // 4. Set up DuckDB
    // 5. Generate SQL from natural language using OpenAI
    // 6. Execute SQL safely
    // 7. Return results

    throw new Error(
      `Circuit Population Analysis tool requires full implementation. ` +
        `This tool needs: ` +
        `1. SONATA circuit data loading (bluepysnap equivalent), ` +
        `2. DuckDB integration for SQL execution, ` +
        `3. OpenAI API for natural language to SQL conversion, ` +
        `4. Circuit data download and extraction from EntityCore. ` +
        `Input received: circuit_id=${input.circuit_id}, population_name=${input.population_name}, question="${input.question}"`
    );
  }

  static async isOnline(
    _contextVariables: CircuitPopulationAnalysisContextVariables
  ): Promise<boolean> {
    return true;
  }
}
