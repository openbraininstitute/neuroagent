/**
 * Tools Module
 *
 * Central export point for all tools in the Neuroagent TypeScript backend.
 *
 * This module provides:
 * - Base tool classes and interfaces
 * - Example tool implementations for demonstration
 *
 * Usage:
 * ```typescript
 * import { ExampleTool, CalculatorTool } from '@/lib/tools';
 *
 * // Get available tool classes
 * const toolClasses = await getAvailableToolClasses(config);
 *
 * // When LLM calls a tool, instantiate it
 * const tool = await createToolInstance(ToolClass, config);
 * const result = await tool.execute(input);
 * ```
 */

// Base tool system
export * from './base-tool';

// Example tools
export * from './example-tool';
export * from './calculator-tool';

// EntityCore tools
export * from './entitycore/asset-getall';
export * from './entitycore/asset-getone';
export * from './entitycore/asset-downloadone';
export * from './entitycore/brain-atlas-getall';
export * from './entitycore/brain-atlas-getone';
export * from './entitycore/brain-region-getall';
export * from './entitycore/brain-region-getone';
export * from './entitycore/brain-region-hierarchy-getall';
export * from './entitycore/brain-region-hierarchy-getone';
export * from './entitycore/cell-morphology-getall';
export * from './entitycore/cell-morphology-getone';
export * from './entitycore/circuit-getall';
export * from './entitycore/circuit-getone';
export * from './entitycore/contribution-getall';
export * from './entitycore/contribution-getone';
export * from './entitycore/electrical-cell-recording-getall';
export * from './entitycore/electrical-cell-recording-getone';
export * from './entitycore/emodel-getall';
export * from './entitycore/emodel-getone';
export * from './entitycore/etype-getall';
export * from './entitycore/etype-getone';
export * from './entitycore/experimental-bouton-density-getall';
export * from './entitycore/experimental-bouton-density-getone';
export * from './entitycore/experimental-neuron-density-getall';
export * from './entitycore/experimental-neuron-density-getone';
export * from './entitycore/experimental-synapses-per-connection-getall';
export * from './entitycore/experimental-synapses-per-connection-getone';
export * from './entitycore/ion-channel-getall';
export * from './entitycore/ion-channel-getone';
export * from './entitycore/ion-channel-model-getall';
export * from './entitycore/ion-channel-model-getone';
export * from './entitycore/ion-channel-recording-getall';
export * from './entitycore/ion-channel-recording-getone';
export * from './entitycore/measurement-annotation-getall';
export * from './entitycore/measurement-annotation-getone';
export * from './entitycore/memodel-getall';
export * from './entitycore/memodel-getone';
export * from './entitycore/mtype-getall';
export * from './entitycore/mtype-getone';
export * from './entitycore/organization-getall';
export * from './entitycore/organization-getone';
export * from './entitycore/person-getall';
export * from './entitycore/person-getone';
export * from './entitycore/simulation-campaign-getall';
export * from './entitycore/simulation-execution-getall';
export * from './entitycore/simulation-execution-getone';
export * from './entitycore/simulation-generation-getall';
export * from './entitycore/simulation-generation-getone';
export * from './entitycore/simulation-result-getall';
export * from './entitycore/simulation-result-getone';
export * from './entitycore/single-neuron-synaptome-getall';
export * from './entitycore/single-neuron-synaptome-getone';
export * from './entitycore/single-neuron-synaptome-simulation-getall';
export * from './entitycore/single-neuron-synaptome-simulation-getone';
export * from './entitycore/species-getall';
export * from './entitycore/species-getone';
export * from './entitycore/strain-getall';
export * from './entitycore/strain-getone';
export * from './entitycore/subject-getall';
export * from './entitycore/subject-getone';

// Test tools for filtering
export * from './test';

/**
 * Tool configuration interface
 *
 * Defines the configuration needed to determine which tools are available
 * and to instantiate them with proper context.
 */
export interface ToolConfig {
  // Example tool config
  exampleApiUrl?: string;
  exampleApiKey?: string;

  // Calculator tool config
  calculatorMaxValue?: number;

  // EntityCore tool config
  entitycoreUrl?: string;
  entityFrontendUrl?: string;
  vlabId?: string;
  projectId?: string;
  httpClient?: any;

  // Add more tool configs as needed
}

/**
 * Register all available tool classes for metadata access
 *
 * IMPORTANT: This function does NOT instantiate any tools!
 * It only stores CLASS REFERENCES (the class types themselves) in the registry.
 *
 * This allows accessing static properties (toolName, toolDescription, etc.)
 * without creating instances, matching Python's ClassVar pattern where
 * tool_list is list[type[BaseTool]] and you access tool.name directly.
 *
 * Example:
 * ```typescript
 * await registerToolClasses();
 * const ToolClass = toolRegistry.getClass('calculator');
 * console.log(ToolClass.toolName);  // Access static property - no instance!
 * ```
 *
 * Call this once at application startup or on-demand when needed.
 */
