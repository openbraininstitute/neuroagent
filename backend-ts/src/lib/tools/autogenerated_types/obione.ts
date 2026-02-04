import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core';
import { z } from 'zod';

const ConnectivityMetricsRequest = z
  .object({
    circuit_id: z.string(),
    edge_population: z.string(),
    pre_selection: z
      .union([z.record(z.union([z.string(), z.array(z.string())])), z.null()])
      .optional(),
    pre_node_set: z.union([z.string(), z.null()]).optional(),
    post_selection: z
      .union([z.record(z.union([z.string(), z.array(z.string())])), z.null()])
      .optional(),
    post_node_set: z.union([z.string(), z.null()]).optional(),
    group_by: z.union([z.string(), z.null()]).optional(),
    max_distance: z.union([z.number(), z.null()]).optional(),
  })
  .passthrough();
const virtual_lab_id = z.union([z.string(), z.null()]).optional();
const ConnectivityMetricsOutput = z
  .object({
    connection_probability: z.union([z.object({}).partial().passthrough(), z.null()]),
    mean_number_of_synapses: z.union([z.object({}).partial().passthrough(), z.null()]),
  })
  .partial()
  .passthrough();
const ValidationError = z
  .object({ loc: z.array(z.union([z.string(), z.number()])), msg: z.string(), type: z.string() })
  .passthrough();
const HTTPValidationError = z
  .object({ detail: z.array(ValidationError) })
  .partial()
  .passthrough();
const NodePopulationType = z.enum(['biophysical', 'virtual']);
const CircuitMetricsNodePopulation = z
  .object({
    number_of_nodes: z.number().int(),
    name: z.string(),
    population_type: NodePopulationType,
    property_names: z.array(z.string()),
    property_unique_values: z.record(z.array(z.string())),
    property_value_counts: z.record(z.record(z.number().int())),
    node_location_info: z.union([z.record(z.record(z.number())), z.null()]),
  })
  .passthrough();
const EdgePopulationType = z.enum(['chemical', 'electrical']);
const CircuitMetricsEdgePopulation = z
  .object({
    number_of_edges: z.number().int(),
    name: z.string(),
    population_type: EdgePopulationType,
    property_names: z.array(z.string()),
    property_stats: z.union([z.record(z.record(z.number())), z.null()]),
    degree_stats: z.union([z.record(z.record(z.number())), z.null()]),
  })
  .passthrough();
const CircuitMetricsOutput = z
  .object({
    number_of_biophys_node_populations: z.number().int(),
    number_of_virtual_node_populations: z.number().int(),
    names_of_biophys_node_populations: z.array(z.string()),
    names_of_virtual_node_populations: z.array(z.string()),
    names_of_nodesets: z.array(z.string()),
    biophysical_node_populations: z.array(z.union([CircuitMetricsNodePopulation, z.null()])),
    virtual_node_populations: z.array(z.union([CircuitMetricsNodePopulation, z.null()])),
    number_of_chemical_edge_populations: z.number().int(),
    number_of_electrical_edge_populations: z.number().int(),
    names_of_chemical_edge_populations: z.array(z.string()),
    names_of_electrical_edge_populations: z.array(z.string()),
    chemical_edge_populations: z.array(z.union([CircuitMetricsEdgePopulation, z.null()])),
    electrical_edge_populations: z.array(z.union([CircuitMetricsEdgePopulation, z.null()])),
  })
  .passthrough();
const CircuitPopulationsResponse = z.object({ populations: z.array(z.string()) }).passthrough();
const CircuitNodesetsResponse = z.object({ nodesets: z.array(z.string()) }).passthrough();
const SingleTimestamp = z
  .object({
    type: z.string().default('SingleTimestamp'),
    start_time: z.union([z.number(), z.array(z.number().gte(0))]).default(0),
  })
  .partial();
const RegularTimestamps = z
  .object({
    type: z.string().default('RegularTimestamps'),
    start_time: z.union([z.number(), z.array(z.number().gte(0))]).default(0),
    interval: z.union([z.number(), z.array(z.number().gte(0))]).default(10),
    number_of_repetitions: z.union([z.number(), z.array(z.number().int().gte(0))]).default(10),
  })
  .partial();
const NeuronSetReference = z.object({
  block_dict_name: z.string().optional().default(''),
  block_name: z.string(),
  type: z.string().optional().default('NeuronSetReference'),
});
const NonNegativeFloatRange = z.object({
  type: z.string().optional().default('NonNegativeFloatRange'),
  start: z.number().gte(0),
  step: z.number().gt(0),
  end: z.number().gte(0),
});
const SomaVoltageRecording = z
  .object({
    type: z.string().default('SomaVoltageRecording'),
    neuron_set: z.union([NeuronSetReference, z.null()]),
    dt: z.union([z.number(), z.array(z.number().gte(0.025)), NonNegativeFloatRange]).default(0.1),
  })
  .partial();
const TimeWindowSomaVoltageRecording = z
  .object({
    type: z.string().default('TimeWindowSomaVoltageRecording'),
    neuron_set: z.union([NeuronSetReference, z.null()]),
    dt: z.union([z.number(), z.array(z.number().gte(0.025)), NonNegativeFloatRange]).default(0.1),
    start_time: z.union([z.number(), z.array(z.number().gte(0))]).default(0),
    end_time: z.union([z.number(), z.array(z.number().gte(0))]).default(100),
  })
  .partial();
const Info = z.object({
  type: z.string().optional().default('Info'),
  campaign_name: z.string().min(1),
  campaign_description: z.string().min(1),
});
const NamedTuple = z.object({
  name: z.string().optional().default('Default name'),
  elements: z.array(z.number().int().gte(0)),
  type: z.string().optional().default('NamedTuple'),
});
const IDNeuronSet = z.object({
  type: z.string().optional().default('IDNeuronSet'),
  sample_percentage: z
    .union([z.number(), z.array(z.number().gte(0).lte(100))])
    .optional()
    .default(100),
  sample_seed: z
    .union([z.number(), z.array(z.number().int())])
    .optional()
    .default(1),
  neuron_ids: z.union([NamedTuple, z.array(NamedTuple)]),
});
const AllNeurons = z
  .object({
    type: z.string().default('AllNeurons'),
    sample_percentage: z.union([z.number(), z.array(z.number().gte(0).lte(100))]).default(100),
    sample_seed: z.union([z.number(), z.array(z.number().int())]).default(1),
  })
  .partial();
const ExcitatoryNeurons = z
  .object({
    type: z.string().default('ExcitatoryNeurons'),
    sample_percentage: z.union([z.number(), z.array(z.number().gte(0).lte(100))]).default(100),
    sample_seed: z.union([z.number(), z.array(z.number().int())]).default(1),
  })
  .partial();
const InhibitoryNeurons = z
  .object({
    type: z.string().default('InhibitoryNeurons'),
    sample_percentage: z.union([z.number(), z.array(z.number().gte(0).lte(100))]).default(100),
    sample_seed: z.union([z.number(), z.array(z.number().int())]).default(1),
  })
  .partial();
const PredefinedNeuronSet = z.object({
  type: z.string().optional().default('PredefinedNeuronSet'),
  sample_percentage: z
    .union([z.number(), z.array(z.number().gte(0).lte(100))])
    .optional()
    .default(100),
  sample_seed: z
    .union([z.number(), z.array(z.number().int())])
    .optional()
    .default(1),
  node_set: z.union([z.string(), z.array(z.string().min(1))]),
});
const nbS1VPMInputs = z
  .object({
    type: z.string().default('nbS1VPMInputs'),
    sample_percentage: z.union([z.number(), z.array(z.number().gte(0).lte(100))]).default(100),
    sample_seed: z.union([z.number(), z.array(z.number().int())]).default(1),
  })
  .partial();
const nbS1POmInputs = z
  .object({
    type: z.string().default('nbS1POmInputs'),
    sample_percentage: z.union([z.number(), z.array(z.number().gte(0).lte(100))]).default(100),
    sample_seed: z.union([z.number(), z.array(z.number().int())]).default(1),
  })
  .partial();
const SynapticMgManipulation = z
  .object({
    type: z.string().default('SynapticMgManipulation'),
    magnesium_value: z.union([z.number(), z.array(z.number().gte(0))]).default(2.4),
  })
  .partial();
const ScaleAcetylcholineUSESynapticManipulation = z
  .object({
    type: z.string().default('ScaleAcetylcholineUSESynapticManipulation'),
    use_scaling: z.union([z.number(), z.array(z.number().gte(0))]).default(0.7050728631217412),
  })
  .partial();
const Circuit = z.object({
  name: z.string(),
  path: z.string(),
  matrix_path: z.union([z.string(), z.null()]).optional(),
  type: z.string().optional().default('Circuit'),
});
const CircuitFromID = z.object({
  id_str: z.string(),
  type: z.string().optional().default('CircuitFromID'),
});
const obi_one__scientific__tasks__generate_simulation_configs__CircuitSimulationScanConfig__Initialize =
  z.object({
    type: z.string().optional().default('CircuitSimulationScanConfig.Initialize'),
    circuit: z.union([
      z.discriminatedUnion('type', [Circuit, CircuitFromID]),
      z.array(z.discriminatedUnion('type', [Circuit, CircuitFromID])),
    ]),
    simulation_length: z
      .union([z.number(), z.array(z.number().gte(1).lte(5000))])
      .optional()
      .default(1000),
    extracellular_calcium_concentration: z
      .union([z.number(), z.array(z.number().gte(0))])
      .optional()
      .default(1.1),
    v_init: z
      .union([z.number(), z.array(z.number())])
      .optional()
      .default(-80),
    random_seed: z
      .union([z.number(), z.array(z.number().int())])
      .optional()
      .default(1),
    node_set: z.union([NeuronSetReference, z.null()]).optional(),
  });
const TimestampsReference = z.object({
  block_dict_name: z.string().optional().default(''),
  block_name: z.string(),
  type: z.string().optional().default('TimestampsReference'),
});
const FloatRange = z.object({
  type: z.string().optional().default('FloatRange'),
  start: z.number(),
  step: z.number().gt(0),
  end: z.number(),
});
const ConstantCurrentClampSomaticStimulus = z
  .object({
    type: z.string().default('ConstantCurrentClampSomaticStimulus'),
    timestamps: z.union([TimestampsReference, z.null()]),
    neuron_set: z.union([NeuronSetReference, z.null()]),
    timestamp_offset: z.union([z.number(), z.array(z.number()), z.null()]).default(0),
    duration: z.union([z.number(), z.array(z.number().gte(0))]).default(200),
    amplitude: z.union([z.number(), z.array(z.number()), FloatRange]).default(0.1),
  })
  .partial();
const HyperpolarizingCurrentClampSomaticStimulus = z
  .object({
    type: z.string().default('HyperpolarizingCurrentClampSomaticStimulus'),
    timestamps: z.union([TimestampsReference, z.null()]),
    neuron_set: z.union([NeuronSetReference, z.null()]),
    timestamp_offset: z.union([z.number(), z.array(z.number()), z.null()]).default(0),
    duration: z.union([z.number(), z.array(z.number().gte(0))]).default(200),
  })
  .partial();
const LinearCurrentClampSomaticStimulus = z
  .object({
    type: z.string().default('LinearCurrentClampSomaticStimulus'),
    timestamps: z.union([TimestampsReference, z.null()]),
    neuron_set: z.union([NeuronSetReference, z.null()]),
    timestamp_offset: z.union([z.number(), z.array(z.number()), z.null()]).default(0),
    duration: z.union([z.number(), z.array(z.number().gte(0))]).default(200),
    amplitude_start: z.union([z.number(), z.array(z.number())]).default(0.1),
    amplitude_end: z.union([z.number(), z.array(z.number())]).default(0.2),
  })
  .partial();
const MultiPulseCurrentClampSomaticStimulus = z
  .object({
    type: z.string().default('MultiPulseCurrentClampSomaticStimulus'),
    timestamps: z.union([TimestampsReference, z.null()]),
    neuron_set: z.union([NeuronSetReference, z.null()]),
    timestamp_offset: z.union([z.number(), z.array(z.number()), z.null()]).default(0),
    duration: z.union([z.number(), z.array(z.number().gte(0))]).default(200),
    amplitude: z.union([z.number(), z.array(z.number())]).default(0.1),
    width: z.union([z.number(), z.array(z.number().gte(0.000001))]).default(50),
    frequency: z.union([z.number(), z.array(z.number().gte(0.000001))]).default(1),
  })
  .partial();
const NormallyDistributedCurrentClampSomaticStimulus = z
  .object({
    type: z.string().default('NormallyDistributedCurrentClampSomaticStimulus'),
    timestamps: z.union([TimestampsReference, z.null()]),
    neuron_set: z.union([NeuronSetReference, z.null()]),
    timestamp_offset: z.union([z.number(), z.array(z.number()), z.null()]).default(0),
    duration: z.union([z.number(), z.array(z.number().gte(0))]).default(200),
    mean_amplitude: z.union([z.number(), z.array(z.number())]).default(0.01),
    variance: z.union([z.number(), z.array(z.number().gte(0))]).default(0.01),
  })
  .partial();
const RelativeNormallyDistributedCurrentClampSomaticStimulus = z
  .object({
    type: z.string().default('RelativeNormallyDistributedCurrentClampSomaticStimulus'),
    timestamps: z.union([TimestampsReference, z.null()]),
    neuron_set: z.union([NeuronSetReference, z.null()]),
    timestamp_offset: z.union([z.number(), z.array(z.number()), z.null()]).default(0),
    duration: z.union([z.number(), z.array(z.number().gte(0))]).default(200),
    mean_percentage_of_threshold_current: z
      .union([z.number(), z.array(z.number().gte(0))])
      .default(0.01),
    variance: z.union([z.number(), z.array(z.number().gte(0))]).default(0.01),
  })
  .partial();
const RelativeConstantCurrentClampSomaticStimulus = z
  .object({
    type: z.string().default('RelativeConstantCurrentClampSomaticStimulus'),
    timestamps: z.union([TimestampsReference, z.null()]),
    neuron_set: z.union([NeuronSetReference, z.null()]),
    timestamp_offset: z.union([z.number(), z.array(z.number()), z.null()]).default(0),
    duration: z.union([z.number(), z.array(z.number().gte(0))]).default(200),
    percentage_of_threshold_current: z.union([z.number(), z.array(z.number().gte(0))]).default(10),
  })
  .partial();
const RelativeLinearCurrentClampSomaticStimulus = z
  .object({
    type: z.string().default('RelativeLinearCurrentClampSomaticStimulus'),
    timestamps: z.union([TimestampsReference, z.null()]),
    neuron_set: z.union([NeuronSetReference, z.null()]),
    timestamp_offset: z.union([z.number(), z.array(z.number()), z.null()]).default(0),
    duration: z.union([z.number(), z.array(z.number().gte(0))]).default(200),
    percentage_of_threshold_current_start: z
      .union([z.number(), z.array(z.number().gte(0))])
      .default(10),
    percentage_of_threshold_current_end: z
      .union([z.number(), z.array(z.number().gte(0))])
      .default(100),
  })
  .partial();
const SinusoidalCurrentClampSomaticStimulus = z
  .object({
    type: z.string().default('SinusoidalCurrentClampSomaticStimulus'),
    timestamps: z.union([TimestampsReference, z.null()]),
    neuron_set: z.union([NeuronSetReference, z.null()]),
    timestamp_offset: z.union([z.number(), z.array(z.number()), z.null()]).default(0),
    duration: z.union([z.number(), z.array(z.number().gte(0))]).default(200),
    maximum_amplitude: z.union([z.number(), z.array(z.number())]).default(0.1),
    frequency: z.union([z.number(), z.array(z.number().gte(0.000001))]).default(1),
    dt: z.union([z.number(), z.array(z.number().gte(0.025))]).default(0.025),
  })
  .partial();
const SubthresholdCurrentClampSomaticStimulus = z
  .object({
    type: z.string().default('SubthresholdCurrentClampSomaticStimulus'),
    timestamps: z.union([TimestampsReference, z.null()]),
    neuron_set: z.union([NeuronSetReference, z.null()]),
    timestamp_offset: z.union([z.number(), z.array(z.number()), z.null()]).default(0),
    duration: z.union([z.number(), z.array(z.number().gte(0))]).default(200),
    percentage_below_threshold: z.union([z.number(), z.array(z.number())]).default(0.1),
  })
  .partial();
const OrnsteinUhlenbeckCurrentSomaticStimulus = z
  .object({
    type: z.string().default('OrnsteinUhlenbeckCurrentSomaticStimulus'),
    timestamps: z.union([TimestampsReference, z.null()]),
    neuron_set: z.union([NeuronSetReference, z.null()]),
    timestamp_offset: z.union([z.number(), z.array(z.number()), z.null()]).default(0),
    duration: z.union([z.number(), z.array(z.number().gte(0))]).default(200),
    time_constant: z.union([z.number(), z.array(z.number().gt(0))]).default(2.7),
    mean_amplitude: z.union([z.number(), z.array(z.number().gte(0))]).default(0.1),
    standard_deviation: z.union([z.number(), z.array(z.number().gt(0))]).default(0.05),
  })
  .partial();
const OrnsteinUhlenbeckConductanceSomaticStimulus = z
  .object({
    type: z.string().default('OrnsteinUhlenbeckConductanceSomaticStimulus'),
    timestamps: z.union([TimestampsReference, z.null()]),
    neuron_set: z.union([NeuronSetReference, z.null()]),
    timestamp_offset: z.union([z.number(), z.array(z.number()), z.null()]).default(0),
    duration: z.union([z.number(), z.array(z.number().gte(0))]).default(200),
    time_constant: z.union([z.number(), z.array(z.number().gt(0))]).default(2.7),
    mean_amplitude: z.union([z.number(), z.array(z.number().gte(0))]).default(0.001),
    standard_deviation: z.union([z.number(), z.array(z.number().gt(0))]).default(0.001),
    reversal_potential: z.union([z.number(), z.array(z.number())]).default(0),
  })
  .partial();
const RelativeOrnsteinUhlenbeckCurrentSomaticStimulus = z
  .object({
    type: z.string().default('RelativeOrnsteinUhlenbeckCurrentSomaticStimulus'),
    timestamps: z.union([TimestampsReference, z.null()]),
    neuron_set: z.union([NeuronSetReference, z.null()]),
    timestamp_offset: z.union([z.number(), z.array(z.number()), z.null()]).default(0),
    duration: z.union([z.number(), z.array(z.number().gte(0))]).default(200),
    time_constant: z.union([z.number(), z.array(z.number().gt(0))]).default(2.7),
    mean_percentage_of_threshold_current: z
      .union([z.number(), z.array(z.number().gte(0))])
      .default(100),
    standard_deviation_percentage_of_threshold: z
      .union([z.number(), z.array(z.number().gt(0))])
      .default(5),
  })
  .partial();