export async function registerToolClasses() {
  const { toolRegistry } = await import('./base-tool');

  try {
    // Import tool classes (NOT instances - just the class definitions)
    const { ExampleTool } = await import('./example-tool');
    const { CalculatorTool } = await import('./calculator-tool');

    // Import EntityCore tools
    const { AssetGetAllTool } = await import('./entitycore/asset-getall');
    const { AssetGetOneTool } = await import('./entitycore/asset-getone');
    const { AssetDownloadOneTool } = await import('./entitycore/asset-downloadone');
    const { BrainAtlasGetAllTool } = await import('./entitycore/brain-atlas-getall');
    const { BrainAtlasGetOneTool } = await import('./entitycore/brain-atlas-getone');
    const { BrainRegionGetAllTool } = await import('./entitycore/brain-region-getall');
    const { BrainRegionGetOneTool } = await import('./entitycore/brain-region-getone');
    const { BrainRegionHierarchyGetAllTool } = await import('./entitycore/brain-region-hierarchy-getall');
    const { BrainRegionHierarchyGetOneTool } = await import('./entitycore/brain-region-hierarchy-getone');
    const { CellMorphologyGetAllTool } = await import('./entitycore/cell-morphology-getall');
    const { CellMorphologyGetOneTool } = await import('./entitycore/cell-morphology-getone');
    const { CircuitGetAllTool } = await import('./entitycore/circuit-getall');
    const { CircuitGetOneTool } = await import('./entitycore/circuit-getone');
    const { ContributionGetAllTool } = await import('./entitycore/contribution-getall');
    const { ContributionGetOneTool } = await import('./entitycore/contribution-getone');
    const { EModelGetAllTool } = await import('./entitycore/emodel-getall');
    const { EModelGetOneTool } = await import('./entitycore/emodel-getone');
    const { ElectricalCellRecordingGetAllTool } = await import('./entitycore/electrical-cell-recording-getall');
    const { ElectricalCellRecordingGetOneTool } = await import('./entitycore/electrical-cell-recording-getone');
    const { EtypeGetAllTool } = await import('./entitycore/etype-getall');
    const { EtypeGetOneTool } = await import('./entitycore/etype-getone');
    const { ExperimentalBoutonDensityGetAllTool } = await import('./entitycore/experimental-bouton-density-getall');
    const { ExperimentalBoutonDensityGetOneTool } = await import('./entitycore/experimental-bouton-density-getone');
    const { ExperimentalSynapsesPerConnectionGetAllTool } = await import('./entitycore/experimental-synapses-per-connection-getall');
    const { ExperimentalSynapsesPerConnectionGetOneTool } = await import('./entitycore/experimental-synapses-per-connection-getone');
    const { ExperimentalNeuronDensityGetAllTool } = await import('./entitycore/experimental-neuron-density-getall');
    const { ExperimentalNeuronDensityGetOneTool } = await import('./entitycore/experimental-neuron-density-getone');
    const { IonChannelGetAllTool } = await import('./entitycore/ion-channel-getall');
    const { IonChannelGetOneTool } = await import('./entitycore/ion-channel-getone');
    const { IonChannelModelGetAllTool } = await import('./entitycore/ion-channel-model-getall');
    const { IonChannelModelGetOneTool } = await import('./entitycore/ion-channel-model-getone');
    const { IonChannelRecordingGetAllTool } = await import('./entitycore/ion-channel-recording-getall');
    const { IonChannelRecordingGetOneTool } = await import('./entitycore/ion-channel-recording-getone');
    const { MeasurementAnnotationGetAllTool } = await import('./entitycore/measurement-annotation-getall');
    const { MeasurementAnnotationGetOneTool } = await import('./entitycore/measurement-annotation-getone');
    const { MEModelGetAllTool } = await import('./entitycore/memodel-getall');
    const { MEModelGetOneTool } = await import('./entitycore/memodel-getone');
    const { MtypeGetAllTool } = await import('./entitycore/mtype-getall');
    const { MtypeGetOneTool } = await import('./entitycore/mtype-getone');
    const { OrganizationGetAllTool } = await import('./entitycore/organization-getall');
    const { OrganizationGetOneTool } = await import('./entitycore/organization-getone');
    const { PersonGetAllTool } = await import('./entitycore/person-getall');
    const { PersonGetOneTool } = await import('./entitycore/person-getone');
    const { SimulationExecutionGetAllTool } = await import('./entitycore/simulation-execution-getall');
    const { SimulationExecutionGetOneTool } = await import('./entitycore/simulation-execution-getone');
    const { SimulationGenerationGetAllTool } = await import('./entitycore/simulation-generation-getall');
    const { SimulationGenerationGetOneTool } = await import('./entitycore/simulation-generation-getone');
    const { SimulationCampaignGetAllTool } = await import('./entitycore/simulation-campaign-getall');
    const { SimulationResultGetAllTool } = await import('./entitycore/simulation-result-getall');
    const { SimulationResultGetOneTool } = await import('./entitycore/simulation-result-getone');
    const { SingleNeuronSynaptomeGetAllTool } = await import('./entitycore/single-neuron-synaptome-getall');
    const { SingleNeuronSynaptomeGetOneTool } = await import('./entitycore/single-neuron-synaptome-getone');
    const { SingleNeuronSynaptomeSimulationGetAllTool } = await import('./entitycore/single-neuron-synaptome-simulation-getall');
    const { SingleNeuronSynaptomeSimulationGetOneTool } = await import('./entitycore/single-neuron-synaptome-simulation-getone');
    const { SpeciesGetAllTool } = await import('./entitycore/species-getall');
    const { SpeciesGetOneTool } = await import('./entitycore/species-getone');
    const { StrainGetAllTool } = await import('./entitycore/strain-getall');
    const { StrainGetOneTool } = await import('./entitycore/strain-getone');
    const { SubjectGetAllTool } = await import('./entitycore/subject-getall');
    const { SubjectGetOneTool } = await import('./entitycore/subject-getone');

    // Import test tools
    const { WeatherTool } = await import('./test/WeatherTool');
    const { TranslatorTool } = await import('./test/TranslatorTool');
    const { TimeTool } = await import('./test/TimeTool');
    const { CurrencyTool } = await import('./test/CurrencyTool');

    // Store class references in registry (NO INSTANTIATION - just storing the class types)
    // This is like Python's: tool_list = [ExampleTool, CalculatorTool, ...]
    const toolClasses = [
      { name: 'ExampleTool', cls: ExampleTool },
      { name: 'CalculatorTool', cls: CalculatorTool },
      { name: 'AssetGetAllTool', cls: AssetGetAllTool },
      { name: 'AssetGetOneTool', cls: AssetGetOneTool },
      { name: 'AssetDownloadOneTool', cls: AssetDownloadOneTool },
      { name: 'BrainAtlasGetAllTool', cls: BrainAtlasGetAllTool },
      { name: 'BrainAtlasGetOneTool', cls: BrainAtlasGetOneTool },
      { name: 'BrainRegionGetAllTool', cls: BrainRegionGetAllTool },
      { name: 'BrainRegionGetOneTool', cls: BrainRegionGetOneTool },
      { name: 'BrainRegionHierarchyGetAllTool', cls: BrainRegionHierarchyGetAllTool },
      { name: 'BrainRegionHierarchyGetOneTool', cls: BrainRegionHierarchyGetOneTool },
      { name: 'CellMorphologyGetAllTool', cls: CellMorphologyGetAllTool },
      { name: 'CellMorphologyGetOneTool', cls: CellMorphologyGetOneTool },
      { name: 'CircuitGetAllTool', cls: CircuitGetAllTool },
      { name: 'CircuitGetOneTool', cls: CircuitGetOneTool },
      { name: 'ContributionGetAllTool', cls: ContributionGetAllTool },
      { name: 'ContributionGetOneTool', cls: ContributionGetOneTool },
      { name: 'EModelGetAllTool', cls: EModelGetAllTool },
      { name: 'EModelGetOneTool', cls: EModelGetOneTool },
      { name: 'ElectricalCellRecordingGetAllTool', cls: ElectricalCellRecordingGetAllTool },
      { name: 'ElectricalCellRecordingGetOneTool', cls: ElectricalCellRecordingGetOneTool },
      { name: 'EtypeGetAllTool', cls: EtypeGetAllTool },
      { name: 'EtypeGetOneTool', cls: EtypeGetOneTool },
      { name: 'ExperimentalBoutonDensityGetAllTool', cls: ExperimentalBoutonDensityGetAllTool },
      { name: 'ExperimentalBoutonDensityGetOneTool', cls: ExperimentalBoutonDensityGetOneTool },
      { name: 'ExperimentalSynapsesPerConnectionGetAllTool', cls: ExperimentalSynapsesPerConnectionGetAllTool },
      { name: 'ExperimentalSynapsesPerConnectionGetOneTool', cls: ExperimentalSynapsesPerConnectionGetOneTool },
      { name: 'ExperimentalNeuronDensityGetAllTool', cls: ExperimentalNeuronDensityGetAllTool },
      { name: 'ExperimentalNeuronDensityGetOneTool', cls: ExperimentalNeuronDensityGetOneTool },
      { name: 'IonChannelGetAllTool', cls: IonChannelGetAllTool },
      { name: 'IonChannelGetOneTool', cls: IonChannelGetOneTool },
      { name: 'IonChannelModelGetAllTool', cls: IonChannelModelGetAllTool },
      { name: 'IonChannelModelGetOneTool', cls: IonChannelModelGetOneTool },
      { name: 'IonChannelRecordingGetAllTool', cls: IonChannelRecordingGetAllTool },
      { name: 'IonChannelRecordingGetOneTool', cls: IonChannelRecordingGetOneTool },
      { name: 'MeasurementAnnotationGetAllTool', cls: MeasurementAnnotationGetAllTool },
      { name: 'MeasurementAnnotationGetOneTool', cls: MeasurementAnnotationGetOneTool },
      { name: 'MEModelGetAllTool', cls: MEModelGetAllTool },
      { name: 'MEModelGetOneTool', cls: MEModelGetOneTool },
      { name: 'MtypeGetAllTool', cls: MtypeGetAllTool },
      { name: 'MtypeGetOneTool', cls: MtypeGetOneTool },
      { name: 'OrganizationGetAllTool', cls: OrganizationGetAllTool },
      { name: 'OrganizationGetOneTool', cls: OrganizationGetOneTool },
      { name: 'PersonGetAllTool', cls: PersonGetAllTool },
      { name: 'PersonGetOneTool', cls: PersonGetOneTool },
      { name: 'SimulationExecutionGetAllTool', cls: SimulationExecutionGetAllTool },
      { name: 'SimulationExecutionGetOneTool', cls: SimulationExecutionGetOneTool },
      { name: 'SimulationGenerationGetAllTool', cls: SimulationGenerationGetAllTool },
      { name: 'SimulationGenerationGetOneTool', cls: SimulationGenerationGetOneTool },
      { name: 'SimulationCampaignGetAllTool', cls: SimulationCampaignGetAllTool },
      { name: 'SimulationResultGetAllTool', cls: SimulationResultGetAllTool },
      { name: 'SimulationResultGetOneTool', cls: SimulationResultGetOneTool },
      { name: 'SingleNeuronSynaptomeGetAllTool', cls: SingleNeuronSynaptomeGetAllTool },
      { name: 'SingleNeuronSynaptomeGetOneTool', cls: SingleNeuronSynaptomeGetOneTool },
      { name: 'SingleNeuronSynaptomeSimulationGetAllTool', cls: SingleNeuronSynaptomeSimulationGetAllTool },
      { name: 'SingleNeuronSynaptomeSimulationGetOneTool', cls: SingleNeuronSynaptomeSimulationGetOneTool },
      { name: 'SpeciesGetAllTool', cls: SpeciesGetAllTool },
      { name: 'SpeciesGetOneTool', cls: SpeciesGetOneTool },
      { name: 'StrainGetAllTool', cls: StrainGetAllTool },
      { name: 'StrainGetOneTool', cls: StrainGetOneTool },
      { name: 'SubjectGetAllTool', cls: SubjectGetAllTool },
      { name: 'SubjectGetOneTool', cls: SubjectGetOneTool },
      { name: 'WeatherTool', cls: WeatherTool },
      { name: 'TranslatorTool', cls: TranslatorTool },
      { name: 'TimeTool', cls: TimeTool },
      { name: 'CurrencyTool', cls: CurrencyTool },
    ];

    for (const { name, cls: ToolCls } of toolClasses) {
      try {
        // Skip if undefined (import failed)
        if (!ToolCls) {
          console.warn(`[registerToolClasses] Skipping undefined tool class: ${name}`);
          continue;
        }

        // registerClass() only stores the class reference, doesn't call new ToolClass()
        toolRegistry.registerClass(ToolCls as any);
      } catch (error) {
        // Ignore if already registered
        if (!(error instanceof Error && error.message.includes('already registered'))) {
          console.error(`[registerToolClasses] Error registering ${name}:`, error);
          throw error;
        }
      }
    }
  } catch (error) {
    console.error('[registerToolClasses] Fatal error during registration:', error);
    throw error;
  }
}