const PoissonSpikeStimulus = z
  .object({
    type: z.string().default('PoissonSpikeStimulus'),
    timestamps: z.union([TimestampsReference, z.null()]),
    source_neuron_set: z.union([NeuronSetReference, z.null()]),
    targeted_neuron_set: z.union([NeuronSetReference, z.null()]),
    timestamp_offset: z.union([z.number(), z.array(z.number()), z.null()]).default(0),
    duration: z.union([z.number(), z.array(z.number().gte(0).lte(5000))]).default(200),
    frequency: z.union([z.number(), z.array(z.number().gte(0.000001))]).default(1),
    random_seed: z.union([z.number(), z.array(z.number().int())]).default(0),
  })
  .partial();
const FullySynchronousSpikeStimulus = z
  .object({
    type: z.string().default('FullySynchronousSpikeStimulus'),
    timestamps: z.union([TimestampsReference, z.null()]),
    source_neuron_set: z.union([NeuronSetReference, z.null()]),
    targeted_neuron_set: z.union([NeuronSetReference, z.null()]),
    timestamp_offset: z.union([z.number(), z.array(z.number()), z.null()]).default(0),
  })
  .partial();
const SinusoidalPoissonSpikeStimulus = z
  .object({
    type: z.string().default('SinusoidalPoissonSpikeStimulus'),
    timestamps: z.union([TimestampsReference, z.null()]),
    source_neuron_set: z.union([NeuronSetReference, z.null()]),
    targeted_neuron_set: z.union([NeuronSetReference, z.null()]),
    timestamp_offset: z.union([z.number(), z.array(z.number()), z.null()]).default(0),
    duration: z.union([z.number(), z.array(z.number().gte(0).lte(5000))]).default(200),
    minimum_rate: z.union([z.number(), z.array(z.number().gte(0.00001).lte(50))]).default(0.00001),
    maximum_rate: z.union([z.number(), z.array(z.number().gte(0.00001).lte(50))]).default(10),
    modulation_frequency_hz: z
      .union([z.number(), z.array(z.number().gte(0.00001).lte(100000))])
      .default(5),
    phase_degrees: z.union([z.number(), z.array(z.number())]).default(0),
    random_seed: z.union([z.number(), z.array(z.number().int())]).default(0),
  })
  .partial();
const CircuitSimulationScanConfig = z.object({
  type: z.string().optional().default('CircuitSimulationScanConfig'),
  timestamps: z
    .record(z.discriminatedUnion('type', [SingleTimestamp, RegularTimestamps]))
    .optional(),
  recordings: z
    .record(z.discriminatedUnion('type', [SomaVoltageRecording, TimeWindowSomaVoltageRecording]))
    .optional(),
  info: Info,
  neuron_sets: z
    .record(
      z.discriminatedUnion('type', [
        IDNeuronSet,
        AllNeurons,
        ExcitatoryNeurons,
        InhibitoryNeurons,
        PredefinedNeuronSet,
        nbS1VPMInputs,
        nbS1POmInputs,
      ])
    )
    .optional(),
  synaptic_manipulations: z
    .record(
      z.discriminatedUnion('type', [
        SynapticMgManipulation,
        ScaleAcetylcholineUSESynapticManipulation,
      ])
    )
    .optional(),
  initialize:
    obi_one__scientific__tasks__generate_simulation_configs__CircuitSimulationScanConfig__Initialize,
  stimuli: z
    .record(
      z.discriminatedUnion('type', [
        ConstantCurrentClampSomaticStimulus,
        HyperpolarizingCurrentClampSomaticStimulus,
        LinearCurrentClampSomaticStimulus,
        MultiPulseCurrentClampSomaticStimulus,
        NormallyDistributedCurrentClampSomaticStimulus,
        RelativeNormallyDistributedCurrentClampSomaticStimulus,
        RelativeConstantCurrentClampSomaticStimulus,
        RelativeLinearCurrentClampSomaticStimulus,
        SinusoidalCurrentClampSomaticStimulus,
        SubthresholdCurrentClampSomaticStimulus,
        OrnsteinUhlenbeckCurrentSomaticStimulus,
        OrnsteinUhlenbeckConductanceSomaticStimulus,
        RelativeOrnsteinUhlenbeckCurrentSomaticStimulus,
        PoissonSpikeStimulus,
        FullySynchronousSpikeStimulus,
        SinusoidalPoissonSpikeStimulus,
      ])
    )
    .optional(),
});
const obi_one__scientific__unions__aliases__SimulationsForm__Initialize = z.object({
  type: z.string().optional().default('SimulationsForm.Initialize'),
  circuit: z.union([
    z.discriminatedUnion('type', [Circuit, CircuitFromID]),
    z.array(z.discriminatedUnion('type', [Circuit, CircuitFromID])),
  ]),
  simulation_length: z
    .union([z.number(), z.array(z.number().gte(1).lte(5000))])
    .optional()
    .default(1000),
  extracellular_calcium_concentration: z
    .union([z.number(), z.array(z.number().gte(0))])
    .optional()
    .default(1.1),
  v_init: z
    .union([z.number(), z.array(z.number())])
    .optional()
    .default(-80),
  random_seed: z
    .union([z.number(), z.array(z.number().int())])
    .optional()
    .default(1),
  node_set: z.union([NeuronSetReference, z.null()]).optional(),
});
const SimulationsForm = z.object({
  type: z.string().optional().default('SimulationsForm'),
  timestamps: z
    .record(z.discriminatedUnion('type', [SingleTimestamp, RegularTimestamps]))
    .optional(),
  recordings: z
    .record(z.discriminatedUnion('type', [SomaVoltageRecording, TimeWindowSomaVoltageRecording]))
    .optional(),
  info: Info,
  neuron_sets: z
    .record(
      z.discriminatedUnion('type', [
        IDNeuronSet,
        AllNeurons,
        ExcitatoryNeurons,
        InhibitoryNeurons,
        PredefinedNeuronSet,
        nbS1VPMInputs,
        nbS1POmInputs,
      ])
    )
    .optional(),
  synaptic_manipulations: z
    .record(
      z.discriminatedUnion('type', [
        SynapticMgManipulation,
        ScaleAcetylcholineUSESynapticManipulation,
      ])
    )
    .optional(),
  initialize: obi_one__scientific__unions__aliases__SimulationsForm__Initialize,
  stimuli: z
    .record(
      z.discriminatedUnion('type', [
        ConstantCurrentClampSomaticStimulus,
        HyperpolarizingCurrentClampSomaticStimulus,
        LinearCurrentClampSomaticStimulus,
        MultiPulseCurrentClampSomaticStimulus,
        NormallyDistributedCurrentClampSomaticStimulus,
        RelativeNormallyDistributedCurrentClampSomaticStimulus,
        RelativeConstantCurrentClampSomaticStimulus,
        RelativeLinearCurrentClampSomaticStimulus,
        SinusoidalCurrentClampSomaticStimulus,
        SubthresholdCurrentClampSomaticStimulus,
        OrnsteinUhlenbeckCurrentSomaticStimulus,
        OrnsteinUhlenbeckConductanceSomaticStimulus,
        RelativeOrnsteinUhlenbeckCurrentSomaticStimulus,
        PoissonSpikeStimulus,
        FullySynchronousSpikeStimulus,
        SinusoidalPoissonSpikeStimulus,
      ])
    )
    .optional(),
});
const obi_one__scientific__tasks__circuit_extraction__CircuitExtractionScanConfig__Initialize =
  z.object({
    type: z.string().optional().default('CircuitExtractionScanConfig.Initialize'),
    circuit: z.union([
      z.discriminatedUnion('type', [Circuit, CircuitFromID]),
      z.array(z.discriminatedUnion('type', [Circuit, CircuitFromID])),
    ]),
    do_virtual: z.boolean().optional().default(true),
    create_external: z.boolean().optional().default(true),
  });
const CircuitExtractionScanConfig = z.object({
  type: z.string().optional().default('CircuitExtractionScanConfig'),
  info: Info,
  initialize:
    obi_one__scientific__tasks__circuit_extraction__CircuitExtractionScanConfig__Initialize,
  neuron_set: z.discriminatedUnion('type', [
    AllNeurons,
    ExcitatoryNeurons,
    InhibitoryNeurons,
    PredefinedNeuronSet,
    IDNeuronSet,
  ]),
});
const NamedPath = z.object({
  name: z.string(),
  path: z.string(),
  type: z.string().optional().default('NamedPath'),
});
const obi_one__scientific__tasks__basic_connectivity_plots__BasicConnectivityPlotsScanConfig__Initialize =
  z.object({
    type: z.string().optional().default('BasicConnectivityPlotsScanConfig.Initialize'),
    matrix_path: z.union([NamedPath, z.array(NamedPath)]),
    plot_formats: z.array(z.string()).optional().default(['png', 'pdf', 'svg']),
    plot_types: z
      .array(z.string())
      .optional()
      .default([
        'nodes',
        'connectivity_global',
        'connectivity_pathway',
        'small_adj_and_stats',
        'network_in_2D',
        'property_table',
      ]),
    rendering_cmap: z.union([z.string(), z.null()]).optional(),
    rendering_color_file: z.union([z.string(), z.null()]).optional(),
    dpi: z.number().int().optional().default(300),
  });
const BasicConnectivityPlotsScanConfig = z.object({
  type: z.string().optional().default('BasicConnectivityPlotsScanConfig'),
  initialize:
    obi_one__scientific__tasks__basic_connectivity_plots__BasicConnectivityPlotsScanConfig__Initialize,
});
const obi_one__scientific__tasks__connectivity_matrix_extraction__ConnectivityMatrixExtractionScanConfig__Initialize =
  z.object({
    type: z.string().optional().default('ConnectivityMatrixExtractionScanConfig.Initialize'),
    circuit: z.union([Circuit, z.array(Circuit)]),
    edge_population: z
      .union([z.string(), z.array(z.union([z.string(), z.null()])), z.null()])
      .optional(),
    node_attributes: z
      .union([z.array(z.string()), z.array(z.union([z.array(z.string()), z.null()])), z.null()])
      .optional(),
  });
const ConnectivityMatrixExtractionScanConfig = z.object({
  type: z.string().optional().default('ConnectivityMatrixExtractionScanConfig'),
  initialize:
    obi_one__scientific__tasks__connectivity_matrix_extraction__ConnectivityMatrixExtractionScanConfig__Initialize,
});
const Assets = z
  .object({
    type: z.string().default('Assets'),
    swc_file: z.union([z.string(), z.null()]),
    asc_file: z.union([z.string(), z.null()]),
    h5_file: z.union([z.string(), z.null()]),
  })
  .partial();
const Contribution = z
  .object({ agent_id: z.union([z.string(), z.null()]), role_id: z.union([z.string(), z.null()]) })
  .partial()
  .passthrough();
const CellMorphology = z.object({
  type: z.string().optional().default('CellMorphology'),
  name: z.string(),
  description: z.string(),
  species_id: z.union([z.string(), z.null()]).optional(),
  strain_id: z.union([z.string(), z.null()]).optional(),
  brain_region_id: z.union([z.string(), z.null()]).optional(),
});
const Author = z
  .object({
    given_name: z.union([z.string(), z.null()]),
    family_name: z.union([z.string(), z.null()]),
  })
  .partial()
  .passthrough();
const Publication = z
  .object({
    type: z.string().default('Publication'),
    name: z.string().default(''),
    description: z.string().default(''),
    DOI: z.union([z.string(), z.null()]).default(''),
    publication_title: z.union([z.string(), z.null()]).default(''),
    authors: z.union([Author, z.null()]),
    publication_year: z.union([z.number(), z.null()]),
    abstract: z.union([z.string(), z.null()]).default(''),
  })
  .partial();
const SubjectID = z
  .object({ type: z.string().default('SubjectID'), subject_id: z.union([z.string(), z.null()]) })
  .partial();
const License = z
  .object({ type: z.string().default('License'), license_id: z.union([z.string(), z.null()]) })
  .partial();
const ScientificArtifact = z
  .object({
    type: z.string().default('ScientificArtifact'),
    experiment_date: z.union([z.string(), z.null()]),
    contact_email: z.union([z.string(), z.null()]),
    atlas_id: z.union([z.string(), z.null()]),
  })
  .partial();
const MTypeClassification = z
  .object({
    type: z.string().default('MTypeClassification'),
    mtype_class_id: z.union([z.string(), z.null()]),
  })
  .partial();
const ContributeMorphologyScanConfig = z
  .object({
    type: z.string().default('ContributeMorphologyScanConfig'),
    assets: Assets,
    contribution: Contribution,
    morphology: CellMorphology,
    publication: Publication,
    subject: SubjectID,
    license: License,
    scientificartifact: ScientificArtifact,
    mtype: MTypeClassification,
  })
  .partial();
const obi_one__scientific__tasks__folder_compression__FolderCompressionScanConfig__Initialize =
  z.object({
    type: z.string().optional().default('FolderCompressionScanConfig.Initialize'),
    folder_path: z.union([NamedPath, z.array(NamedPath)]),
    file_format: z
      .union([z.string(), z.array(z.union([z.string(), z.null()])), z.null()])
      .optional()
      .default('gz'),
    file_name: z
      .union([z.string(), z.array(z.union([z.string(), z.null()])), z.null()])
      .optional()
      .default('compressed'),
  });
const FolderCompressionScanConfig = z.object({
  type: z.string().optional().default('FolderCompressionScanConfig'),
  initialize:
    obi_one__scientific__tasks__folder_compression__FolderCompressionScanConfig__Initialize,
});
const MEModelCircuit = z.object({
  name: z.string(),
  path: z.string(),
  matrix_path: z.union([z.string(), z.null()]).optional(),
  type: z.string().optional().default('MEModelCircuit'),
});
const MEModelFromID = z.object({
  id_str: z.string(),
  type: z.string().optional().default('MEModelFromID'),
});
const obi_one__scientific__tasks__generate_simulation_configs__MEModelSimulationScanConfig__Initialize =
  z.object({
    type: z.string().optional().default('MEModelSimulationScanConfig.Initialize'),
    circuit: z.union([
      z.discriminatedUnion('type', [MEModelCircuit, MEModelFromID]),
      z.array(z.discriminatedUnion('type', [MEModelCircuit, MEModelFromID])),
    ]),
    simulation_length: z
      .union([z.number(), z.array(z.number().gte(1).lte(5000))])
      .optional()
      .default(1000),
    extracellular_calcium_concentration: z
      .union([z.number(), z.array(z.number().gte(0))])
      .optional()
      .default(1.1),
    v_init: z
      .union([z.number(), z.array(z.number())])
      .optional()
      .default(-80),
    random_seed: z
      .union([z.number(), z.array(z.number().int())])
      .optional()
      .default(1),
  });
const MEModelSimulationScanConfig = z.object({
  type: z.string().optional().default('MEModelSimulationScanConfig'),
  timestamps: z
    .record(z.discriminatedUnion('type', [SingleTimestamp, RegularTimestamps]))
    .optional(),
  recordings: z
    .record(z.discriminatedUnion('type', [SomaVoltageRecording, TimeWindowSomaVoltageRecording]))
    .optional(),
  info: Info,
  initialize:
    obi_one__scientific__tasks__generate_simulation_configs__MEModelSimulationScanConfig__Initialize,
  stimuli: z
    .record(
      z.discriminatedUnion('type', [
        ConstantCurrentClampSomaticStimulus,
        HyperpolarizingCurrentClampSomaticStimulus,
        LinearCurrentClampSomaticStimulus,
        MultiPulseCurrentClampSomaticStimulus,
        NormallyDistributedCurrentClampSomaticStimulus,
        RelativeNormallyDistributedCurrentClampSomaticStimulus,
        RelativeConstantCurrentClampSomaticStimulus,
        RelativeLinearCurrentClampSomaticStimulus,
        SinusoidalCurrentClampSomaticStimulus,
        SubthresholdCurrentClampSomaticStimulus,
        OrnsteinUhlenbeckCurrentSomaticStimulus,
        OrnsteinUhlenbeckConductanceSomaticStimulus,
        RelativeOrnsteinUhlenbeckCurrentSomaticStimulus,
      ])
    )
    .optional(),
});
const obi_one__scientific__tasks__morphology_containerization__MorphologyContainerizationScanConfig__Initialize =
  z.object({
    type: z.string().optional().default('MorphologyContainerizationScanConfig.Initialize'),
    circuit: z.union([Circuit, z.array(Circuit)]),
    hoc_template_old: z.string(),
    hoc_template_new: z.string(),
  });
const MorphologyContainerizationScanConfig = z.object({
  type: z.string().optional().default('MorphologyContainerizationScanConfig'),
  initialize:
    obi_one__scientific__tasks__morphology_containerization__MorphologyContainerizationScanConfig__Initialize,
});
const AmplitudeInput = z
  .object({
    min_value: z.union([z.number(), z.null()]),
    max_value: z.union([z.number(), z.null()]),
  })
  .partial()
  .passthrough();
const obi_one__scientific__tasks__ephys_extraction__ElectrophysiologyMetricsScanConfig__Initialize =
  z.object({
    type: z.string().optional().default('ElectrophysiologyMetricsScanConfig.Initialize'),
    trace_id: z.string(),
    protocols: z
      .union([
        z.array(
          z.enum([
            'spontaneous',
            'idrest',
            'idthreshold',
            'apwaveform',
            'iv',
            'step',
            'sponaps',
            'firepattern',
            'spontaneousnohold',
            'starthold',
            'startnohold',
            'delta',
            'sahp',
            'idhyperpol',
            'irdepol',
            'irhyperpol',
            'iddepol',
            'apthreshold',
            'hyperdepol',
            'negcheops',
            'poscheops',
            'spikerec',
            'sinespec',
            'genericstep',
          ])
        ),
        z.null(),
      ])
      .optional(),
    requested_metrics: z
      .union([
        z.array(
          z.enum([
            'spike_count',
            'time_to_first_spike',
            'time_to_last_spike',
            'inv_time_to_first_spike',
            'doublet_ISI',
            'inv_first_ISI',
            'ISI_log_slope',
            'ISI_CV',
            'irregularity_index',
            'adaptation_index',
            'mean_frequency',
            'strict_burst_number',
            'strict_burst_mean_freq',
            'spikes_per_burst',
            'AP_height',
            'AP_amplitude',
            'AP1_amp',
            'APlast_amp',
            'AP_duration_half_width',
            'AHP_depth',
            'AHP_time_from_peak',
            'AP_peak_upstroke',
            'AP_peak_downstroke',
            'voltage_base',
            'voltage_after_stim',
            'ohmic_input_resistance_vb_ssse',
            'steady_state_voltage_stimend',
            'sag_amplitude',
            'decay_time_constant_after_stim',
            'depol_block_bool',
          ])
        ),
        z.null(),
      ])
      .optional(),
    amplitude: z.union([AmplitudeInput, z.null()]).optional(),
  });