/**
 * Get available tool classes based on configuration
 *
 * Returns a list of tool CLASSES (not instances) that are available
 * based on the provided configuration (API keys, URLs, etc.).
 *
 * This matches Python's pattern where tools is list[type[BaseTool]].
 * Tools will be instantiated individually when the LLM calls them.
 *
 * @param config - Configuration to determine which tools are available
 * @returns Array of tool classes that can be used
 */
export async function getAvailableToolClasses(config: ToolConfig): Promise<any[]> {
  const availableClasses: any[] = [];

  // Example tool is available if API URL is configured
  if (config.exampleApiUrl) {
    const { ExampleTool } = await import('./example-tool');
    availableClasses.push(ExampleTool);
  }

  // Calculator tool is always available (no external dependencies)
  const { CalculatorTool } = await import('./calculator-tool');
  availableClasses.push(CalculatorTool);

  // EntityCore tools are available if EntityCore URL is configured
  if (config.entitycoreUrl) {
    const { AssetGetAllTool } = await import('./entitycore/asset-getall');
    const { AssetGetOneTool } = await import('./entitycore/asset-getone');
    const { AssetDownloadOneTool } = await import('./entitycore/asset-downloadone');
    const { BrainAtlasGetAllTool } = await import('./entitycore/brain-atlas-getall');
    const { BrainAtlasGetOneTool } = await import('./entitycore/brain-atlas-getone');
    const { BrainRegionGetAllTool } = await import('./entitycore/brain-region-getall');
    const { BrainRegionGetOneTool } = await import('./entitycore/brain-region-getone');
    const { BrainRegionHierarchyGetAllTool } = await import('./entitycore/brain-region-hierarchy-getall');
    const { BrainRegionHierarchyGetOneTool } = await import('./entitycore/brain-region-hierarchy-getone');
    const { CellMorphologyGetAllTool } = await import('./entitycore/cell-morphology-getall');
    const { CellMorphologyGetOneTool } = await import('./entitycore/cell-morphology-getone');
    const { CircuitGetAllTool } = await import('./entitycore/circuit-getall');
    const { CircuitGetOneTool } = await import('./entitycore/circuit-getone');
    const { ContributionGetAllTool } = await import('./entitycore/contribution-getall');
    const { ContributionGetOneTool } = await import('./entitycore/contribution-getone');
    const { ElectricalCellRecordingGetAllTool } = await import('./entitycore/electrical-cell-recording-getall');
    const { ElectricalCellRecordingGetOneTool } = await import('./entitycore/electrical-cell-recording-getone');
    const { EModelGetAllTool } = await import('./entitycore/emodel-getall');
    const { EModelGetOneTool } = await import('./entitycore/emodel-getone');
    const { EtypeGetAllTool } = await import('./entitycore/etype-getall');
    const { EtypeGetOneTool } = await import('./entitycore/etype-getone');
    const { ExperimentalBoutonDensityGetAllTool } = await import('./entitycore/experimental-bouton-density-getall');
    const { ExperimentalBoutonDensityGetOneTool } = await import('./entitycore/experimental-bouton-density-getone');
    const { ExperimentalSynapsesPerConnectionGetAllTool } = await import('./entitycore/experimental-synapses-per-connection-getall');
    const { ExperimentalSynapsesPerConnectionGetOneTool } = await import('./entitycore/experimental-synapses-per-connection-getone');
    const { ExperimentalNeuronDensityGetAllTool } = await import('./entitycore/experimental-neuron-density-getall');
    const { ExperimentalNeuronDensityGetOneTool } = await import('./entitycore/experimental-neuron-density-getone');
    const { IonChannelGetAllTool } = await import('./entitycore/ion-channel-getall');
    const { IonChannelGetOneTool } = await import('./entitycore/ion-channel-getone');
    const { IonChannelModelGetAllTool } = await import('./entitycore/ion-channel-model-getall');
    const { IonChannelModelGetOneTool } = await import('./entitycore/ion-channel-model-getone');
    const { IonChannelRecordingGetAllTool } = await import('./entitycore/ion-channel-recording-getall');
    const { IonChannelRecordingGetOneTool } = await import('./entitycore/ion-channel-recording-getone');
    const { MeasurementAnnotationGetAllTool } = await import('./entitycore/measurement-annotation-getall');
    const { MeasurementAnnotationGetOneTool } = await import('./entitycore/measurement-annotation-getone');
    const { MEModelGetAllTool } = await import('./entitycore/memodel-getall');
    const { MEModelGetOneTool } = await import('./entitycore/memodel-getone');
    const { MtypeGetAllTool } = await import('./entitycore/mtype-getall');
    const { MtypeGetOneTool } = await import('./entitycore/mtype-getone');
    const { OrganizationGetAllTool } = await import('./entitycore/organization-getall');
    const { OrganizationGetOneTool } = await import('./entitycore/organization-getone');
    const { PersonGetAllTool } = await import('./entitycore/person-getall');
    const { PersonGetOneTool } = await import('./entitycore/person-getone');
    const { SimulationCampaignGetAllTool } = await import('./entitycore/simulation-campaign-getall');
    const { SimulationExecutionGetAllTool } = await import('./entitycore/simulation-execution-getall');
    const { SimulationExecutionGetOneTool } = await import('./entitycore/simulation-execution-getone');
    const { SimulationGenerationGetAllTool } = await import('./entitycore/simulation-generation-getall');
    const { SimulationGenerationGetOneTool } = await import('./entitycore/simulation-generation-getone');
    const { SimulationResultGetAllTool } = await import('./entitycore/simulation-result-getall');
    const { SimulationResultGetOneTool } = await import('./entitycore/simulation-result-getone');
    const { SingleNeuronSynaptomeGetAllTool } = await import('./entitycore/single-neuron-synaptome-getall');
    const { SingleNeuronSynaptomeGetOneTool } = await import('./entitycore/single-neuron-synaptome-getone');
    const { SingleNeuronSynaptomeSimulationGetAllTool } = await import('./entitycore/single-neuron-synaptome-simulation-getall');
    const { SingleNeuronSynaptomeSimulationGetOneTool } = await import('./entitycore/single-neuron-synaptome-simulation-getone');
    const { SpeciesGetAllTool } = await import('./entitycore/species-getall');
    const { SpeciesGetOneTool } = await import('./entitycore/species-getone');
    const { StrainGetAllTool } = await import('./entitycore/strain-getall');
    const { StrainGetOneTool } = await import('./entitycore/strain-getone');
    const { SubjectGetAllTool } = await import('./entitycore/subject-getall');
    const { SubjectGetOneTool } = await import('./entitycore/subject-getone');
    availableClasses.push(AssetGetAllTool);
    availableClasses.push(AssetGetOneTool);
    availableClasses.push(AssetDownloadOneTool);
    availableClasses.push(BrainAtlasGetAllTool);
    availableClasses.push(BrainAtlasGetOneTool);
    availableClasses.push(BrainRegionGetAllTool);
    availableClasses.push(BrainRegionGetOneTool);
    availableClasses.push(BrainRegionHierarchyGetAllTool);
    availableClasses.push(BrainRegionHierarchyGetOneTool);
    availableClasses.push(CellMorphologyGetAllTool);
    availableClasses.push(CellMorphologyGetOneTool);
    availableClasses.push(CircuitGetAllTool);
    availableClasses.push(CircuitGetOneTool);
    availableClasses.push(ContributionGetAllTool);
    availableClasses.push(ContributionGetOneTool);
    availableClasses.push(EModelGetAllTool);
    availableClasses.push(EModelGetOneTool);
    availableClasses.push(ElectricalCellRecordingGetAllTool);
    availableClasses.push(ElectricalCellRecordingGetOneTool);
    availableClasses.push(EtypeGetAllTool);
    availableClasses.push(EtypeGetOneTool);
    availableClasses.push(ExperimentalBoutonDensityGetAllTool);
    availableClasses.push(ExperimentalBoutonDensityGetOneTool);
    availableClasses.push(ExperimentalSynapsesPerConnectionGetAllTool);
    availableClasses.push(ExperimentalSynapsesPerConnectionGetOneTool);
    availableClasses.push(ExperimentalNeuronDensityGetAllTool);
    availableClasses.push(ExperimentalNeuronDensityGetOneTool);
    availableClasses.push(IonChannelGetAllTool);
    availableClasses.push(IonChannelGetOneTool);
    availableClasses.push(IonChannelModelGetAllTool);
    availableClasses.push(IonChannelModelGetOneTool);
    availableClasses.push(IonChannelRecordingGetAllTool);
    availableClasses.push(IonChannelRecordingGetOneTool);
    availableClasses.push(MeasurementAnnotationGetAllTool);
    availableClasses.push(MeasurementAnnotationGetOneTool);
    availableClasses.push(MEModelGetAllTool);
    availableClasses.push(MEModelGetOneTool);
    availableClasses.push(MtypeGetAllTool);
    availableClasses.push(MtypeGetOneTool);
    availableClasses.push(OrganizationGetAllTool);
    availableClasses.push(OrganizationGetOneTool);
    availableClasses.push(PersonGetAllTool);
    availableClasses.push(PersonGetOneTool);
    availableClasses.push(SimulationCampaignGetAllTool);
    availableClasses.push(SimulationExecutionGetAllTool);
    availableClasses.push(SimulationExecutionGetOneTool);
    availableClasses.push(SimulationGenerationGetAllTool);
    availableClasses.push(SimulationGenerationGetOneTool);
    availableClasses.push(SimulationResultGetAllTool);
    availableClasses.push(SimulationResultGetOneTool);
    availableClasses.push(SingleNeuronSynaptomeGetAllTool);
    availableClasses.push(SingleNeuronSynaptomeGetOneTool);
    availableClasses.push(SingleNeuronSynaptomeSimulationGetAllTool);
    availableClasses.push(SingleNeuronSynaptomeSimulationGetOneTool);
    availableClasses.push(SpeciesGetAllTool);
    availableClasses.push(SpeciesGetOneTool);
    availableClasses.push(StrainGetAllTool);
    availableClasses.push(StrainGetOneTool);
    availableClasses.push(SubjectGetAllTool);
    availableClasses.push(SubjectGetOneTool);
  }

  // Test tools are always available (for testing filtering)
  const { WeatherTool } = await import('./test/WeatherTool');
  const { TranslatorTool } = await import('./test/TranslatorTool');
  const { TimeTool } = await import('./test/TimeTool');
  const { CurrencyTool } = await import('./test/CurrencyTool');

  availableClasses.push(WeatherTool);
  availableClasses.push(TranslatorTool);
  availableClasses.push(TimeTool);
  availableClasses.push(CurrencyTool);

  return availableClasses;
}