const ElectrophysiologyMetricsScanConfig = z.object({
  type: z.string().optional().default('ElectrophysiologyMetricsScanConfig'),
  initialize:
    obi_one__scientific__tasks__ephys_extraction__ElectrophysiologyMetricsScanConfig__Initialize,
});
const obi_one__scientific__tasks__morphology_decontainerization__MorphologyDecontainerizationScanConfig__Initialize =
  z.object({
    type: z.string().optional().default('MorphologyDecontainerizationScanConfig.Initialize'),
    circuit: z.union([Circuit, z.array(Circuit)]),
    output_format: z
      .union([z.enum(['h5', 'asc', 'swc']), z.array(z.enum(['h5', 'asc', 'swc']))])
      .optional()
      .default('h5'),
  });
const MorphologyDecontainerizationScanConfig = z.object({
  type: z.string().optional().default('MorphologyDecontainerizationScanConfig'),
  initialize:
    obi_one__scientific__tasks__morphology_decontainerization__MorphologyDecontainerizationScanConfig__Initialize,
});
const CellMorphologyFromID = z.object({
  id_str: z.string(),
  type: z.string().optional().default('CellMorphologyFromID'),
});
const Initialize = z.object({
  type: z.string().optional().default('MorphologyMetricsScanConfig.Initialize'),
  morphology: z.union([CellMorphologyFromID, z.array(CellMorphologyFromID)]),
});
const MorphologyMetricsScanConfig = z.object({
  type: z.string().optional().default('MorphologyMetricsScanConfig'),
  initialize: Initialize,
});
const obi_one__scientific__tasks__morphology_locations__MorphologyLocationsScanConfig__Initialize =
  z.object({
    type: z.string().optional().default('MorphologyLocationsScanConfig.Initialize'),
    morphology: z.union([
      CellMorphologyFromID,
      z.array(CellMorphologyFromID),
      z.string(),
      z.array(z.string()),
    ]),
  });
const ClusteredGroupedMorphologyLocations = z.object({
  type: z.string().optional().default('ClusteredGroupedMorphologyLocations'),
  random_seed: z
    .union([z.number(), z.array(z.number().int())])
    .optional()
    .default(0),
  number_of_locations: z
    .union([z.number(), z.array(z.number().int())])
    .optional()
    .default(1),
  section_types: z
    .union([z.array(z.number().int()), z.array(z.array(z.number().int())), z.null()])
    .optional(),
  n_groups: z
    .union([z.number(), z.array(z.number().int())])
    .optional()
    .default(1),
  n_clusters: z.union([z.number(), z.array(z.number().int())]),
  cluster_max_distance: z.union([z.number(), z.array(z.number())]),
});
const ClusteredMorphologyLocations = z.object({
  type: z.string().optional().default('ClusteredMorphologyLocations'),
  random_seed: z
    .union([z.number(), z.array(z.number().int())])
    .optional()
    .default(0),
  number_of_locations: z
    .union([z.number(), z.array(z.number().int())])
    .optional()
    .default(1),
  section_types: z
    .union([z.array(z.number().int()), z.array(z.array(z.number().int())), z.null()])
    .optional(),
  n_clusters: z.union([z.number(), z.array(z.number().int())]),
  cluster_max_distance: z.union([z.number(), z.array(z.number())]),
});
const ClusteredPathDistanceMorphologyLocations = z.object({
  type: z.string().optional().default('ClusteredPathDistanceMorphologyLocations'),
  random_seed: z
    .union([z.number(), z.array(z.number().int())])
    .optional()
    .default(0),
  number_of_locations: z
    .union([z.number(), z.array(z.number().int())])
    .optional()
    .default(1),
  section_types: z
    .union([z.array(z.number().int()), z.array(z.array(z.number().int())), z.null()])
    .optional(),
  n_clusters: z.union([z.number(), z.array(z.number().int())]),
  cluster_max_distance: z.union([z.number(), z.array(z.number())]),
  path_dist_mean: z.union([z.number(), z.array(z.number())]),
  path_dist_sd: z.union([z.number(), z.array(z.number())]),
  n_groups_per_cluster: z
    .union([z.number(), z.array(z.number().int())])
    .optional()
    .default(1),
});
const PathDistanceMorphologyLocations = z.object({
  type: z.string().optional().default('PathDistanceMorphologyLocations'),
  random_seed: z
    .union([z.number(), z.array(z.number().int())])
    .optional()
    .default(0),
  number_of_locations: z
    .union([z.number(), z.array(z.number().int())])
    .optional()
    .default(1),
  section_types: z
    .union([z.array(z.number().int()), z.array(z.array(z.number().int())), z.null()])
    .optional(),
  path_dist_mean: z.union([z.number(), z.array(z.number())]),
  path_dist_tolerance: z.union([z.number(), z.array(z.number())]),
});
const RandomGroupedMorphologyLocations = z
  .object({
    type: z.string().default('RandomGroupedMorphologyLocations'),
    random_seed: z.union([z.number(), z.array(z.number().int())]).default(0),
    number_of_locations: z.union([z.number(), z.array(z.number().int())]).default(1),
    section_types: z.union([
      z.array(z.number().int()),
      z.array(z.array(z.number().int())),
      z.null(),
    ]),
    n_groups: z.union([z.number(), z.array(z.number().int())]).default(1),
  })
  .partial();
const RandomMorphologyLocations = z
  .object({
    type: z.string().default('RandomMorphologyLocations'),
    random_seed: z.union([z.number(), z.array(z.number().int())]).default(0),
    number_of_locations: z.union([z.number(), z.array(z.number().int())]).default(1),
    section_types: z.union([
      z.array(z.number().int()),
      z.array(z.array(z.number().int())),
      z.null(),
    ]),
  })
  .partial();
const MorphologyLocationsScanConfig = z.object({
  type: z.string().optional().default('MorphologyLocationsScanConfig'),
  initialize:
    obi_one__scientific__tasks__morphology_locations__MorphologyLocationsScanConfig__Initialize,
  morph_locations: z.discriminatedUnion('type', [
    ClusteredGroupedMorphologyLocations,
    ClusteredMorphologyLocations,
    ClusteredPathDistanceMorphologyLocations,
    PathDistanceMorphologyLocations,
    RandomGroupedMorphologyLocations,
    RandomMorphologyLocations,
  ]),
});
const IonChannelRecordingFromID = z.object({
  id_str: z.string(),
  type: z.string().optional().default('IonChannelRecordingFromID'),
});
const obi_one__scientific__tasks__ion_channel_modeling__IonChannelFittingScanConfig__Initialize =
  z.object({
    type: z.string().optional().default('IonChannelFittingScanConfig.Initialize'),
    recordings: IonChannelRecordingFromID,
    ion_channel_name: z
      .string()
      .min(1)
      .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
      .optional()
      .default('DefaultIonChannelName'),
  });
const SigFitMInf = z.object({ type: z.string().default('SigFitMInf') }).partial();
const SigFitMTau = z.object({ type: z.string().default('SigFitMTau') }).partial();
const ThermoFitMTau = z.object({ type: z.string().default('ThermoFitMTau') }).partial();
const ThermoFitMTauV2 = z.object({ type: z.string().default('ThermoFitMTauV2') }).partial();
const BellFitMTau = z.object({ type: z.string().default('BellFitMTau') }).partial();
const SigFitHInf = z.object({ type: z.string().default('SigFitHInf') }).partial();
const SigFitHTau = z.object({ type: z.string().default('SigFitHTau') }).partial();
const GateExponents = z
  .object({
    type: z.string().default('IonChannelFittingScanConfig.GateExponents'),
    m_power: z.number().int().gte(1).lte(4).default(1),
    h_power: z.number().int().gte(0).lte(4).default(1),
  })
  .partial();
const IonChannelFittingScanConfig = z.object({
  type: z.string().optional().default('IonChannelFittingScanConfig'),
  initialize:
    obi_one__scientific__tasks__ion_channel_modeling__IonChannelFittingScanConfig__Initialize,
  info: Info,
  minf_eq: z.union([SigFitMInf, z.null()]),
  mtau_eq: z.discriminatedUnion('type', [SigFitMTau, ThermoFitMTau, ThermoFitMTauV2, BellFitMTau]),
  hinf_eq: z.union([SigFitHInf, z.null()]),
  htau_eq: z.union([SigFitHTau, z.null()]),
  gate_exponents: GateExponents,
});
const EMCellMeshFromID = z.object({
  id_str: z.string(),
  type: z.string().optional().default('EMCellMeshFromID'),
});
const obi_one__scientific__tasks__skeletonization__SkeletonizationScanConfig__Initialize = z.object(
  {
    type: z.string().optional().default('SkeletonizationScanConfig.Initialize'),
    cell_mesh: z.union([EMCellMeshFromID, z.array(EMCellMeshFromID)]),
    neuron_voxel_size: z
      .union([z.number(), z.array(z.number().gte(0.1).lte(0.5))])
      .optional()
      .default(0.1),
    spines_voxel_size: z
      .union([z.number(), z.array(z.number().gte(0.1).lte(0.5))])
      .optional()
      .default(0.1),
  }
);
const SkeletonizationScanConfig = z.object({
  type: z.string().optional().default('SkeletonizationScanConfig'),
  info: Info,
  initialize: obi_one__scientific__tasks__skeletonization__SkeletonizationScanConfig__Initialize,
});
const MEModelWithSynapsesCircuit = z.object({
  name: z.string(),
  path: z.string(),
  matrix_path: z.union([z.string(), z.null()]).optional(),
  type: z.string().optional().default('MEModelWithSynapsesCircuit'),
});
const MEModelWithSynapsesCircuitFromID = z.object({
  id_str: z.string(),
  type: z.string().optional().default('MEModelWithSynapsesCircuitFromID'),
});
const obi_one__scientific__tasks__generate_simulation_configs__MEModelWithSynapsesCircuitSimulationScanConfig__Initialize =
  z.object({
    type: z
      .string()
      .optional()
      .default('MEModelWithSynapsesCircuitSimulationScanConfig.Initialize'),
    circuit: z.union([
      z.discriminatedUnion('type', [MEModelWithSynapsesCircuit, MEModelWithSynapsesCircuitFromID]),
      z.array(
        z.discriminatedUnion('type', [MEModelWithSynapsesCircuit, MEModelWithSynapsesCircuitFromID])
      ),
    ]),
    simulation_length: z
      .union([z.number(), z.array(z.number().gte(1).lte(5000))])
      .optional()
      .default(1000),
    extracellular_calcium_concentration: z
      .union([z.number(), z.array(z.number().gte(0))])
      .optional()
      .default(1.1),
    v_init: z
      .union([z.number(), z.array(z.number())])
      .optional()
      .default(-80),
    random_seed: z
      .union([z.number(), z.array(z.number().int())])
      .optional()
      .default(1),
  });
const MEModelWithSynapsesCircuitSimulationScanConfig = z.object({
  type: z.string().optional().default('MEModelWithSynapsesCircuitSimulationScanConfig'),
  timestamps: z
    .record(z.discriminatedUnion('type', [SingleTimestamp, RegularTimestamps]))
    .optional(),
  recordings: z
    .record(z.discriminatedUnion('type', [SomaVoltageRecording, TimeWindowSomaVoltageRecording]))
    .optional(),
  info: Info,
  neuron_sets: z.record(z.discriminatedUnion('type', [nbS1VPMInputs, nbS1POmInputs])).optional(),
  synaptic_manipulations: z
    .record(
      z.discriminatedUnion('type', [
        SynapticMgManipulation,
        ScaleAcetylcholineUSESynapticManipulation,
      ])
    )
    .optional(),
  initialize:
    obi_one__scientific__tasks__generate_simulation_configs__MEModelWithSynapsesCircuitSimulationScanConfig__Initialize,
  stimuli: z
    .record(
      z.discriminatedUnion('type', [
        ConstantCurrentClampSomaticStimulus,
        HyperpolarizingCurrentClampSomaticStimulus,
        LinearCurrentClampSomaticStimulus,
        MultiPulseCurrentClampSomaticStimulus,
        NormallyDistributedCurrentClampSomaticStimulus,
        RelativeNormallyDistributedCurrentClampSomaticStimulus,
        RelativeConstantCurrentClampSomaticStimulus,
        RelativeLinearCurrentClampSomaticStimulus,
        SinusoidalCurrentClampSomaticStimulus,
        SubthresholdCurrentClampSomaticStimulus,
        OrnsteinUhlenbeckCurrentSomaticStimulus,
        OrnsteinUhlenbeckConductanceSomaticStimulus,
        RelativeOrnsteinUhlenbeckCurrentSomaticStimulus,
        PoissonSpikeStimulus,
        FullySynchronousSpikeStimulus,
        SinusoidalPoissonSpikeStimulus,
      ])
    )
    .optional(),
});
const grid_scan_parameters_count_endpoint_declared_scan_config_grid_scan_coordinate_count_post_Body =
  z.discriminatedUnion('type', [
    CircuitSimulationScanConfig,
    SimulationsForm,
    CircuitExtractionScanConfig,
    BasicConnectivityPlotsScanConfig,
    ConnectivityMatrixExtractionScanConfig,
    ContributeMorphologyScanConfig,
    FolderCompressionScanConfig,
    MEModelSimulationScanConfig,
    MorphologyContainerizationScanConfig,
    ElectrophysiologyMetricsScanConfig,
    MorphologyDecontainerizationScanConfig,
    MorphologyMetricsScanConfig,
    MorphologyLocationsScanConfig,
    IonChannelFittingScanConfig,
    SkeletonizationScanConfig,
    MEModelWithSynapsesCircuitSimulationScanConfig,
  ]);
const requested_metrics = z
  .union([
    z.array(
      z.enum([
        'spike_count',
        'time_to_first_spike',
        'time_to_last_spike',
        'inv_time_to_first_spike',
        'doublet_ISI',
        'inv_first_ISI',
        'ISI_log_slope',
        'ISI_CV',
        'irregularity_index',
        'adaptation_index',
        'mean_frequency',
        'strict_burst_number',
        'strict_burst_mean_freq',
        'spikes_per_burst',
        'AP_height',
        'AP_amplitude',
        'AP1_amp',
        'APlast_amp',
        'AP_duration_half_width',
        'AHP_depth',
        'AHP_time_from_peak',
        'AP_peak_upstroke',
        'AP_peak_downstroke',
        'voltage_base',
        'voltage_after_stim',
        'ohmic_input_resistance_vb_ssse',
        'steady_state_voltage_stimend',
        'sag_amplitude',
        'decay_time_constant_after_stim',
        'depol_block_bool',
      ])
    ),
    z.null(),
  ])
  .optional();
const protocols = z
  .union([
    z.array(
      z.enum([
        'spontaneous',
        'idrest',
        'idthreshold',
        'apwaveform',
        'iv',
        'step',
        'sponaps',
        'firepattern',
        'spontaneousnohold',
        'starthold',
        'startnohold',
        'delta',
        'sahp',
        'idhyperpol',
        'irdepol',
        'irhyperpol',
        'iddepol',
        'apthreshold',
        'hyperdepol',
        'negcheops',
        'poscheops',
        'spikerec',
        'sinespec',
        'genericstep',
      ])
    ),
    z.null(),
  ])
  .optional();
const min_value = z.union([z.number(), z.null()]).optional();
const ElectrophysiologyMetricsOutput = z
  .object({ feature_dict: z.record(z.object({}).partial().passthrough()) })
  .passthrough();
const Body_validate_mesh_file_declared_test_mesh_file_post = z
  .object({ file: z.instanceof(File) })
  .passthrough();
const ValidationStatus = z.enum(['success', 'failure']);
const MESHValidationResponse = z
  .object({ status: ValidationStatus, message: z.string() })
  .passthrough();
const requested_metrics__2 = z
  .union([
    z.array(
      z.enum([
        'aspect_ratio',
        'circularity',
        'length_fraction_above_soma',
        'max_radial_distance',
        'number_of_neurites',
        'soma_radius',
        'soma_surface_area',
        'total_length',
        'total_height',
        'total_width',
        'total_depth',
        'total_area',
        'total_volume',
        'section_lengths',
        'segment_radii',
        'number_of_sections',
        'local_bifurcation_angles',
        'remote_bifurcation_angles',
        'section_path_distances',
        'section_radial_distances',
        'section_branch_orders',
        'section_strahler_orders',
      ])
    ),
    z.null(),
  ])
  .optional();
const MorphologyMetricsOutput = z
  .object({
    aspect_ratio: z.union([z.number(), z.null()]),
    circularity: z.union([z.number(), z.null()]),
    length_fraction_above_soma: z.union([z.number(), z.null()]),
    max_radial_distance: z.union([z.number(), z.null()]),
    number_of_neurites: z.union([z.number(), z.null()]),
    soma_radius: z.union([z.number(), z.null()]),
    soma_surface_area: z.union([z.number(), z.null()]),
    total_length: z.union([z.number(), z.null()]),
    total_height: z.union([z.number(), z.null()]),
    total_depth: z.union([z.number(), z.null()]),
    total_area: z.union([z.number(), z.null()]),
    total_volume: z.union([z.number(), z.null()]),
    section_lengths: z.union([z.array(z.number()), z.null()]),
    segment_radii: z.union([z.array(z.number()), z.null()]),
    number_of_sections: z.union([z.number(), z.null()]),
    local_bifurcation_angles: z.union([z.array(z.number()), z.null()]),
    remote_bifurcation_angles: z.union([z.array(z.number()), z.null()]),
    section_path_distances: z.union([z.array(z.number()), z.null()]),
    section_radial_distances: z.union([z.array(z.number()), z.null()]),
    section_branch_orders: z.union([z.array(z.number()), z.null()]),
    section_strahler_orders: z.union([z.array(z.number()), z.null()]),
  })
  .partial()
  .passthrough();