/**
 * Create a tool instance on-demand when LLM calls it
 *
 * This is called individually for each tool that the LLM decides to use.
 * DO NOT call this for all tools at once - only instantiate the specific
 * tool that needs to be executed.
 *
 * @param ToolCls - The tool class to instantiate
 * @param config - User-specific context for the tool
 * @returns Tool instance ready for execution
 */
export async function createToolInstance(ToolCls: any, config: ToolConfig): Promise<any> {
  const toolName = ToolCls.toolName;

  // Instantiate based on tool name
  if (toolName === 'example_tool') {
    if (!config.exampleApiUrl) {
      throw new Error('Example tool requires exampleApiUrl');
    }

    const { ExampleTool } = await import('./example-tool');
    return new ExampleTool({
      apiUrl: config.exampleApiUrl,
      apiKey: config.exampleApiKey,
    });
  }

  if (toolName === 'calculator') {
    const { CalculatorTool } = await import('./calculator-tool');
    return new CalculatorTool({
      maxValue: config.calculatorMaxValue,
    });
  }

  // EntityCore tools
  if (toolName === 'entitycore-asset-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { AssetGetAllTool } = await import('./entitycore/asset-getall');
    return new AssetGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-asset-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { AssetGetOneTool } = await import('./entitycore/asset-getone');
    return new AssetGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-asset-downloadone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { AssetDownloadOneTool } = await import('./entitycore/asset-downloadone');
    return new AssetDownloadOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-brainatlas-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { BrainAtlasGetAllTool } = await import('./entitycore/brain-atlas-getall');
    return new BrainAtlasGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-brainatlas-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { BrainAtlasGetOneTool } = await import('./entitycore/brain-atlas-getone');
    return new BrainAtlasGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-brainregion-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { BrainRegionGetAllTool } = await import('./entitycore/brain-region-getall');
    return new BrainRegionGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-brainregion-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { BrainRegionGetOneTool } = await import('./entitycore/brain-region-getone');
    return new BrainRegionGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-brainregionhierarchy-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { BrainRegionHierarchyGetAllTool } = await import('./entitycore/brain-region-hierarchy-getall');
    return new BrainRegionHierarchyGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-brainregionhierarchy-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { BrainRegionHierarchyGetOneTool } = await import('./entitycore/brain-region-hierarchy-getone');
    return new BrainRegionHierarchyGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-cellmorphology-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { CellMorphologyGetAllTool } = await import('./entitycore/cell-morphology-getall');
    return new CellMorphologyGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-cellmorphology-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { CellMorphologyGetOneTool } = await import('./entitycore/cell-morphology-getone');
    return new CellMorphologyGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-circuit-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { CircuitGetAllTool } = await import('./entitycore/circuit-getall');
    return new CircuitGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-circuit-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { CircuitGetOneTool } = await import('./entitycore/circuit-getone');
    return new CircuitGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-contribution-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { ContributionGetAllTool } = await import('./entitycore/contribution-getall');
    return new ContributionGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-contribution-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { ContributionGetOneTool } = await import('./entitycore/contribution-getone');
    return new ContributionGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-electricalcellrecording-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { ElectricalCellRecordingGetAllTool } = await import('./entitycore/electrical-cell-recording-getall');
    return new ElectricalCellRecordingGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-electricalcellrecording-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { ElectricalCellRecordingGetOneTool } = await import('./entitycore/electrical-cell-recording-getone');
    return new ElectricalCellRecordingGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-emodel-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { EModelGetAllTool } = await import('./entitycore/emodel-getall');
    return new EModelGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-emodel-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { EModelGetOneTool } = await import('./entitycore/emodel-getone');
    return new EModelGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-etype-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { EtypeGetAllTool } = await import('./entitycore/etype-getall');
    return new EtypeGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-etype-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { EtypeGetOneTool } = await import('./entitycore/etype-getone');
    return new EtypeGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-experimentalboutondensity-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { ExperimentalBoutonDensityGetAllTool } = await import('./entitycore/experimental-bouton-density-getall');
    return new ExperimentalBoutonDensityGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-experimentalboutondensity-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { ExperimentalBoutonDensityGetOneTool } = await import('./entitycore/experimental-bouton-density-getone');
    return new ExperimentalBoutonDensityGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-experimentalsynapsesperconnection-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { ExperimentalSynapsesPerConnectionGetAllTool } = await import('./entitycore/experimental-synapses-per-connection-getall');
    return new ExperimentalSynapsesPerConnectionGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-experimentalsynapsesperconnection-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { ExperimentalSynapsesPerConnectionGetOneTool } = await import('./entitycore/experimental-synapses-per-connection-getone');
    return new ExperimentalSynapsesPerConnectionGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-experimentalneurondensity-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { ExperimentalNeuronDensityGetAllTool } = await import('./entitycore/experimental-neuron-density-getall');
    return new ExperimentalNeuronDensityGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-experimentalneurondensity-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { ExperimentalNeuronDensityGetOneTool } = await import('./entitycore/experimental-neuron-density-getone');
    return new ExperimentalNeuronDensityGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-ionchannel-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { IonChannelGetAllTool } = await import('./entitycore/ion-channel-getall');
    return new IonChannelGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-ionchannel-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { IonChannelGetOneTool } = await import('./entitycore/ion-channel-getone');
    return new IonChannelGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-ionchannelmodel-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { IonChannelModelGetAllTool } = await import('./entitycore/ion-channel-model-getall');
    return new IonChannelModelGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-ionchannelmodel-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { IonChannelModelGetOneTool } = await import('./entitycore/ion-channel-model-getone');
    return new IonChannelModelGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-ionchannelrecording-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { IonChannelRecordingGetAllTool } = await import('./entitycore/ion-channel-recording-getall');
    return new IonChannelRecordingGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-ionchannelrecording-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { IonChannelRecordingGetOneTool } = await import('./entitycore/ion-channel-recording-getone');
    return new IonChannelRecordingGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-measurementannotation-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { MeasurementAnnotationGetAllTool } = await import('./entitycore/measurement-annotation-getall');
    return new MeasurementAnnotationGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-measurementannotation-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { MeasurementAnnotationGetOneTool } = await import('./entitycore/measurement-annotation-getone');
    return new MeasurementAnnotationGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-memodel-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { MEModelGetAllTool } = await import('./entitycore/memodel-getall');
    return new MEModelGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-memodel-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { MEModelGetOneTool } = await import('./entitycore/memodel-getone');
    return new MEModelGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-mtype-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { MtypeGetAllTool } = await import('./entitycore/mtype-getall');
    return new MtypeGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-mtype-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { MtypeGetOneTool } = await import('./entitycore/mtype-getone');
    return new MtypeGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-organization-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { OrganizationGetAllTool } = await import('./entitycore/organization-getall');
    return new OrganizationGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-organization-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { OrganizationGetOneTool } = await import('./entitycore/organization-getone');
    return new OrganizationGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-person-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { PersonGetAllTool } = await import('./entitycore/person-getall');
    return new PersonGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-person-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { PersonGetOneTool } = await import('./entitycore/person-getone');
    return new PersonGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-simulationcampaign-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { SimulationCampaignGetAllTool } = await import('./entitycore/simulation-campaign-getall');
    return new SimulationCampaignGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-simulationexecution-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { SimulationExecutionGetAllTool } = await import('./entitycore/simulation-execution-getall');
    return new SimulationExecutionGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-simulationexecution-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { SimulationExecutionGetOneTool } = await import('./entitycore/simulation-execution-getone');
    return new SimulationExecutionGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-simulationgeneration-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { SimulationGenerationGetAllTool } = await import('./entitycore/simulation-generation-getall');
    return new SimulationGenerationGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-simulationgeneration-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { SimulationGenerationGetOneTool } = await import('./entitycore/simulation-generation-getone');
    return new SimulationGenerationGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-simulationresult-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { SimulationResultGetAllTool } = await import('./entitycore/simulation-result-getall');
    return new SimulationResultGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-simulationresult-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { SimulationResultGetOneTool } = await import('./entitycore/simulation-result-getone');
    return new SimulationResultGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-singleneuronsynaptome-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { SingleNeuronSynaptomeGetAllTool } = await import('./entitycore/single-neuron-synaptome-getall');
    return new SingleNeuronSynaptomeGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-singleneuronsynaptome-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { SingleNeuronSynaptomeGetOneTool } = await import('./entitycore/single-neuron-synaptome-getone');
    return new SingleNeuronSynaptomeGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-singleneuronsynaptomesimulation-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { SingleNeuronSynaptomeSimulationGetAllTool } = await import('./entitycore/single-neuron-synaptome-simulation-getall');
    return new SingleNeuronSynaptomeSimulationGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-singleneuronsynaptomesimulation-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { SingleNeuronSynaptomeSimulationGetOneTool } = await import('./entitycore/single-neuron-synaptome-simulation-getone');
    return new SingleNeuronSynaptomeSimulationGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-species-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { SpeciesGetAllTool } = await import('./entitycore/species-getall');
    return new SpeciesGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-species-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { SpeciesGetOneTool } = await import('./entitycore/species-getone');
    return new SpeciesGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-subject-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { SubjectGetAllTool } = await import('./entitycore/subject-getall');
    return new SubjectGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-subject-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { SubjectGetOneTool } = await import('./entitycore/subject-getone');
    return new SubjectGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-strain-getall') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { StrainGetAllTool } = await import('./entitycore/strain-getall');
    return new StrainGetAllTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  if (toolName === 'entitycore-strain-getone') {
    if (!config.entitycoreUrl || !config.entityFrontendUrl) {
      throw new Error('EntityCore tools require entitycoreUrl and entityFrontendUrl');
    }

    const { StrainGetOneTool } = await import('./entitycore/strain-getone');
    return new StrainGetOneTool({
      httpClient: config.httpClient,
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    });
  }

  throw new Error(`Unknown tool: ${toolName}`);
}

/**
 * Initialize and return available tool classes
 *
 * Returns tool CLASSES (not instances) that match the configuration.
 * This follows the ClassVar pattern where we work with types until
 * the LLM selects specific tools to execute.
 *
 * Usage:
 * ```typescript
 * const toolClasses = await initializeTools(config);
 *
 * // Access static metadata without instantiation
 * toolClasses.forEach(ToolClass => {
 *   console.log(ToolClass.toolName);
 *   console.log(ToolClass.toolHil);
 * });
 *
 * // Later, when LLM calls a tool, instantiate it
 * const instance = new ToolClass(contextVariables);
 * await instance.execute(input);
 * ```
 *
 * @param _config - Configuration to determine available tools (currently unused)
 * @returns Array of tool classes (NOT instances)
 */
export async function initializeTools(_config?: any): Promise<any[]> {
  // Register tool classes if not already done
  await registerToolClasses();

  const { toolRegistry } = await import('./base-tool');

  // Return all registered tool classes
  // These are CLASS REFERENCES, not instances
  return toolRegistry.getAllClasses();
}