const Body_test_neuron_file_declared_test_neuron_file_post = z
  .object({ file: z.instanceof(File) })
  .passthrough();
const Body_morphology_metrics_calculation_declared_register_morphology_with_calculated_metrics_post =
  z
    .object({ file: z.instanceof(File), metadata: z.string().optional().default('{}') })
    .passthrough();
const IntRange = z.object({
  type: z.string().optional().default('IntRange'),
  start: z.number().int(),
  step: z.number().int().gt(0),
  end: z.number().int(),
});
const PositiveIntRange = z.object({
  type: z.string().optional().default('PositiveIntRange'),
  start: z.number().int().gt(0),
  step: z.number().int().gt(0),
  end: z.number().int().gt(0),
});
const NonNegativeIntRange = z.object({
  type: z.string().optional().default('NonNegativeIntRange'),
  start: z.number().int().gte(0),
  step: z.number().int().gt(0),
  end: z.number().int().gte(0),
});
const PositiveFloatRange = z.object({
  type: z.string().optional().default('PositiveFloatRange'),
  start: z.number().gt(0),
  step: z.number().gt(0),
  end: z.number().gt(0),
});
const parametric_multi_value_endpoint_declared_parametric_multi_value_post_Body =
  z.discriminatedUnion('type', [
    IntRange,
    PositiveIntRange,
    NonNegativeIntRange,
    FloatRange,
    PositiveFloatRange,
    NonNegativeFloatRange,
  ]);
const ge = z.union([z.number(), z.number(), z.null()]).optional();
const Body_validate_nwb_file_declared_validate_electrophysiology_protocol_nwb_file_post = z
  .object({ file: z.instanceof(File) })
  .passthrough();
const NWBValidationResponse = z.object({ status: z.string(), message: z.string() }).passthrough();
const Sex = z.enum(['male', 'female', 'unknown']);
const AgePeriod = z.enum(['prenatal', 'postnatal', 'unknown']);
const Subject = z.object({
  type: z.string().optional().default('Subject'),
  name: z.string(),
  description: z.string(),
  sex: Sex.optional(),
  weight: z.union([z.number(), z.null()]).optional(),
  age_value: z.string(),
  age_min: z.union([z.string(), z.null()]).optional(),
  age_max: z.union([z.string(), z.null()]).optional(),
  age_period: z.union([AgePeriod, z.null()]).optional().default('unknown'),
  species_id: z.string().uuid(),
  strain_id: z.union([z.string(), z.null()]).optional(),
});
const ContributeSubjectScanConfig = z
  .object({ type: z.string().default('ContributeSubjectScanConfig'), subject: Subject })
  .partial();
const TaskType = z.enum(['circuit_extraction', 'circuit_simulation']);
const TaskLaunchCreate = z
  .object({ task_type: TaskType, config_id: z.string().uuid() })
  .passthrough();
const TaskEstimateCreate = z
  .object({ task_type: TaskType, config_id: z.string().uuid() })
  .passthrough();
const CircuitStatsLevelOfDetail = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);
const DegreeTypes = z.enum(['indegree', 'outdegree', 'totaldegree', 'degreedifference']);
const SpatialCoordinate = z.enum(['x', 'y', 'z']);

export const schemas = {
  ConnectivityMetricsRequest,
  virtual_lab_id,
  ConnectivityMetricsOutput,
  ValidationError,
  HTTPValidationError,
  NodePopulationType,
  CircuitMetricsNodePopulation,
  EdgePopulationType,
  CircuitMetricsEdgePopulation,
  CircuitMetricsOutput,
  CircuitPopulationsResponse,
  CircuitNodesetsResponse,
  SingleTimestamp,
  RegularTimestamps,
  NeuronSetReference,
  NonNegativeFloatRange,
  SomaVoltageRecording,
  TimeWindowSomaVoltageRecording,
  Info,
  NamedTuple,
  IDNeuronSet,
  AllNeurons,
  ExcitatoryNeurons,
  InhibitoryNeurons,
  PredefinedNeuronSet,
  nbS1VPMInputs,
  nbS1POmInputs,
  SynapticMgManipulation,
  ScaleAcetylcholineUSESynapticManipulation,
  Circuit,
  CircuitFromID,
  obi_one__scientific__tasks__generate_simulation_configs__CircuitSimulationScanConfig__Initialize,
  TimestampsReference,
  FloatRange,
  ConstantCurrentClampSomaticStimulus,
  HyperpolarizingCurrentClampSomaticStimulus,
  LinearCurrentClampSomaticStimulus,
  MultiPulseCurrentClampSomaticStimulus,
  NormallyDistributedCurrentClampSomaticStimulus,
  RelativeNormallyDistributedCurrentClampSomaticStimulus,
  RelativeConstantCurrentClampSomaticStimulus,
  RelativeLinearCurrentClampSomaticStimulus,
  SinusoidalCurrentClampSomaticStimulus,
  SubthresholdCurrentClampSomaticStimulus,
  OrnsteinUhlenbeckCurrentSomaticStimulus,
  OrnsteinUhlenbeckConductanceSomaticStimulus,
  RelativeOrnsteinUhlenbeckCurrentSomaticStimulus,
  PoissonSpikeStimulus,
  FullySynchronousSpikeStimulus,
  SinusoidalPoissonSpikeStimulus,
  CircuitSimulationScanConfig,
  obi_one__scientific__unions__aliases__SimulationsForm__Initialize,
  SimulationsForm,
  obi_one__scientific__tasks__circuit_extraction__CircuitExtractionScanConfig__Initialize,
  CircuitExtractionScanConfig,
  NamedPath,
  obi_one__scientific__tasks__basic_connectivity_plots__BasicConnectivityPlotsScanConfig__Initialize,
  BasicConnectivityPlotsScanConfig,
  obi_one__scientific__tasks__connectivity_matrix_extraction__ConnectivityMatrixExtractionScanConfig__Initialize,
  ConnectivityMatrixExtractionScanConfig,
  Assets,
  Contribution,
  CellMorphology,
  Author,
  Publication,
  SubjectID,
  License,
  ScientificArtifact,
  MTypeClassification,
  ContributeMorphologyScanConfig,
  obi_one__scientific__tasks__folder_compression__FolderCompressionScanConfig__Initialize,
  FolderCompressionScanConfig,
  MEModelCircuit,
  MEModelFromID,
  obi_one__scientific__tasks__generate_simulation_configs__MEModelSimulationScanConfig__Initialize,
  MEModelSimulationScanConfig,
  obi_one__scientific__tasks__morphology_containerization__MorphologyContainerizationScanConfig__Initialize,
  MorphologyContainerizationScanConfig,
  AmplitudeInput,
  obi_one__scientific__tasks__ephys_extraction__ElectrophysiologyMetricsScanConfig__Initialize,
  ElectrophysiologyMetricsScanConfig,
  obi_one__scientific__tasks__morphology_decontainerization__MorphologyDecontainerizationScanConfig__Initialize,
  MorphologyDecontainerizationScanConfig,
  CellMorphologyFromID,
  Initialize,
  MorphologyMetricsScanConfig,
  obi_one__scientific__tasks__morphology_locations__MorphologyLocationsScanConfig__Initialize,
  ClusteredGroupedMorphologyLocations,
  ClusteredMorphologyLocations,
  ClusteredPathDistanceMorphologyLocations,
  PathDistanceMorphologyLocations,
  RandomGroupedMorphologyLocations,
  RandomMorphologyLocations,
  MorphologyLocationsScanConfig,
  IonChannelRecordingFromID,
  obi_one__scientific__tasks__ion_channel_modeling__IonChannelFittingScanConfig__Initialize,
  SigFitMInf,
  SigFitMTau,
  ThermoFitMTau,
  ThermoFitMTauV2,
  BellFitMTau,
  SigFitHInf,
  SigFitHTau,
  GateExponents,
  IonChannelFittingScanConfig,
  EMCellMeshFromID,
  obi_one__scientific__tasks__skeletonization__SkeletonizationScanConfig__Initialize,
  SkeletonizationScanConfig,
  MEModelWithSynapsesCircuit,
  MEModelWithSynapsesCircuitFromID,
  obi_one__scientific__tasks__generate_simulation_configs__MEModelWithSynapsesCircuitSimulationScanConfig__Initialize,
  MEModelWithSynapsesCircuitSimulationScanConfig,
  grid_scan_parameters_count_endpoint_declared_scan_config_grid_scan_coordinate_count_post_Body,
  requested_metrics,
  protocols,
  min_value,
  ElectrophysiologyMetricsOutput,
  Body_validate_mesh_file_declared_test_mesh_file_post,
  ValidationStatus,
  MESHValidationResponse,
  requested_metrics__2,
  MorphologyMetricsOutput,
  Body_test_neuron_file_declared_test_neuron_file_post,
  Body_morphology_metrics_calculation_declared_register_morphology_with_calculated_metrics_post,
  IntRange,
  PositiveIntRange,
  NonNegativeIntRange,
  PositiveFloatRange,
  parametric_multi_value_endpoint_declared_parametric_multi_value_post_Body,
  ge,
  Body_validate_nwb_file_declared_validate_electrophysiology_protocol_nwb_file_post,
  NWBValidationResponse,
  Sex,
  AgePeriod,
  Subject,
  ContributeSubjectScanConfig,
  TaskType,
  TaskLaunchCreate,
  TaskEstimateCreate,
  CircuitStatsLevelOfDetail,
  DegreeTypes,
  SpatialCoordinate,
};

const endpoints = makeApi([
  {
    method: 'get',
    path: '/',
    alias: 'root__get',
    description: `Root endpoint.`,
    requestFormat: 'json',
    response: z.object({}).partial().passthrough(),
  },
  {
    method: 'get',
    path: '/declared/circuit-metrics/:circuit_id',
    alias: 'circuit_metrics_endpoint_declared_circuit_metrics__circuit_id__get',
    description: `This calculates circuit metrics`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'circuit_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'level_of_detail_nodes',
        type: 'Query',
        schema: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
      },
      {
        name: 'level_of_detail_edges',
        type: 'Query',
        schema: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: CircuitMetricsOutput,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/declared/circuit/:circuit_id/biophysical_populations',
    alias: 'circuit_populations_endpoint_declared_circuit__circuit_id__biophysical_populations_get',
    description: `This returns the list of biophysical node populations for a given circuit.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'circuit_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: CircuitPopulationsResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/declared/circuit/:circuit_id/nodesets',
    alias: 'circuit_nodesets_endpoint_declared_circuit__circuit_id__nodesets_get',
    description: `This returns the list of nodesets for a given circuit.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'circuit_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: CircuitNodesetsResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/declared/connectivity-metrics',
    alias: 'connectivity_metrics_endpoint_declared_connectivity_metrics_post',
    description: `This calculates connectivity metrics, such as connection probabilities and mean number of synapses per connection between different groups of neurons.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ConnectivityMetricsRequest,
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: ConnectivityMetricsOutput,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/declared/electrophysiologyrecording-metrics/:trace_id',
    alias:
      'electrophysiologyrecording_metrics_endpoint_declared_electrophysiologyrecording_metrics__trace_id__get',
    description: `This calculates electrophysiology traces metrics for a particular recording`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'trace_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'requested_metrics',
        type: 'Query',
        schema: requested_metrics,
      },
      {
        name: 'protocols',
        type: 'Query',
        schema: protocols,
      },
      {
        name: 'min_value',
        type: 'Query',
        schema: min_value,
      },
      {
        name: 'max_value',
        type: 'Query',
        schema: min_value,
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: ElectrophysiologyMetricsOutput,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/declared/estimate',
    alias: 'estimate_endpoint_declared_estimate_post',
    description: `Estimates the cost in credits for launching an obi-one task. Takes the same parameters as /task-launch and returns a cost estimate.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: TaskEstimateCreate,
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: z.object({}).partial().passthrough(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/declared/mapped-circuit-properties/:circuit_id',
    alias: 'mapped_circuit_properties_endpoint_declared_mapped_circuit_properties__circuit_id__get',
    description: `Returns a dictionary of mapped circuit properties.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'circuit_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: z.object({}).partial().passthrough(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/declared/neuron-morphology-metrics/:cell_morphology_id',
    alias:
      'neuron_morphology_metrics_endpoint_declared_neuron_morphology_metrics__cell_morphology_id__get',
    description: `This calculates neuron morphology metrics for a given cell morphology.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'cell_morphology_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'requested_metrics',
        type: 'Query',
        schema: requested_metrics__2,
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: MorphologyMetricsOutput,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/declared/parametric-multi-value',
    alias: 'parametric_multi_value_endpoint_declared_parametric_multi_value_post',
    description: `Temp description.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: parametric_multi_value_endpoint_declared_parametric_multi_value_post_Body,
      },
      {
        name: 'ge',
        type: 'Query',
        schema: ge,
      },
      {
        name: 'gt',
        type: 'Query',
        schema: ge,
      },
      {
        name: 'le',
        type: 'Query',
        schema: ge,
      },
      {
        name: 'lt',
        type: 'Query',
        schema: ge,
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: z.union([z.array(z.number()), z.array(z.number().int())]),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/declared/register-morphology-with-calculated-metrics',
    alias:
      'morphology_metrics_calculation_declared_register_morphology_with_calculated_metrics_post',
    description: `Performs analysis on a neuron file (.swc, .h5, or .asc) and registers the entity, asset, and measurements.`,
    requestFormat: 'form-data',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema:
          Body_morphology_metrics_calculation_declared_register_morphology_with_calculated_metrics_post,
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: z.object({}).partial().passthrough(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/declared/scan_config/grid-scan-coordinate-count',
    alias:
      'grid_scan_parameters_count_endpoint_declared_scan_config_grid_scan_coordinate_count_post',
    description: `This calculates the number of coordinates for a grid scan configuration.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema:
          grid_scan_parameters_count_endpoint_declared_scan_config_grid_scan_coordinate_count_post_Body,
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: z.number().int(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/declared/task-failure',
    alias: 'task_failure_endpoint_declared_task_failure_post',
    description: `Callback endpoint to mark a task execution activity as failed. Used by the launch-system to report task failures.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'execution_activity_id',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'execution_activity_type',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/declared/task-launch',
    alias: 'task_launch_endpoint_declared_task_launch_post',
    description: `Launches an obi-one task as a dedicated job on the launch-system. The type of task is determined based on the config entity provided.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: TaskLaunchCreate,
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: z.union([z.string(), z.null()]),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/declared/test-mesh-file',
    alias: 'validate_mesh_file_declared_test_mesh_file_post',
    description: `Validates an uploaded .obj file using PyVista.`,
    requestFormat: 'form-data',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: z.object({ file: z.instanceof(File) }).passthrough(),
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: MESHValidationResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/declared/test-neuron-file',
    alias: 'test_neuron_file_declared_test_neuron_file_post',
    description: `Tests a neuron file (.swc, .h5, or .asc) with basic validation.`,
    requestFormat: 'form-data',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: z.object({ file: z.instanceof(File) }).passthrough(),
      },
      {
        name: 'single_point_soma',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/declared/validate-electrophysiology-protocol-nwb-file',
    alias: 'validate_nwb_file_declared_validate_electrophysiology_protocol_nwb_file_post',
    description: `Validates an uploaded .nwb file using registered readers.`,
    requestFormat: 'form-data',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: z.object({ file: z.instanceof(File) }).passthrough(),
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: NWBValidationResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/generated/circuit-extraction-scan-config-generate-grid',
    alias: 'endpoint_generated_circuit_extraction_scan_config_generate_grid_post',
    description: `Extracts a sub-circuit from a SONATA circuit as defined by a neuron set. The output circuit will contain all morphologies, hoc files, and mod files that are required to simulate the extracted circuit.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CircuitExtractionScanConfig,
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: z.string(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/generated/circuit-simulation-scan-config-generate-grid',
    alias: 'endpoint_generated_circuit_simulation_scan_config_generate_grid_post',
    description: `SONATA simulation campaign`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CircuitSimulationScanConfig,
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: z.string(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/generated/contribute-morphology-scan-config-generate-grid',
    alias: 'endpoint_generated_contribute_morphology_scan_config_generate_grid_post',
    description: `ScanConfig to contribute a morphology to the OBI.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ContributeMorphologyScanConfig,
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: z.string(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/generated/contribute-subject-scan-config-generate-grid',
    alias: 'endpoint_generated_contribute_subject_scan_config_generate_grid_post',
    description: `ScanConfig to contribute a subject to the OBI.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ContributeSubjectScanConfig,
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: z.string(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/generated/ion-channel-fitting-scan-config-generate-grid',
    alias: 'endpoint_generated_ion_channel_fitting_scan_config_generate_grid_post',
    description: `Models ion channel model from a set of ion channel traces.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: IonChannelFittingScanConfig,
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: z.string(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/generated/me-model-simulation-scan-config-generate-grid',
    alias: 'endpoint_generated_me_model_simulation_scan_config_generate_grid_post',
    description: `SONATA simulation campaign`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: MEModelSimulationScanConfig,
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: z.string(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/generated/me-model-with-synapses-circuit-simulation-scan-config-generate-grid',
    alias:
      'endpoint_generated_me_model_with_synapses_circuit_simulation_scan_config_generate_grid_post',
    description: `SONATA simulation campaign`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: MEModelWithSynapsesCircuitSimulationScanConfig,
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: z.string(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/generated/morphology-metrics-scan-config-run-grid',
    alias: 'endpoint_generated_morphology_metrics_scan_config_run_grid_post',
    description: `Calculates morphology metrics for a given morphologies.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: MorphologyMetricsScanConfig,
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: z.string(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/generated/simulations-generate-grid-save',
    alias: 'endpoint_generated_simulations_generate_grid_save_post',
    description: `SONATA simulation campaign`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SimulationsForm,
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: z.string(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/generated/skeletonization-scan-config-generate-grid',
    alias: 'endpoint_generated_skeletonization_scan_config_generate_grid_post',
    description: `Skeletonization campaign`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SkeletonizationScanConfig,
      },
      {
        name: 'virtual-lab-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
      {
        name: 'project-id',
        type: 'Header',
        schema: virtual_lab_id,
      },
    ],
    response: z.string(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/health',
    alias: 'health_health_get',
    description: `Health endpoint.`,
    requestFormat: 'json',
    response: z.object({}).partial().passthrough(),
  },
  {
    method: 'get',
    path: '/version',
    alias: 'version_version_get',
    description: `Version endpoint.`,
    requestFormat: 'json',
    response: z.object({}).partial().passthrough(),
  },
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
