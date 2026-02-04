import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core';
import { z } from 'zod';

type HierarchyNode = {
  id: string;
  name: string;
  parent_id: (string | null) | Array<string | null>;
  children?: Array<HierarchyNode> | undefined;
  authorized_public: boolean;
  authorized_project_id: string;
};

const ApiErrorCode = z.enum([
  'GENERIC_ERROR',
  'NOT_AUTHENTICATED',
  'NOT_AUTHORIZED',
  'INVALID_REQUEST',
  'ENTITY_NOT_FOUND',
  'ENTITY_FORBIDDEN',
  'ENTITY_DUPLICATED',
  'ASSET_NOT_FOUND',
  'ASSET_DUPLICATED',
  'ASSET_INVALID_FILE',
  'ASSET_MISSING_PATH',
  'ASSET_INVALID_PATH',
  'ASSET_NOT_A_DIRECTORY',
  'ASSET_INVALID_SCHEMA',
  'ASSET_INVALID_CONTENT_TYPE',
  'ION_NAME_NOT_FOUND',
  'S3_CANNOT_CREATE_PRESIGNED_URL',
  'OPENAI_API_KEY_MISSING',
  'OPENAI_API_ERROR',
]);
const ErrorResponse = z
  .object({ error_code: ApiErrorCode, message: z.string(), details: z.unknown().optional() })
  .passthrough();
const virtual_lab_id = z.union([z.string(), z.null()]).optional();
const ContentType = z.enum([
  'application/json',
  'application/swc',
  'application/nrrd',
  'application/obj',
  'application/hoc',
  'application/asc',
  'application/abf',
  'application/nwb',
  'application/x-hdf5',
  'text/plain',
  'application/vnd.directory',
  'application/mod',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'model/gltf-binary',
  'application/gzip',
  'image/webp',
  'application/x-ipynb+json',
  'application/zip',
]);
const AssetLabel = z.enum([
  'morphology',
  'morphology_with_spines',
  'cell_composition_summary',
  'cell_composition_volumes',
  'single_neuron_synaptome_config',
  'single_neuron_synaptome_simulation_data',
  'single_neuron_simulation_data',
  'sonata_circuit',
  'compressed_sonata_circuit',
  'circuit_figures',
  'circuit_analysis_data',
  'circuit_connectivity_matrices',
  'nwb',
  'neuron_hoc',
  'emodel_optimization_output',
  'sonata_simulation_config',
  'simulation_generation_config',
  'ion_channel_modeling_generation_config',
  'custom_node_sets',
  'campaign_generation_config',
  'campaign_summary',
  'replay_spikes',
  'voltage_report',
  'spike_report',
  'neuron_mechanisms',
  'brain_atlas_annotation',
  'brain_atlas_region_mesh',
  'voxel_densities',
  'validation_result_figure',
  'validation_result_details',
  'simulation_designer_image',
  'circuit_visualization',
  'node_stats',
  'network_stats_a',
  'network_stats_b',
  'cell_surface_mesh',
  'jupyter_notebook',
  'requirements',
  'notebook_required_files',
  'ion_channel_model_figure',
  'ion_channel_model_figure_summary_json',
  'ion_channel_model_thumbnail',
  'circuit_extraction_config',
  'skeletonization_config',
]);
const StorageType = z.enum(['aws_s3_internal', 'aws_s3_open']);
const AssetStatus = z.enum(['created', 'deleted']);
const AssetRead = z
  .object({
    size: z.number().int(),
    sha256_digest: z.union([z.string(), z.null()]),
    path: z.string(),
    full_path: z.string(),
    is_directory: z.boolean(),
    content_type: ContentType,
    meta: z.object({}).partial().passthrough().optional().default({}),
    label: AssetLabel,
    storage_type: StorageType,
    id: z.string().uuid(),
    status: AssetStatus,
  })
  .passthrough();
const PaginationResponse = z
  .object({ page: z.number().int(), page_size: z.number().int(), total_items: z.number().int() })
  .passthrough();
const Facet = z
  .object({
    id: z.union([z.string(), z.number()]),
    label: z.string(),
    count: z.number().int(),
    type: z.union([z.string(), z.null()]),
  })
  .passthrough();
const Facets = z.record(z.array(Facet));
const ListResponse_AssetRead_ = z
  .object({
    data: z.array(AssetRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const Body_upload_entity_asset__entity_route___entity_id__assets_post = z
  .object({
    file: z.instanceof(File),
    label: AssetLabel,
    meta: z.union([z.object({}).partial().passthrough(), z.null()]).optional(),
  })
  .passthrough();
const AssetRegister = z
  .object({
    path: z.string(),
    full_path: z.string(),
    is_directory: z.boolean(),
    content_type: ContentType,
    meta: z.object({}).partial().passthrough().optional().default({}),
    label: AssetLabel,
    storage_type: StorageType,
  })
  .passthrough();
const DirectoryUpload = z
  .object({
    directory_name: z.string(),
    files: z.array(z.string()),
    meta: z.union([z.object({}).partial().passthrough(), z.null()]),
    label: AssetLabel,
  })
  .passthrough();
const AssetAndPresignedURLS = z
  .object({ asset: AssetRead, files: z.record(z.string().min(1).url()) })
  .passthrough();
const DetailedFile = z
  .object({
    name: z.string(),
    size: z.number().int(),
    last_modified: z.string().datetime({ offset: true }),
  })
  .passthrough();
const DetailedFileList = z.object({ files: z.record(DetailedFile) }).passthrough();
const authorized_public = z.union([z.boolean(), z.null()]).optional();
const id__in = z.union([z.array(z.string().uuid()), z.null()]).optional();
const contribution__pref_label__in = z.union([z.array(z.string()), z.null()]).optional();
const AgentType = z.enum(['person', 'organization', 'consortium']);
const contribution__type = z.union([AgentType, z.null()]).optional();
const NestedPersonRead = z
  .object({
    id: z.string().uuid(),
    given_name: z.union([z.string(), z.null()]).optional(),
    family_name: z.union([z.string(), z.null()]).optional(),
    pref_label: z.string(),
    type: z.string(),
    sub_id: z.union([z.string(), z.null()]),
  })
  .passthrough();
const EntityType = z.enum([
  'analysis_software_source_code',
  'brain_atlas',
  'brain_atlas_region',
  'cell_composition',
  'cell_morphology',
  'cell_morphology_protocol',
  'electrical_cell_recording',
  'electrical_recording',
  'electrical_recording_stimulus',
  'emodel',
  'experimental_bouton_density',
  'experimental_neuron_density',
  'experimental_synapses_per_connection',
  'external_url',
  'ion_channel_model',
  'ion_channel_modeling_campaign',
  'ion_channel_modeling_config',
  'ion_channel_recording',
  'memodel',
  'memodel_calibration_result',
  'me_type_density',
  'simulation',
  'simulation_campaign',
  'simulation_result',
  'scientific_artifact',
  'single_neuron_simulation',
  'single_neuron_synaptome',
  'single_neuron_synaptome_simulation',
  'subject',
  'validation_result',
  'circuit',
  'circuit_extraction_campaign',
  'circuit_extraction_config',
  'em_dense_reconstruction_dataset',
  'em_cell_mesh',
  'analysis_notebook_template',
  'analysis_notebook_environment',
  'analysis_notebook_result',
  'skeletonization_config',
  'skeletonization_campaign',
]);
const PythonRuntimeInfo = z
  .object({ version: z.string(), implementation: z.string(), executable: z.string() })
  .passthrough();
const DockerRuntimeInfo = z
  .object({
    image_repository: z.string(),
    image_tag: z.string(),
    image_digest: z.union([z.string(), z.null()]).optional(),
    docker_version: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const OsRuntimeInfo = z
  .object({
    system: z.string(),
    release: z.string(),
    version: z.string(),
    machine: z.string(),
    processor: z.string(),
  })
  .passthrough();
const RuntimeInfo = z
  .object({
    schema_version: z.number().int().optional().default(1),
    python: PythonRuntimeInfo,
    docker: z.union([DockerRuntimeInfo, z.null()]).optional(),
    os: z.union([OsRuntimeInfo, z.null()]).optional(),
  })
  .passthrough();
const AnalysisNotebookEnvironmentRead = z
  .object({
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    assets: z.array(AssetRead),
    id: z.string().uuid(),
    type: z.union([EntityType, z.null()]).optional(),
    runtime_info: z.union([RuntimeInfo, z.null()]),
  })
  .passthrough();
const ListResponse_AnalysisNotebookEnvironmentRead_ = z
  .object({
    data: z.array(AnalysisNotebookEnvironmentRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const AnalysisNotebookEnvironmentCreate = z
  .object({
    authorized_public: z.boolean().optional().default(false),
    runtime_info: z.union([RuntimeInfo, z.null()]),
  })
  .passthrough();
const AnalysisNotebookEnvironmentUpdate = z
  .object({ runtime_info: z.union([RuntimeInfo, z.string(), z.null()]).default('<NOT_SET>') })
  .partial()
  .passthrough();
const DeleteResponse = z.object({ id: z.string().uuid() }).passthrough();
const ExecutorType = z.enum(['single_node_job', 'distributed_job', 'jupyter_notebook']);
const executor = z.union([ExecutorType, z.null()]).optional();
const ActivityStatus = z.enum(['created', 'pending', 'running', 'done', 'error', 'cancelled']);
const status = z.union([ActivityStatus, z.null()]).optional();
const used__type = z.union([EntityType, z.null()]).optional();
const ActivityType = z.enum([
  'simulation_execution',
  'simulation_generation',
  'validation',
  'calibration',
  'analysis_notebook_execution',
  'ion_channel_modeling_execution',
  'ion_channel_modeling_config_generation',
  'circuit_extraction_config_generation',
  'circuit_extraction_execution',
  'skeletonization_execution',
  'skeletonization_config_generation',
]);
const NestedEntityRead = z
  .object({
    id: z.string().uuid(),
    type: z.string(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean(),
  })
  .passthrough();
const PythonDependency = z.object({ version: z.string() }).passthrough();
const DockerDependency = z
  .object({
    image_repository: z.string(),
    image_tag: z.union([z.string(), z.null()]).optional(),
    image_digest: z.union([z.string(), z.null()]).optional(),
    docker_version: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const AnalysisNotebookTemplateInputType = z
  .object({
    name: z.string(),
    entity_type: EntityType,
    is_list: z.boolean().optional().default(false),
    count_min: z.number().int().gte(0).optional().default(1),
    count_max: z.union([z.number(), z.null()]).optional().default(1),
  })
  .passthrough();
const AnalysisNotebookTemplateSpecifications_Output = z
  .object({
    schema_version: z.number().int().default(1),
    python: z.union([PythonDependency, z.null()]),
    docker: z.union([DockerDependency, z.null()]),
    inputs: z.array(AnalysisNotebookTemplateInputType).default([]),
  })
  .partial()
  .passthrough();
const AnalysisScale = z.enum(['subcellular', 'cellular', 'circuit', 'system']);
const NestedAnalysisNotebookTemplateRead = z
  .object({
    name: z.string(),
    description: z.string(),
    id: z.string().uuid(),
    type: z.union([EntityType, z.null()]).optional(),
    specifications: z.union([AnalysisNotebookTemplateSpecifications_Output, z.null()]).optional(),
    scale: AnalysisScale,
  })
  .passthrough();
const NestedAnalysisNotebookEnvironmentRead = z
  .object({
    id: z.string().uuid(),
    type: z.union([EntityType, z.null()]).optional(),
    runtime_info: z.union([RuntimeInfo, z.null()]),
  })
  .passthrough();
const AnalysisNotebookExecutionRead = z
  .object({
    executor: z.union([ExecutorType, z.null()]).optional(),
    execution_id: z.union([z.string(), z.null()]).optional(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    id: z.string().uuid(),
    type: z.union([ActivityType, z.null()]).optional(),
    start_time: z.union([z.string(), z.null()]).optional(),
    end_time: z.union([z.string(), z.null()]).optional(),
    status: ActivityStatus.optional(),
    used: z.array(NestedEntityRead),
    generated: z.array(NestedEntityRead),
    analysis_notebook_template: z.union([NestedAnalysisNotebookTemplateRead, z.null()]),
    analysis_notebook_environment: NestedAnalysisNotebookEnvironmentRead,
  })
  .passthrough();
const ListResponse_AnalysisNotebookExecutionRead_ = z
  .object({
    data: z.array(AnalysisNotebookExecutionRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const AnalysisNotebookExecutionCreate = z
  .object({
    executor: z.union([ExecutorType, z.null()]).optional(),
    execution_id: z.union([z.string(), z.null()]).optional(),
    authorized_public: z.boolean().optional().default(false),
    start_time: z.union([z.string(), z.null()]).optional(),
    end_time: z.union([z.string(), z.null()]).optional(),
    status: ActivityStatus.optional(),
    used_ids: z.array(z.string().uuid()).optional().default([]),
    generated_ids: z.array(z.string().uuid()).optional().default([]),
    analysis_notebook_template_id: z.union([z.string(), z.null()]).optional(),
    analysis_notebook_environment_id: z.string().uuid(),
  })
  .passthrough();
const NotSet = z.string();
const AnalysisNotebookExecutionUpdate = z
  .object({
    executor: z.union([ExecutorType, z.null()]),
    execution_id: z.union([z.string(), z.null()]),
    start_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    end_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    generated_ids: z.union([z.array(z.string().uuid()), NotSet, z.null()]).default('<NOT_SET>'),
    status: z.union([ActivityStatus, NotSet, z.null()]).default('<NOT_SET>'),
    analysis_notebook_template_id: z.union([z.string(), z.null()]),
    analysis_notebook_environment_id: z.union([z.string(), z.null()]),
  })
  .partial()
  .passthrough();
const AnalysisNotebookResultRead = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    assets: z.array(AssetRead),
    id: z.string().uuid(),
    type: z.union([EntityType, z.null()]).optional(),
  })
  .passthrough();
const ListResponse_AnalysisNotebookResultRead_ = z
  .object({
    data: z.array(AnalysisNotebookResultRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const AnalysisNotebookResultCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
  })
  .passthrough();
const AnalysisNotebookResultUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const NestedOrganizationRead = z
  .object({
    id: z.string().uuid(),
    pref_label: z.string(),
    alternative_name: z.union([z.string(), z.null()]).optional(),
    type: z.string(),
  })
  .passthrough();
const NestedConsortiumRead = z
  .object({
    id: z.string().uuid(),
    pref_label: z.string(),
    alternative_name: z.union([z.string(), z.null()]).optional(),
    type: z.string(),
  })
  .passthrough();
const AgentRead = z.union([NestedPersonRead, NestedOrganizationRead, NestedConsortiumRead]);
const RoleRead = z
  .object({
    id: z.string().uuid(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    name: z.string(),
    role_id: z.string(),
  })
  .passthrough();
const NestedContributionRead = z
  .object({ id: z.string().uuid(), agent: AgentRead, role: RoleRead })
  .passthrough();
const AnalysisNotebookTemplateRead = z
  .object({
    name: z.string(),
    description: z.string(),
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    assets: z.array(AssetRead),
    id: z.string().uuid(),
    type: z.union([EntityType, z.null()]).optional(),
    specifications: z.union([AnalysisNotebookTemplateSpecifications_Output, z.null()]).optional(),
    scale: AnalysisScale,
  })
  .passthrough();
const ListResponse_AnalysisNotebookTemplateRead_ = z
  .object({
    data: z.array(AnalysisNotebookTemplateRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const AnalysisNotebookTemplateSpecifications_Input = z
  .object({
    schema_version: z.number().int().default(1),
    python: z.union([PythonDependency, z.null()]),
    docker: z.union([DockerDependency, z.null()]),
    inputs: z.array(AnalysisNotebookTemplateInputType).default([]),
  })
  .partial()
  .passthrough();
const AnalysisNotebookTemplateCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    specifications: z.union([AnalysisNotebookTemplateSpecifications_Input, z.null()]).optional(),
    scale: AnalysisScale,
  })
  .passthrough();
const AnalysisNotebookTemplateUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    specifications: z
      .union([AnalysisNotebookTemplateSpecifications_Input, z.string(), z.null()])
      .default('<NOT_SET>'),
    scale: z.union([AnalysisScale, z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const NestedSpeciesRead = z
  .object({ id: z.string().uuid(), name: z.string(), taxonomy_id: z.string() })
  .passthrough();
const BrainAtlasRead = z
  .object({
    name: z.string(),
    description: z.string(),
    assets: z.array(AssetRead),
    id: z.string().uuid(),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    hierarchy_id: z.string().uuid(),
    species: NestedSpeciesRead,
  })
  .passthrough();
const ListResponse_BrainAtlasRead_ = z
  .object({
    data: z.array(BrainAtlasRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const BrainAtlasCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    hierarchy_id: z.string().uuid(),
    species_id: z.string().uuid(),
    strain_id: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const BrainAtlasUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    hierarchy_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    species_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    strain_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const BrainAtlasRegionRead = z
  .object({
    id: z.string().uuid(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    assets: z.array(AssetRead),
    volume: z.union([z.number(), z.null()]),
    is_leaf_region: z.boolean(),
    brain_atlas_id: z.string().uuid(),
    brain_region_id: z.string().uuid(),
  })
  .passthrough();
const ListResponse_BrainAtlasRegionRead_ = z
  .object({
    data: z.array(BrainAtlasRegionRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const BrainAtlasRegionCreate = z
  .object({
    authorized_public: z.boolean().optional().default(false),
    brain_region_id: z.string().uuid(),
    volume: z.union([z.number(), z.null()]),
    is_leaf_region: z.boolean(),
    brain_atlas_id: z.string().uuid(),
  })
  .passthrough();
const BrainAtlasRegionUpdate = z
  .object({
    brain_region_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    volume: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    is_leaf_region: z.union([z.boolean(), z.string(), z.null()]).default('<NOT_SET>'),
    brain_atlas_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const annotation_value = z.union([z.number(), z.null()]).optional();
const NestedStrainRead = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    taxonomy_id: z.string(),
    species_id: z.string().uuid(),
  })
  .passthrough();
const BrainRegionRead = z
  .object({
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
    annotation_value: z.number().int(),
    name: z.string(),
    acronym: z.string(),
    color_hex_triplet: z.string(),
    parent_structure_id: z.union([z.string(), z.null()]).optional(),
    hierarchy_id: z.string().uuid(),
    species: NestedSpeciesRead,
    strain: z.union([NestedStrainRead, z.null()]).optional(),
  })
  .passthrough();
const ListResponse_BrainRegionRead_ = z
  .object({
    data: z.array(BrainRegionRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const BrainRegionCreate = z
  .object({
    annotation_value: z.number().int(),
    name: z.string(),
    acronym: z.string(),
    color_hex_triplet: z.string(),
    parent_structure_id: z.union([z.string(), z.null()]).optional(),
    hierarchy_id: z.string().uuid(),
  })
  .passthrough();
const BrainRegionAdminUpdate = z
  .object({
    annotation_value: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    acronym: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    color_hex_triplet: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    parent_structure_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    hierarchy_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const BrainRegionHierarchyRead = z
  .object({
    id: z.string().uuid(),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    name: z.string(),
    species: NestedSpeciesRead,
    strain: z.union([NestedStrainRead, z.null()]).optional(),
  })
  .passthrough();
const ListResponse_BrainRegionHierarchyRead_ = z
  .object({
    data: z.array(BrainRegionHierarchyRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const BrainRegionHierarchyCreate = z
  .object({
    name: z.string(),
    species_id: z.string().uuid(),
    strain_id: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const BrainRegionHierarchyAdminUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    species_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    strain_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const CalibrationRead = z
  .object({
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    id: z.string().uuid(),
    type: z.union([ActivityType, z.null()]).optional(),
    start_time: z.union([z.string(), z.null()]).optional(),
    end_time: z.union([z.string(), z.null()]).optional(),
    status: ActivityStatus.optional(),
    used: z.array(NestedEntityRead),
    generated: z.array(NestedEntityRead),
  })
  .passthrough();
const ListResponse_CalibrationRead_ = z
  .object({
    data: z.array(CalibrationRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const CalibrationCreate = z
  .object({
    authorized_public: z.boolean().default(false),
    start_time: z.union([z.string(), z.null()]),
    end_time: z.union([z.string(), z.null()]),
    status: ActivityStatus,
    used_ids: z.array(z.string().uuid()).default([]),
    generated_ids: z.array(z.string().uuid()).default([]),
  })
  .partial()
  .passthrough();
const CalibrationUserUpdate = z
  .object({
    start_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    end_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    generated_ids: z.union([z.array(z.string().uuid()), NotSet, z.null()]).default('<NOT_SET>'),
    status: z.union([ActivityStatus, NotSet, z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const CellCompositionRead = z
  .object({
    name: z.string(),
    description: z.string(),
    assets: z.array(AssetRead),
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    type: z.union([EntityType, z.null()]).optional(),
    id: z.string().uuid(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
  })
  .passthrough();
const ListResponse_CellCompositionRead_ = z
  .object({
    data: z.array(CellCompositionRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const StructuralDomain = z.enum([
  'apical_dendrite',
  'basal_dendrite',
  'axon',
  'soma',
  'neuron_morphology',
  'not_applicable',
]);
const measurement_kind__structural_domain = z.union([StructuralDomain, z.null()]).optional();
const MeasurementStatistic = z.enum([
  'mean',
  'median',
  'mode',
  'variance',
  'data_point',
  'sample_size',
  'standard_error',
  'standard_deviation',
  'raw',
  'minimum',
  'maximum',
  'sum',
]);
const measurement_item__name = z.union([MeasurementStatistic, z.null()]).optional();
const MeasurementUnit = z.enum([
  'dimensionless',
  '1/μm',
  '1/μm²',
  '1/mm³',
  'μm',
  'μm²',
  'μm³',
  'radian',
]);
const measurement_item__unit = z.union([MeasurementUnit, z.null()]).optional();
const CellMorphologyGenerationType = z.enum([
  'digital_reconstruction',
  'modified_reconstruction',
  'computationally_synthesized',
  'placeholder',
]);
const cell_morphology_protocol__generation_type = z
  .union([CellMorphologyGenerationType, z.null()])
  .optional();
const cell_morphology_protocol__generation_type__in = z
  .union([z.array(CellMorphologyGenerationType), z.null()])
  .optional();
const WithinBrainRegionDirection = z.enum([
  'ascendants',
  'descendants',
  'ascendants_and_descendants',
]);
const within_brain_region_direction = z.union([WithinBrainRegionDirection, z.null()]).optional();
const LicenseRead = z
  .object({
    name: z.string(),
    description: z.string(),
    id: z.string().uuid(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    label: z.string(),
  })
  .passthrough();
const NestedBrainRegionRead = z
  .object({
    id: z.string().uuid(),
    annotation_value: z.number().int(),
    name: z.string(),
    acronym: z.string(),
    color_hex_triplet: z.string(),
    parent_structure_id: z.union([z.string(), z.null()]).optional(),
    hierarchy_id: z.string().uuid(),
  })
  .passthrough();
const Sex = z.enum(['male', 'female', 'unknown']);
const AgePeriod = z.enum(['prenatal', 'postnatal', 'unknown']);
const NestedSubjectRead = z
  .object({
    name: z.string(),
    description: z.string(),
    id: z.string().uuid(),
    sex: Sex,
    weight: z.union([z.number(), z.null()]).optional(),
    age_value: z.union([z.number(), z.null()]).optional(),
    age_min: z.union([z.number(), z.null()]).optional(),
    age_max: z.union([z.number(), z.null()]).optional(),
    age_period: z.union([AgePeriod, z.null()]).optional(),
    species: NestedSpeciesRead,
    strain: z.union([NestedStrainRead, z.null()]),
  })
  .passthrough();
const PointLocationBase = z.object({ x: z.number(), y: z.number(), z: z.number() }).passthrough();
const RepairPipelineType = z.enum(['raw', 'curated', 'unraveled', 'repaired']);
const AnnotationRead = z
  .object({
    id: z.string().uuid(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    pref_label: z.string(),
    alt_label: z.union([z.string(), z.null()]).optional(),
    definition: z.string(),
  })
  .passthrough();
const CellMorphologyProtocolDesign = z.enum([
  'electron_microscopy',
  'cell_patch',
  'fluorophore',
  'topological_synthesis',
]);
const StainingType = z.enum([
  'golgi',
  'nissl',
  'luxol_fast_blue',
  'fluorescent_nissl',
  'fluorescent_dyes',
  'fluorescent_protein_expression',
  'immunohistochemistry',
  'other',
]);
const SlicingDirectionType = z.enum(['coronal', 'sagittal', 'horizontal', 'custom']);
const NestedDigitalReconstructionCellMorphologyProtocolRead = z
  .object({
    protocol_document: z.union([z.string(), z.null()]).optional(),
    protocol_design: CellMorphologyProtocolDesign,
    name: z.string(),
    description: z.string(),
    id: z.string().uuid(),
    type: z.string().optional().default('cell_morphology_protocol'),
    generation_type: z.string(),
    staining_type: z.union([StainingType, z.null()]).optional(),
    slicing_thickness: z.number().gte(0),
    slicing_direction: z.union([SlicingDirectionType, z.null()]).optional(),
    magnification: z.union([z.number(), z.null()]).optional(),
    tissue_shrinkage: z.union([z.number(), z.null()]).optional(),
    corrected_for_shrinkage: z.union([z.boolean(), z.null()]).optional(),
  })
  .passthrough();
const ModifiedMorphologyMethodType = z.enum(['cloned', 'mix_and_match', 'mousified', 'ratified']);
const NestedModifiedReconstructionCellMorphologyProtocolRead = z
  .object({
    protocol_document: z.union([z.string(), z.null()]).optional(),
    protocol_design: CellMorphologyProtocolDesign,
    name: z.string(),
    description: z.string(),
    id: z.string().uuid(),
    type: z.string().optional().default('cell_morphology_protocol'),
    generation_type: z.string(),
    method_type: ModifiedMorphologyMethodType,
  })
  .passthrough();
const NestedComputationallySynthesizedCellMorphologyProtocolRead = z
  .object({
    protocol_document: z.union([z.string(), z.null()]).optional(),
    protocol_design: CellMorphologyProtocolDesign,
    name: z.string(),
    description: z.string(),
    id: z.string().uuid(),
    type: z.string().optional().default('cell_morphology_protocol'),
    generation_type: z.string(),
    method_type: z.string(),
  })
  .passthrough();
const NestedPlaceholderCellMorphologyProtocolRead = z
  .object({
    name: z.string(),
    description: z.string(),
    id: z.string().uuid(),
    type: z.string().optional().default('cell_morphology_protocol'),
    generation_type: z.string(),
  })
  .passthrough();
const NestedCellMorphologyProtocolRead = z.discriminatedUnion('generation_type', [
  NestedDigitalReconstructionCellMorphologyProtocolRead,
  NestedModifiedReconstructionCellMorphologyProtocolRead,
  NestedComputationallySynthesizedCellMorphologyProtocolRead,
  NestedPlaceholderCellMorphologyProtocolRead,
]);
const CellMorphologyRead = z
  .object({
    name: z.string(),
    description: z.string(),
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    assets: z.array(AssetRead),
    license: z.union([LicenseRead, z.null()]).optional(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    brain_region: NestedBrainRegionRead,
    subject: NestedSubjectRead,
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    type: z.union([EntityType, z.null()]).optional(),
    id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    location: z.union([PointLocationBase, z.null()]),
    legacy_id: z.union([z.array(z.string()), z.null()]).optional(),
    has_segmented_spines: z.boolean().optional().default(false),
    repair_pipeline_state: z.union([RepairPipelineType, z.null()]).optional(),
    mtypes: z.union([z.array(AnnotationRead), z.null()]),
    cell_morphology_protocol: z.union([NestedCellMorphologyProtocolRead, z.null()]),
  })
  .passthrough();
const ListResponse_CellMorphologyRead_ = z
  .object({
    data: z.array(CellMorphologyRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const CellMorphologyCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    license_id: z.union([z.string(), z.null()]).optional(),
    brain_region_id: z.string().uuid(),
    subject_id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    location: z.union([PointLocationBase, z.null()]),
    legacy_id: z.union([z.array(z.string()), z.null()]).optional(),
    has_segmented_spines: z.boolean().optional().default(false),
    repair_pipeline_state: z.union([RepairPipelineType, z.null()]).optional(),
    cell_morphology_protocol_id: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const ExpandableAttribute = z.literal('measurement_annotation');
const expand = z.union([z.array(ExpandableAttribute), z.null()]).optional();
const MeasurableEntity = z.enum(['cell_morphology', 'em_cell_mesh']);
const MeasurementItem = z
  .object({
    name: z.union([MeasurementStatistic, z.null()]),
    unit: z.union([MeasurementUnit, z.null()]),
    value: z.union([z.number(), z.null()]),
  })
  .passthrough();
const MeasurementKindRead = z
  .object({
    structural_domain: StructuralDomain,
    measurement_items: z.array(MeasurementItem),
    pref_label: z.string(),
  })
  .passthrough();
const MeasurementAnnotationRead = z
  .object({
    id: z.string().uuid(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    entity_id: z.string().uuid(),
    entity_type: MeasurableEntity,
    measurement_kinds: z.array(MeasurementKindRead),
  })
  .passthrough();
const CellMorphologyAnnotationExpandedRead = z
  .object({
    name: z.string(),
    description: z.string(),
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    assets: z.array(AssetRead),
    license: z.union([LicenseRead, z.null()]).optional(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    brain_region: NestedBrainRegionRead,
    subject: NestedSubjectRead,
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    type: z.union([EntityType, z.null()]).optional(),
    id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    location: z.union([PointLocationBase, z.null()]),
    legacy_id: z.union([z.array(z.string()), z.null()]).optional(),
    has_segmented_spines: z.boolean().optional().default(false),
    repair_pipeline_state: z.union([RepairPipelineType, z.null()]).optional(),
    mtypes: z.union([z.array(AnnotationRead), z.null()]),
    cell_morphology_protocol: z.union([NestedCellMorphologyProtocolRead, z.null()]),
    measurement_annotation: z.union([MeasurementAnnotationRead, z.null()]),
  })
  .passthrough();
const CellMorphologyUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    license_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    brain_region_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    subject_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    experiment_date: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    contact_email: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    published_in: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    notice_text: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    location: z.union([PointLocationBase, z.string(), z.null()]).default('<NOT_SET>'),
    legacy_id: z.union([z.array(z.string()), z.string(), z.null()]).default('<NOT_SET>'),
    has_segmented_spines: z.union([z.boolean(), z.string(), z.null()]).default('<NOT_SET>'),
    repair_pipeline_state: z.union([RepairPipelineType, z.string(), z.null()]).default('<NOT_SET>'),
    cell_morphology_protocol_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const DigitalReconstructionCellMorphologyProtocolRead = z
  .object({
    protocol_document: z.union([z.string(), z.null()]).optional(),
    protocol_design: CellMorphologyProtocolDesign,
    name: z.string(),
    description: z.string(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
    type: z.string().optional().default('cell_morphology_protocol'),
    generation_type: z.string(),
    staining_type: z.union([StainingType, z.null()]).optional(),
    slicing_thickness: z.number().gte(0),
    slicing_direction: z.union([SlicingDirectionType, z.null()]).optional(),
    magnification: z.union([z.number(), z.null()]).optional(),
    tissue_shrinkage: z.union([z.number(), z.null()]).optional(),
    corrected_for_shrinkage: z.union([z.boolean(), z.null()]).optional(),
  })
  .passthrough();
const ModifiedReconstructionCellMorphologyProtocolRead = z
  .object({
    protocol_document: z.union([z.string(), z.null()]).optional(),
    protocol_design: CellMorphologyProtocolDesign,
    name: z.string(),
    description: z.string(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
    type: z.string().optional().default('cell_morphology_protocol'),
    generation_type: z.string(),
    method_type: ModifiedMorphologyMethodType,
  })
  .passthrough();
const ComputationallySynthesizedCellMorphologyProtocolRead = z
  .object({
    protocol_document: z.union([z.string(), z.null()]).optional(),
    protocol_design: CellMorphologyProtocolDesign,
    name: z.string(),
    description: z.string(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
    type: z.string().optional().default('cell_morphology_protocol'),
    generation_type: z.string(),
    method_type: z.string(),
  })
  .passthrough();
const PlaceholderCellMorphologyProtocolRead = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
    type: z.string().optional().default('cell_morphology_protocol'),
    generation_type: z.string(),
  })
  .passthrough();
const CellMorphologyProtocolRead = z.discriminatedUnion('generation_type', [
  DigitalReconstructionCellMorphologyProtocolRead,
  ModifiedReconstructionCellMorphologyProtocolRead,
  ComputationallySynthesizedCellMorphologyProtocolRead,
  PlaceholderCellMorphologyProtocolRead,
]);
const ListResponse_CellMorphologyProtocolRead_ = z
  .object({
    data: z.array(CellMorphologyProtocolRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const DigitalReconstructionCellMorphologyProtocolCreate = z
  .object({
    protocol_document: z.union([z.string(), z.null()]).optional(),
    protocol_design: CellMorphologyProtocolDesign,
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    type: z.string().optional().default('cell_morphology_protocol'),
    generation_type: z.string(),
    staining_type: z.union([StainingType, z.null()]).optional(),
    slicing_thickness: z.number().gte(0),
    slicing_direction: z.union([SlicingDirectionType, z.null()]).optional(),
    magnification: z.union([z.number(), z.null()]).optional(),
    tissue_shrinkage: z.union([z.number(), z.null()]).optional(),
    corrected_for_shrinkage: z.union([z.boolean(), z.null()]).optional(),
  })
  .passthrough();
const ModifiedReconstructionCellMorphologyProtocolCreate = z
  .object({
    protocol_document: z.union([z.string(), z.null()]).optional(),
    protocol_design: CellMorphologyProtocolDesign,
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    type: z.string().optional().default('cell_morphology_protocol'),
    generation_type: z.string(),
    method_type: ModifiedMorphologyMethodType,
  })
  .passthrough();
const ComputationallySynthesizedCellMorphologyProtocolCreate = z
  .object({
    protocol_document: z.union([z.string(), z.null()]).optional(),
    protocol_design: CellMorphologyProtocolDesign,
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    type: z.string().optional().default('cell_morphology_protocol'),
    generation_type: z.string(),
    method_type: z.string(),
  })
  .passthrough();
const PlaceholderCellMorphologyProtocolCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    type: z.string().optional().default('cell_morphology_protocol'),
    generation_type: z.string(),
  })
  .passthrough();
const CellMorphologyProtocolCreate = z.discriminatedUnion('generation_type', [
  DigitalReconstructionCellMorphologyProtocolCreate,
  ModifiedReconstructionCellMorphologyProtocolCreate,
  ComputationallySynthesizedCellMorphologyProtocolCreate,
  PlaceholderCellMorphologyProtocolCreate,
]);
const DerivationType = z.enum(['circuit_extraction', 'circuit_rewiring', 'unspecified']);
const HierarchyNode: z.ZodType<HierarchyNode> = z.lazy(() =>
  z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      parent_id: z.union([z.string(), z.null()]),
      children: z.array(HierarchyNode).optional().default([]),
      authorized_public: z.boolean(),
      authorized_project_id: z.string().uuid(),
    })
    .passthrough()
);
const HierarchyTree = z
  .object({ derivation_type: DerivationType, data: z.array(HierarchyNode) })
  .passthrough();
const CircuitScale = z.enum([
  'single',
  'pair',
  'small',
  'microcircuit',
  'region',
  'system',
  'whole_brain',
]);
const scale = z.union([CircuitScale, z.null()]).optional();
const scale__in = z.union([z.array(CircuitScale), z.null()]).optional();
const CircuitBuildCategory = z.enum(['computational_model', 'em_reconstruction']);
const build_category = z.union([CircuitBuildCategory, z.null()]).optional();
const build_category__in = z.union([z.array(CircuitBuildCategory), z.null()]).optional();
const CircuitRead = z
  .object({
    name: z.string(),
    description: z.string(),
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    assets: z.array(AssetRead),
    license: z.union([LicenseRead, z.null()]).optional(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    brain_region: NestedBrainRegionRead,
    subject: NestedSubjectRead,
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    type: z.union([EntityType, z.null()]).optional(),
    id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    has_morphologies: z.boolean().optional().default(false),
    has_point_neurons: z.boolean().optional().default(false),
    has_electrical_cell_models: z.boolean().optional().default(false),
    has_spines: z.boolean().optional().default(false),
    number_neurons: z.number().int(),
    number_synapses: z.number().int(),
    number_connections: z.union([z.number(), z.null()]),
    scale: CircuitScale,
    build_category: CircuitBuildCategory,
    root_circuit_id: z.union([z.string(), z.null()]).optional(),
    atlas_id: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const ListResponse_CircuitRead_ = z
  .object({
    data: z.array(CircuitRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const CircuitCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    license_id: z.union([z.string(), z.null()]).optional(),
    brain_region_id: z.string().uuid(),
    subject_id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    has_morphologies: z.boolean().optional().default(false),
    has_point_neurons: z.boolean().optional().default(false),
    has_electrical_cell_models: z.boolean().optional().default(false),
    has_spines: z.boolean().optional().default(false),
    number_neurons: z.number().int(),
    number_synapses: z.number().int(),
    number_connections: z.union([z.number(), z.null()]),
    scale: CircuitScale,
    build_category: CircuitBuildCategory,
    root_circuit_id: z.union([z.string(), z.null()]).optional(),
    atlas_id: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const CircuitUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    license_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    brain_region_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    subject_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    experiment_date: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    contact_email: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    published_in: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    notice_text: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    has_morphologies: z.union([z.boolean(), z.string(), z.null()]).default('<NOT_SET>'),
    has_point_neurons: z.union([z.boolean(), z.string(), z.null()]).default('<NOT_SET>'),
    has_electrical_cell_models: z.union([z.boolean(), z.string(), z.null()]).default('<NOT_SET>'),
    has_spines: z.union([z.boolean(), z.string(), z.null()]).default('<NOT_SET>'),
    number_neurons: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    number_synapses: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    number_connections: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    scale: z.union([CircuitScale, z.string(), z.null()]).default('<NOT_SET>'),
    build_category: z.union([CircuitBuildCategory, z.string(), z.null()]).default('<NOT_SET>'),
    root_circuit_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    atlas_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const CircuitExtractionCampaignRead = z
  .object({
    name: z.string(),
    description: z.string(),
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    assets: z.array(AssetRead),
    id: z.string().uuid(),
    type: z.union([EntityType, z.null()]).optional(),
    scan_parameters: z.object({}).partial().passthrough(),
  })
  .passthrough();
const ListResponse_CircuitExtractionCampaignRead_ = z
  .object({
    data: z.array(CircuitExtractionCampaignRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const CircuitExtractionCampaignCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    scan_parameters: z.object({}).partial().passthrough(),
  })
  .passthrough();
const CircuitExtractionCampaignUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    scan_parameters: z
      .union([z.object({}).partial().passthrough(), z.string(), z.null()])
      .default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const CircuitExtractionConfigRead = z
  .object({
    name: z.string(),
    description: z.string(),
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    assets: z.array(AssetRead),
    id: z.string().uuid(),
    type: z.union([EntityType, z.null()]).optional(),
    circuit_id: z.string().uuid(),
    scan_parameters: z.object({}).partial().passthrough(),
  })
  .passthrough();
const ListResponse_CircuitExtractionConfigRead_ = z
  .object({
    data: z.array(CircuitExtractionConfigRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const CircuitExtractionConfigCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    circuit_id: z.string().uuid(),
    scan_parameters: z.object({}).partial().passthrough(),
  })
  .passthrough();
const CircuitExtractionConfigUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    circuit_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    scan_parameters: z
      .union([z.object({}).partial().passthrough(), z.string(), z.null()])
      .default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const CircuitExtractionConfigGenerationRead = z
  .object({
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    id: z.string().uuid(),
    type: z.union([ActivityType, z.null()]).optional(),
    start_time: z.union([z.string(), z.null()]).optional(),
    end_time: z.union([z.string(), z.null()]).optional(),
    status: ActivityStatus.optional(),
    used: z.array(NestedEntityRead),
    generated: z.array(NestedEntityRead),
  })
  .passthrough();
const ListResponse_CircuitExtractionConfigGenerationRead_ = z
  .object({
    data: z.array(CircuitExtractionConfigGenerationRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const CircuitExtractionConfigGenerationCreate = z
  .object({
    authorized_public: z.boolean().default(false),
    start_time: z.union([z.string(), z.null()]),
    end_time: z.union([z.string(), z.null()]),
    status: ActivityStatus,
    used_ids: z.array(z.string().uuid()).default([]),
    generated_ids: z.array(z.string().uuid()).default([]),
  })
  .partial()
  .passthrough();
const CircuitExtractionConfigGenerationUserUpdate = z
  .object({
    start_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    end_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    generated_ids: z.union([z.array(z.string().uuid()), NotSet, z.null()]).default('<NOT_SET>'),
    status: z.union([ActivityStatus, NotSet, z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const CircuitExtractionExecutionRead = z
  .object({
    executor: z.union([ExecutorType, z.null()]).optional(),
    execution_id: z.union([z.string(), z.null()]).optional(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    id: z.string().uuid(),
    type: z.union([ActivityType, z.null()]).optional(),
    start_time: z.union([z.string(), z.null()]).optional(),
    end_time: z.union([z.string(), z.null()]).optional(),
    status: ActivityStatus.optional(),
    used: z.array(NestedEntityRead),
    generated: z.array(NestedEntityRead),
  })
  .passthrough();
const ListResponse_CircuitExtractionExecutionRead_ = z
  .object({
    data: z.array(CircuitExtractionExecutionRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const CircuitExtractionExecutionCreate = z
  .object({
    executor: z.union([ExecutorType, z.null()]),
    execution_id: z.union([z.string(), z.null()]),
    authorized_public: z.boolean().default(false),
    start_time: z.union([z.string(), z.null()]),
    end_time: z.union([z.string(), z.null()]),
    status: ActivityStatus,
    used_ids: z.array(z.string().uuid()).default([]),
    generated_ids: z.array(z.string().uuid()).default([]),
  })
  .partial()
  .passthrough();
const CircuitExtractionExecutionUserUpdate = z
  .object({
    executor: z.union([ExecutorType, z.null()]),
    execution_id: z.union([z.string(), z.null()]),
    start_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    end_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    generated_ids: z.union([z.array(z.string().uuid()), NotSet, z.null()]).default('<NOT_SET>'),
    status: z.union([ActivityStatus, NotSet, z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const ConsortiumRead = z
  .object({
    id: z.string().uuid(),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    pref_label: z.string(),
    alternative_name: z.union([z.string(), z.null()]).optional(),
    type: z.string(),
  })
  .passthrough();
const ListResponse_ConsortiumRead_ = z
  .object({
    data: z.array(ConsortiumRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const ConsortiumCreate = z
  .object({
    pref_label: z.string(),
    alternative_name: z.union([z.string(), z.null()]).optional(),
    legacy_id: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const ContributionRead = z
  .object({
    id: z.string().uuid(),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    agent: AgentRead,
    role: RoleRead,
    entity: NestedEntityRead,
  })
  .passthrough();
const ListResponse_ContributionRead_ = z
  .object({
    data: z.array(ContributionRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const ContributionCreate = z
  .object({ agent_id: z.string().uuid(), role_id: z.string().uuid(), entity_id: z.string().uuid() })
  .passthrough();
const BasicEntityRead = z
  .object({ type: z.union([EntityType, z.null()]).optional(), id: z.string().uuid() })
  .passthrough();
const ListResponse_BasicEntityRead_ = z
  .object({
    data: z.array(BasicEntityRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const DerivationRead = z
  .object({ used: BasicEntityRead, generated: BasicEntityRead, derivation_type: DerivationType })
  .passthrough();
const DerivationCreate = z
  .object({
    used_id: z.string().uuid(),
    generated_id: z.string().uuid(),
    derivation_type: DerivationType,
  })
  .passthrough();
const ElectricalRecordingType = z.enum(['intracellular', 'extracellular', 'both', 'unknown']);
const recording_type = z.union([ElectricalRecordingType, z.null()]).optional();
const recording_type__in = z.union([z.array(ElectricalRecordingType), z.null()]).optional();
const ElectricalRecordingOrigin = z.enum(['in_vivo', 'in_vitro', 'in_silico', 'unknown']);
const recording_origin = z.union([ElectricalRecordingOrigin, z.null()]).optional();
const recording_origin__in = z.union([z.array(ElectricalRecordingOrigin), z.null()]).optional();
const ElectricalRecordingStimulusType = z.enum([
  'voltage_clamp',
  'current_clamp',
  'conductance_clamp',
  'extracellular',
  'other',
  'unknown',
]);
const ElectricalRecordingStimulusShape = z.enum([
  'cheops',
  'constant',
  'pulse',
  'step',
  'ramp',
  'noise',
  'sinusoidal',
  'other',
  'two_steps',
  'unknown',
]);
const NestedElectricalRecordingStimulusRead = z
  .object({
    name: z.string(),
    description: z.string(),
    type: z.union([EntityType, z.null()]).optional(),
    id: z.string().uuid(),
    dt: z.union([z.number(), z.null()]).optional(),
    injection_type: ElectricalRecordingStimulusType,
    shape: ElectricalRecordingStimulusShape,
    start_time: z.union([z.number(), z.null()]).optional(),
    end_time: z.union([z.number(), z.null()]).optional(),
    recording_id: z.string().uuid(),
  })
  .passthrough();
const ElectricalCellRecordingRead = z
  .object({
    name: z.string(),
    description: z.string(),
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    assets: z.array(AssetRead),
    license: z.union([LicenseRead, z.null()]).optional(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    brain_region: NestedBrainRegionRead,
    subject: NestedSubjectRead,
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    type: z.union([EntityType, z.null()]).optional(),
    id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    ljp: z.number().optional().default(0),
    recording_location: z.array(z.string()),
    recording_type: ElectricalRecordingType,
    recording_origin: ElectricalRecordingOrigin,
    temperature: z.union([z.number(), z.null()]).optional(),
    comment: z.union([z.string(), z.null()]).optional(),
    legacy_id: z.union([z.array(z.string()), z.null()]).optional(),
    stimuli: z.union([z.array(NestedElectricalRecordingStimulusRead), z.null()]).optional(),
    etypes: z.union([z.array(AnnotationRead), z.null()]),
  })
  .passthrough();
const ListResponse_ElectricalCellRecordingRead_ = z
  .object({
    data: z.array(ElectricalCellRecordingRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const ElectricalCellRecordingCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    license_id: z.union([z.string(), z.null()]).optional(),
    brain_region_id: z.string().uuid(),
    subject_id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    ljp: z.number().optional().default(0),
    recording_location: z.array(z.string()),
    recording_type: ElectricalRecordingType,
    recording_origin: ElectricalRecordingOrigin,
    temperature: z.union([z.number(), z.null()]).optional(),
    comment: z.union([z.string(), z.null()]).optional(),
    legacy_id: z.union([z.array(z.string()), z.null()]).optional(),
  })
  .passthrough();
const ElectricalCellRecordingUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    license_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    brain_region_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    subject_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    experiment_date: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    contact_email: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    published_in: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    notice_text: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    ljp: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    recording_location: z.union([z.array(z.string()), z.string(), z.null()]).default('<NOT_SET>'),
    recording_type: z.union([ElectricalRecordingType, z.string(), z.null()]).default('<NOT_SET>'),
    recording_origin: z
      .union([ElectricalRecordingOrigin, z.string(), z.null()])
      .default('<NOT_SET>'),
    temperature: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    comment: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    legacy_id: z.union([z.array(z.string()), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const shape = z.union([ElectricalRecordingStimulusShape, z.null()]).optional();
const injection_type = z.union([ElectricalRecordingStimulusType, z.null()]).optional();
const ElectricalRecordingStimulusRead = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    type: z.union([EntityType, z.null()]).optional(),
    id: z.string().uuid(),
    dt: z.union([z.number(), z.null()]).optional(),
    injection_type: ElectricalRecordingStimulusType,
    shape: ElectricalRecordingStimulusShape,
    start_time: z.union([z.number(), z.null()]).optional(),
    end_time: z.union([z.number(), z.null()]).optional(),
    recording_id: z.string().uuid(),
  })
  .passthrough();
const ListResponse_ElectricalRecordingStimulusRead_ = z
  .object({
    data: z.array(ElectricalRecordingStimulusRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const ElectricalRecordingStimulusCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    dt: z.union([z.number(), z.null()]).optional(),
    injection_type: ElectricalRecordingStimulusType,
    shape: ElectricalRecordingStimulusShape,
    start_time: z.union([z.number(), z.null()]).optional(),
    end_time: z.union([z.number(), z.null()]).optional(),
    recording_id: z.string().uuid(),
  })
  .passthrough();
const ElectricalRecordingStimulusUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    dt: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    injection_type: z
      .union([ElectricalRecordingStimulusType, z.string(), z.null()])
      .default('<NOT_SET>'),
    shape: z.union([ElectricalRecordingStimulusShape, z.string(), z.null()]).default('<NOT_SET>'),
    start_time: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    end_time: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    recording_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const EMCellMeshType = z.enum(['static', 'dynamic']);
const mesh_type = z.union([EMCellMeshType, z.null()]).optional();
const EMCellMeshGenerationMethod = z.literal('marching_cubes');
const EMCellMeshRead = z
  .object({
    name: z.string(),
    description: z.string(),
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    assets: z.array(AssetRead),
    license: z.union([LicenseRead, z.null()]).optional(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    brain_region: NestedBrainRegionRead,
    subject: NestedSubjectRead,
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    type: z.union([EntityType, z.null()]).optional(),
    id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    release_version: z.number().int(),
    dense_reconstruction_cell_id: z.number().int(),
    generation_method: EMCellMeshGenerationMethod,
    level_of_detail: z.number().int(),
    generation_parameters: z.union([z.object({}).partial().passthrough(), z.null()]).optional(),
    mesh_type: EMCellMeshType,
    em_dense_reconstruction_dataset: BasicEntityRead,
    mtypes: z.union([z.array(AnnotationRead), z.null()]),
  })
  .passthrough();
const ListResponse_EMCellMeshRead_ = z
  .object({
    data: z.array(EMCellMeshRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const EMCellMeshCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    license_id: z.union([z.string(), z.null()]).optional(),
    brain_region_id: z.string().uuid(),
    subject_id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    release_version: z.number().int(),
    dense_reconstruction_cell_id: z.number().int(),
    generation_method: EMCellMeshGenerationMethod,
    level_of_detail: z.number().int(),
    generation_parameters: z.union([z.object({}).partial().passthrough(), z.null()]).optional(),
    mesh_type: EMCellMeshType,
    em_dense_reconstruction_dataset_id: z.string().uuid(),
  })
  .passthrough();
const Expandable = z.literal('measurement_annotation');
const expand__2 = z.union([z.array(Expandable), z.null()]).optional();
const EMCellMeshAnnotationExpandedRead = z
  .object({
    name: z.string(),
    description: z.string(),
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    assets: z.array(AssetRead),
    license: z.union([LicenseRead, z.null()]).optional(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    brain_region: NestedBrainRegionRead,
    subject: NestedSubjectRead,
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    type: z.union([EntityType, z.null()]).optional(),
    id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    release_version: z.number().int(),
    dense_reconstruction_cell_id: z.number().int(),
    generation_method: EMCellMeshGenerationMethod,
    level_of_detail: z.number().int(),
    generation_parameters: z.union([z.object({}).partial().passthrough(), z.null()]).optional(),
    mesh_type: EMCellMeshType,
    em_dense_reconstruction_dataset: BasicEntityRead,
    mtypes: z.union([z.array(AnnotationRead), z.null()]),
    measurement_annotation: z.union([MeasurementAnnotationRead, z.null()]),
  })
  .passthrough();
const EMCellMeshUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    license_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    brain_region_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    subject_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    experiment_date: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    contact_email: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    published_in: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    notice_text: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    release_version: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    dense_reconstruction_cell_id: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    generation_method: z
      .union([EMCellMeshGenerationMethod, z.string(), z.null()])
      .default('<NOT_SET>'),
    level_of_detail: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    generation_parameters: z
      .union([z.object({}).partial().passthrough(), z.string(), z.null()])
      .default('<NOT_SET>'),
    mesh_type: z.union([EMCellMeshType, z.string(), z.null()]).default('<NOT_SET>'),
    em_dense_reconstruction_dataset_id: z
      .union([z.string(), z.string(), z.null()])
      .default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const EMDenseReconstructionDatasetRead = z
  .object({
    name: z.string(),
    description: z.string(),
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    assets: z.array(AssetRead),
    license: z.union([LicenseRead, z.null()]).optional(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    brain_region: NestedBrainRegionRead,
    subject: NestedSubjectRead,
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    type: z.union([EntityType, z.null()]).optional(),
    id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    protocol_document: z.union([z.string(), z.null()]).optional(),
    fixation: z.union([z.string(), z.null()]).optional(),
    staining_type: z.union([z.string(), z.null()]).optional(),
    slicing_thickness: z.union([z.number(), z.null()]).optional(),
    tissue_shrinkage: z.union([z.number(), z.null()]).optional(),
    microscope_type: z.union([z.string(), z.null()]).optional(),
    detector: z.union([z.string(), z.null()]).optional(),
    slicing_direction: z.union([SlicingDirectionType, z.null()]).optional(),
    landmarks: z.union([z.string(), z.null()]).optional(),
    voltage: z.union([z.number(), z.null()]).optional(),
    current: z.union([z.number(), z.null()]).optional(),
    dose: z.union([z.number(), z.null()]).optional(),
    temperature: z.union([z.number(), z.null()]).optional(),
    volume_resolution_x_nm: z.number(),
    volume_resolution_y_nm: z.number(),
    volume_resolution_z_nm: z.number(),
    release_url: z.union([z.string(), z.null()]).optional(),
    cave_client_url: z.union([z.string(), z.null()]).optional(),
    cave_datastack: z.union([z.string(), z.null()]).optional(),
    precomputed_mesh_url: z.union([z.string(), z.null()]).optional(),
    cell_identifying_property: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const ListResponse_EMDenseReconstructionDatasetRead_ = z
  .object({
    data: z.array(EMDenseReconstructionDatasetRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const EMDenseReconstructionDatasetCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    license_id: z.union([z.string(), z.null()]).optional(),
    brain_region_id: z.string().uuid(),
    subject_id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    protocol_document: z.union([z.string(), z.null()]).optional(),
    fixation: z.union([z.string(), z.null()]).optional(),
    staining_type: z.union([z.string(), z.null()]).optional(),
    slicing_thickness: z.union([z.number(), z.null()]).optional(),
    tissue_shrinkage: z.union([z.number(), z.null()]).optional(),
    microscope_type: z.union([z.string(), z.null()]).optional(),
    detector: z.union([z.string(), z.null()]).optional(),
    slicing_direction: z.union([SlicingDirectionType, z.null()]).optional(),
    landmarks: z.union([z.string(), z.null()]).optional(),
    voltage: z.union([z.number(), z.null()]).optional(),
    current: z.union([z.number(), z.null()]).optional(),
    dose: z.union([z.number(), z.null()]).optional(),
    temperature: z.union([z.number(), z.null()]).optional(),
    volume_resolution_x_nm: z.number(),
    volume_resolution_y_nm: z.number(),
    volume_resolution_z_nm: z.number(),
    release_url: z.union([z.string(), z.null()]).optional(),
    cave_client_url: z.union([z.string(), z.null()]).optional(),
    cave_datastack: z.union([z.string(), z.null()]).optional(),
    precomputed_mesh_url: z.union([z.string(), z.null()]).optional(),
    cell_identifying_property: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const ExemplarMorphology = z
  .object({
    name: z.string(),
    description: z.string(),
    id: z.string().uuid(),
    location: z.union([PointLocationBase, z.null()]),
    legacy_id: z.union([z.array(z.string()), z.null()]).optional(),
    has_segmented_spines: z.boolean().optional().default(false),
    repair_pipeline_state: z.union([RepairPipelineType, z.null()]).optional(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
  })
  .passthrough();
const UseIon = z
  .object({
    ion_name: z.string(),
    read: z.array(z.string()).optional().default([]),
    write: z.array(z.string()).optional().default([]),
    valence: z.union([z.number(), z.null()]).optional(),
    main_ion: z.union([z.boolean(), z.null()]).optional(),
  })
  .passthrough();
const NeuronBlock = z
  .object({
    global: z.array(z.record(z.union([z.string(), z.null()]))).default([]),
    range: z.array(z.record(z.union([z.string(), z.null()]))).default([]),
    useion: z.array(UseIon).default([]),
    nonspecific: z.array(z.record(z.union([z.string(), z.null()]))).default([]),
  })
  .partial()
  .passthrough();
const IonChannelModelWAssets = z
  .object({
    name: z.string(),
    description: z.string(),
    assets: z.array(AssetRead),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    brain_region: NestedBrainRegionRead,
    subject: NestedSubjectRead,
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    type: z.union([EntityType, z.null()]).optional(),
    id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    nmodl_suffix: z.string(),
    is_ljp_corrected: z.boolean().optional().default(false),
    is_temperature_dependent: z.boolean().optional().default(false),
    temperature_celsius: z.union([z.number(), z.null()]),
    is_stochastic: z.boolean().optional().default(false),
    neuron_block: NeuronBlock,
    conductance_name: z.union([z.string(), z.null()]).optional(),
    max_permeability_name: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const EModelReadExpanded = z
  .object({
    name: z.string(),
    description: z.string(),
    brain_region: NestedBrainRegionRead,
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    assets: z.array(AssetRead),
    type: z.union([EntityType, z.null()]).optional(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    iteration: z.string(),
    score: z.number(),
    seed: z.number().int(),
    id: z.string().uuid(),
    species: NestedSpeciesRead,
    strain: z.union([NestedStrainRead, z.null()]),
    mtypes: z.union([z.array(AnnotationRead), z.null()]),
    etypes: z.union([z.array(AnnotationRead), z.null()]),
    exemplar_morphology: ExemplarMorphology,
    ion_channel_models: z.array(IonChannelModelWAssets),
  })
  .passthrough();
const ListResponse_EModelReadExpanded_ = z
  .object({
    data: z.array(EModelReadExpanded),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const EModelCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    iteration: z.string(),
    score: z.number(),
    seed: z.number().int(),
    species_id: z.string().uuid(),
    strain_id: z.union([z.string(), z.null()]).optional(),
    brain_region_id: z.string().uuid(),
    exemplar_morphology_id: z.string().uuid(),
  })
  .passthrough();
const EModelRead = z
  .object({
    name: z.string(),
    description: z.string(),
    brain_region: NestedBrainRegionRead,
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    assets: z.array(AssetRead),
    type: z.union([EntityType, z.null()]).optional(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    iteration: z.string(),
    score: z.number(),
    seed: z.number().int(),
    id: z.string().uuid(),
    species: NestedSpeciesRead,
    strain: z.union([NestedStrainRead, z.null()]),
    mtypes: z.union([z.array(AnnotationRead), z.null()]),
    etypes: z.union([z.array(AnnotationRead), z.null()]),
    exemplar_morphology: ExemplarMorphology,
  })
  .passthrough();
const EModelUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    iteration: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    score: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    seed: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    species_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    strain_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    brain_region_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    exemplar_morphology_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const EntityTypeWithBrainRegion = z.enum([
  'brain_atlas_region',
  'cell_composition',
  'cell_morphology',
  'circuit',
  'electrical_cell_recording',
  'electrical_recording',
  'em_cell_mesh',
  'em_dense_reconstruction_dataset',
  'emodel',
  'experimental_bouton_density',
  'experimental_neuron_density',
  'experimental_synapses_per_connection',
  'ion_channel_model',
  'ion_channel_recording',
  'me_type_density',
  'memodel',
  'scientific_artifact',
  'single_neuron_simulation',
  'single_neuron_synaptome',
  'single_neuron_synaptome_simulation',
]);
const EntityCountRead = z.record(z.number().int());
const EntityRead = z
  .object({
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    id: z.string().uuid(),
    type: z.string(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean(),
  })
  .passthrough();
const ListResponse_AnnotationRead_ = z
  .object({
    data: z.array(AnnotationRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const AnnotationCreate = z
  .object({
    pref_label: z.string(),
    alt_label: z.union([z.string(), z.null()]).optional(),
    definition: z.string(),
  })
  .passthrough();
const AnnotationAdminUpdate = z
  .object({
    pref_label: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    alt_label: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    definition: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const ETypeClassificationCreate = z
  .object({
    authorized_public: z.boolean().optional().default(false),
    entity_id: z.string().uuid(),
    etype_class_id: z.string().uuid(),
  })
  .passthrough();
const ETypeClassificationRead = z
  .object({
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    id: z.string().uuid(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    entity_id: z.string().uuid(),
    etype_class_id: z.string().uuid(),
  })
  .passthrough();
const ListResponse_ETypeClassificationRead_ = z
  .object({
    data: z.array(ETypeClassificationRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const MeasurementRecordRead = z
  .object({
    name: MeasurementStatistic,
    unit: MeasurementUnit,
    value: z.number(),
    id: z.number().int(),
  })
  .passthrough();
const ExperimentalBoutonDensityRead = z
  .object({
    name: z.string(),
    description: z.string(),
    brain_region: NestedBrainRegionRead,
    subject: NestedSubjectRead,
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    type: z.union([EntityType, z.null()]).optional(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    license: z.union([LicenseRead, z.null()]),
    id: z.string().uuid(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    measurements: z.array(MeasurementRecordRead),
    assets: z.array(AssetRead),
    mtypes: z.union([z.array(AnnotationRead), z.null()]),
  })
  .passthrough();
const ListResponse_ExperimentalBoutonDensityRead_ = z
  .object({
    data: z.array(ExperimentalBoutonDensityRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const MeasurementRecordCreate = z
  .object({ name: MeasurementStatistic, unit: MeasurementUnit, value: z.number() })
  .passthrough();
const ExperimentalBoutonDensityCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    license_id: z.union([z.string(), z.null()]).optional(),
    subject_id: z.string().uuid(),
    brain_region_id: z.string().uuid(),
    legacy_id: z.union([z.string(), z.null()]),
    measurements: z.array(MeasurementRecordCreate),
  })
  .passthrough();
const ExperimentalBoutonDensityUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    license_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    subject_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    brain_region_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    legacy_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    measurements: z
      .union([z.array(MeasurementRecordCreate), z.string(), z.null()])
      .default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const ExperimentalNeuronDensityRead = z
  .object({
    name: z.string(),
    description: z.string(),
    brain_region: NestedBrainRegionRead,
    subject: NestedSubjectRead,
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    type: z.union([EntityType, z.null()]).optional(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    license: z.union([LicenseRead, z.null()]),
    id: z.string().uuid(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    measurements: z.array(MeasurementRecordRead),
    assets: z.array(AssetRead),
    mtypes: z.union([z.array(AnnotationRead), z.null()]),
    etypes: z.union([z.array(AnnotationRead), z.null()]),
  })
  .passthrough();
const ListResponse_ExperimentalNeuronDensityRead_ = z
  .object({
    data: z.array(ExperimentalNeuronDensityRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const ExperimentalNeuronDensityCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    license_id: z.union([z.string(), z.null()]).optional(),
    subject_id: z.string().uuid(),
    brain_region_id: z.string().uuid(),
    legacy_id: z.union([z.string(), z.null()]),
    measurements: z.array(MeasurementRecordCreate),
  })
  .passthrough();
const ExperimentalNeuronDensityUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    license_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    subject_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    brain_region_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    legacy_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    measurements: z
      .union([z.array(MeasurementRecordCreate), z.string(), z.null()])
      .default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const ExperimentalSynapsesPerConnectionRead = z
  .object({
    name: z.string(),
    description: z.string(),
    brain_region: NestedBrainRegionRead,
    subject: NestedSubjectRead,
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    type: z.union([EntityType, z.null()]).optional(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    license: z.union([LicenseRead, z.null()]),
    id: z.string().uuid(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    measurements: z.array(MeasurementRecordRead),
    assets: z.array(AssetRead),
    pre_mtype: AnnotationRead,
    post_mtype: AnnotationRead,
    pre_region: NestedBrainRegionRead,
    post_region: NestedBrainRegionRead,
  })
  .passthrough();
const ListResponse_ExperimentalSynapsesPerConnectionRead_ = z
  .object({
    data: z.array(ExperimentalSynapsesPerConnectionRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const ExperimentalSynapsesPerConnectionCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    license_id: z.union([z.string(), z.null()]).optional(),
    subject_id: z.string().uuid(),
    brain_region_id: z.string().uuid(),
    legacy_id: z.union([z.string(), z.null()]),
    measurements: z.array(MeasurementRecordCreate),
    pre_mtype_id: z.string().uuid(),
    post_mtype_id: z.string().uuid(),
    pre_region_id: z.string().uuid(),
    post_region_id: z.string().uuid(),
  })
  .passthrough();
const ExperimentalSynapsesPerConnectionUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    license_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    subject_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    brain_region_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    legacy_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    measurements: z
      .union([z.array(MeasurementRecordCreate), z.string(), z.null()])
      .default('<NOT_SET>'),
    pre_mtype_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    post_mtype_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    pre_region_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    post_region_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const ExternalSource = z.enum(['channelpedia', 'modeldb', 'icgenealogy']);
const ExternalUrlRead = z
  .object({
    name: z.string(),
    description: z.string(),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
    source: ExternalSource,
    url: z.string().min(1).max(2083).url(),
    source_name: z.string(),
  })
  .passthrough();
const source = z.union([ExternalSource, z.null()]).optional();
const ListResponse_ExternalUrlRead_ = z
  .object({
    data: z.array(ExternalUrlRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const ExternalUrlCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    source: ExternalSource,
    url: z.string().min(1).max(2083).url(),
  })
  .passthrough();
const IonChannelRead = z
  .object({
    name: z.string(),
    description: z.string(),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
    label: z.string(),
    gene: z.string(),
    synonyms: z.array(z.string()),
  })
  .passthrough();
const ListResponse_IonChannelRead_ = z
  .object({
    data: z.array(IonChannelRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const IonChannelCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    label: z.string(),
    gene: z.string(),
    synonyms: z.array(z.string()),
  })
  .passthrough();
const IonChannelAdminUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    label: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    gene: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    synonyms: z.union([z.array(z.string()), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const IonChannelModelExpanded = z
  .object({
    name: z.string(),
    description: z.string(),
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    assets: z.array(AssetRead),
    license: z.union([LicenseRead, z.null()]).optional(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    brain_region: NestedBrainRegionRead,
    subject: NestedSubjectRead,
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    type: z.union([EntityType, z.null()]).optional(),
    id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    nmodl_suffix: z.string(),
    is_ljp_corrected: z.boolean().optional().default(false),
    is_temperature_dependent: z.boolean().optional().default(false),
    temperature_celsius: z.union([z.number(), z.null()]),
    is_stochastic: z.boolean().optional().default(false),
    neuron_block: NeuronBlock,
    conductance_name: z.union([z.string(), z.null()]).optional(),
    max_permeability_name: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const ListResponse_IonChannelModelExpanded_ = z
  .object({
    data: z.array(IonChannelModelExpanded),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const IonChannelModelCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    license_id: z.union([z.string(), z.null()]).optional(),
    brain_region_id: z.string().uuid(),
    subject_id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    nmodl_suffix: z.string(),
    is_ljp_corrected: z.boolean().optional().default(false),
    is_temperature_dependent: z.boolean().optional().default(false),
    temperature_celsius: z.union([z.number(), z.null()]),
    is_stochastic: z.boolean().optional().default(false),
    neuron_block: NeuronBlock,
    conductance_name: z.union([z.string(), z.null()]).optional(),
    max_permeability_name: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const IonChannelModelRead = z
  .object({
    name: z.string(),
    description: z.string(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    brain_region: NestedBrainRegionRead,
    subject: NestedSubjectRead,
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    type: z.union([EntityType, z.null()]).optional(),
    id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    nmodl_suffix: z.string(),
    is_ljp_corrected: z.boolean().optional().default(false),
    is_temperature_dependent: z.boolean().optional().default(false),
    temperature_celsius: z.union([z.number(), z.null()]),
    is_stochastic: z.boolean().optional().default(false),
    neuron_block: NeuronBlock,
    conductance_name: z.union([z.string(), z.null()]).optional(),
    max_permeability_name: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const IonChannelModelUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    license_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    brain_region_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    subject_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    experiment_date: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    contact_email: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    published_in: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    notice_text: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    nmodl_suffix: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    is_ljp_corrected: z.union([z.boolean(), z.string(), z.null()]).default('<NOT_SET>'),
    is_temperature_dependent: z.union([z.boolean(), z.string(), z.null()]).default('<NOT_SET>'),
    temperature_celsius: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    is_stochastic: z.union([z.boolean(), z.string(), z.null()]).default('<NOT_SET>'),
    neuron_block: z.union([NeuronBlock, z.string(), z.null()]).default('<NOT_SET>'),
    conductance_name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    max_permeability_name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const NestedIonChannelRecordingRead = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    type: z.union([EntityType, z.null()]).optional(),
    id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    ljp: z.number().optional().default(0),
    recording_location: z.array(z.string()),
    recording_type: ElectricalRecordingType,
    recording_origin: ElectricalRecordingOrigin,
    temperature: z.union([z.number(), z.null()]).optional(),
    comment: z.union([z.string(), z.null()]).optional(),
    legacy_id: z.union([z.array(z.string()), z.null()]).optional(),
    cell_line: z.string(),
  })
  .passthrough();
const NestedIonChannelModelingConfigRead = z
  .object({
    name: z.string(),
    description: z.string(),
    id: z.string().uuid(),
    type: z.union([EntityType, z.null()]).optional(),
    ion_channel_modeling_campaign_id: z.string().uuid(),
    scan_parameters: z.object({}).partial().passthrough(),
  })
  .passthrough();
const IonChannelModelingCampaignRead = z
  .object({
    name: z.string(),
    description: z.string(),
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    assets: z.array(AssetRead),
    id: z.string().uuid(),
    type: z.union([EntityType, z.null()]).optional(),
    scan_parameters: z.object({}).partial().passthrough(),
    input_recordings: z.array(NestedIonChannelRecordingRead),
    ion_channel_modeling_configs: z.array(NestedIonChannelModelingConfigRead),
  })
  .passthrough();
const ListResponse_IonChannelModelingCampaignRead_ = z
  .object({
    data: z.array(IonChannelModelingCampaignRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const IonChannelModelingCampaignCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    scan_parameters: z.object({}).partial().passthrough(),
  })
  .passthrough();
const IonChannelModelingCampaignUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    scan_parameters: z
      .union([z.object({}).partial().passthrough(), z.string(), z.null()])
      .default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const IonChannelModelingConfigRead = z
  .object({
    name: z.string(),
    description: z.string(),
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    assets: z.array(AssetRead),
    id: z.string().uuid(),
    type: z.union([EntityType, z.null()]).optional(),
    ion_channel_modeling_campaign_id: z.string().uuid(),
    scan_parameters: z.object({}).partial().passthrough(),
  })
  .passthrough();
const ListResponse_IonChannelModelingConfigRead_ = z
  .object({
    data: z.array(IonChannelModelingConfigRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const IonChannelModelingConfigCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    ion_channel_modeling_campaign_id: z.string().uuid(),
    scan_parameters: z.object({}).partial().passthrough(),
  })
  .passthrough();
const IonChannelModelingConfigUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    ion_channel_modeling_campaign_id: z
      .union([z.string(), z.string(), z.null()])
      .default('<NOT_SET>'),
    scan_parameters: z
      .union([z.object({}).partial().passthrough(), z.string(), z.null()])
      .default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const IonChannelModelingConfigGenerationRead = z
  .object({
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    id: z.string().uuid(),
    type: z.union([ActivityType, z.null()]).optional(),
    start_time: z.union([z.string(), z.null()]).optional(),
    end_time: z.union([z.string(), z.null()]).optional(),
    status: ActivityStatus.optional(),
    used: z.array(NestedEntityRead),
    generated: z.array(NestedEntityRead),
  })
  .passthrough();
const ListResponse_IonChannelModelingConfigGenerationRead_ = z
  .object({
    data: z.array(IonChannelModelingConfigGenerationRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const IonChannelModelingConfigGenerationCreate = z
  .object({
    authorized_public: z.boolean().default(false),
    start_time: z.union([z.string(), z.null()]),
    end_time: z.union([z.string(), z.null()]),
    status: ActivityStatus,
    used_ids: z.array(z.string().uuid()).default([]),
    generated_ids: z.array(z.string().uuid()).default([]),
  })
  .partial()
  .passthrough();
const IonChannelModelingConfigGenerationUserUpdate = z
  .object({
    start_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    end_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    generated_ids: z.union([z.array(z.string().uuid()), NotSet, z.null()]).default('<NOT_SET>'),
    status: z.union([ActivityStatus, NotSet, z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const IonChannelModelingExecutionRead = z
  .object({
    executor: z.union([ExecutorType, z.null()]).optional(),
    execution_id: z.union([z.string(), z.null()]).optional(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    id: z.string().uuid(),
    type: z.union([ActivityType, z.null()]).optional(),
    start_time: z.union([z.string(), z.null()]).optional(),
    end_time: z.union([z.string(), z.null()]).optional(),
    status: ActivityStatus.optional(),
    used: z.array(NestedEntityRead),
    generated: z.array(NestedEntityRead),
  })
  .passthrough();
const ListResponse_IonChannelModelingExecutionRead_ = z
  .object({
    data: z.array(IonChannelModelingExecutionRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const IonChannelModelingExecutionCreate = z
  .object({
    executor: z.union([ExecutorType, z.null()]),
    execution_id: z.union([z.string(), z.null()]),
    authorized_public: z.boolean().default(false),
    start_time: z.union([z.string(), z.null()]),
    end_time: z.union([z.string(), z.null()]),
    status: ActivityStatus,
    used_ids: z.array(z.string().uuid()).default([]),
    generated_ids: z.array(z.string().uuid()).default([]),
  })
  .partial()
  .passthrough();
const IonChannelModelingExecutionUserUpdate = z
  .object({
    executor: z.union([ExecutorType, z.null()]),
    execution_id: z.union([z.string(), z.null()]),
    start_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    end_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    generated_ids: z.union([z.array(z.string().uuid()), NotSet, z.null()]).default('<NOT_SET>'),
    status: z.union([ActivityStatus, NotSet, z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const NestedIonChannelRead = z
  .object({
    name: z.string(),
    description: z.string(),
    id: z.string().uuid(),
    label: z.string(),
    gene: z.string(),
    synonyms: z.array(z.string()),
  })
  .passthrough();
const IonChannelRecordingRead = z
  .object({
    name: z.string(),
    description: z.string(),
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    assets: z.array(AssetRead),
    license: z.union([LicenseRead, z.null()]).optional(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    brain_region: NestedBrainRegionRead,
    subject: NestedSubjectRead,
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    type: z.union([EntityType, z.null()]).optional(),
    id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    ljp: z.number().optional().default(0),
    recording_location: z.array(z.string()),
    recording_type: ElectricalRecordingType,
    recording_origin: ElectricalRecordingOrigin,
    temperature: z.union([z.number(), z.null()]).optional(),
    comment: z.union([z.string(), z.null()]).optional(),
    legacy_id: z.union([z.array(z.string()), z.null()]).optional(),
    cell_line: z.string(),
    ion_channel: NestedIonChannelRead,
    stimuli: z.union([z.array(NestedElectricalRecordingStimulusRead), z.null()]).optional(),
  })
  .passthrough();
const ListResponse_IonChannelRecordingRead_ = z
  .object({
    data: z.array(IonChannelRecordingRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const IonChannelRecordingCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    license_id: z.union([z.string(), z.null()]).optional(),
    brain_region_id: z.string().uuid(),
    subject_id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    ljp: z.number().optional().default(0),
    recording_location: z.array(z.string()),
    recording_type: ElectricalRecordingType,
    recording_origin: ElectricalRecordingOrigin,
    temperature: z.union([z.number(), z.null()]).optional(),
    comment: z.union([z.string(), z.null()]).optional(),
    legacy_id: z.union([z.array(z.string()), z.null()]).optional(),
    cell_line: z.string(),
    ion_channel_id: z.string().uuid(),
  })
  .passthrough();
const IonChannelRecordingUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    license_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    brain_region_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    subject_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    experiment_date: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    contact_email: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    published_in: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    notice_text: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    ljp: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    recording_location: z.union([z.array(z.string()), z.string(), z.null()]).default('<NOT_SET>'),
    recording_type: z.union([ElectricalRecordingType, z.string(), z.null()]).default('<NOT_SET>'),
    recording_origin: z
      .union([ElectricalRecordingOrigin, z.string(), z.null()])
      .default('<NOT_SET>'),
    temperature: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    comment: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    legacy_id: z.union([z.array(z.string()), z.string(), z.null()]).default('<NOT_SET>'),
    cell_line: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    ion_channel_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const ListResponse_LicenseRead_ = z
  .object({
    data: z.array(LicenseRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const LicenseCreate = z
  .object({ name: z.string(), description: z.string(), label: z.string() })
  .passthrough();
const LicenseAdminUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    label: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const entity_type = z.union([MeasurableEntity, z.null()]).optional();
const ListResponse_MeasurementAnnotationRead_ = z
  .object({
    data: z.array(MeasurementAnnotationRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const MeasurementKindCreate = z
  .object({
    structural_domain: StructuralDomain,
    measurement_items: z.array(MeasurementItem),
    pref_label: z.string(),
  })
  .passthrough();
const MeasurementAnnotationCreate = z
  .object({
    entity_id: z.string().uuid(),
    entity_type: MeasurableEntity,
    measurement_kinds: z.array(MeasurementKindCreate),
  })
  .passthrough();
const MeasurementAnnotationUserUpdate = z
  .object({
    entity_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    entity_type: z.union([MeasurableEntity, z.string(), z.null()]).default('<NOT_SET>'),
    measurement_kinds: z
      .union([z.array(MeasurementKindCreate), z.string(), z.null()])
      .default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const MeasurementLabelRead = z
  .object({
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
    pref_label: z.string(),
    alt_label: z.union([z.string(), z.null()]).optional(),
    definition: z.string(),
    entity_type: MeasurableEntity,
  })
  .passthrough();
const ListResponse_MeasurementLabelRead_ = z
  .object({
    data: z.array(MeasurementLabelRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const MeasurementLabelCreate = z
  .object({
    pref_label: z.string(),
    alt_label: z.union([z.string(), z.null()]).optional(),
    definition: z.string(),
    entity_type: MeasurableEntity,
  })
  .passthrough();
const MeasurementLabelAdminUpdate = z
  .object({
    pref_label: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    alt_label: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    definition: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const ValidationStatus = z.enum(['created', 'initialized', 'running', 'done', 'error']);
const MEModelCalibrationResultRead = z
  .object({
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    id: z.string().uuid(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    holding_current: z.number(),
    threshold_current: z.number(),
    rin: z.union([z.number(), z.null()]).optional(),
    calibrated_entity_id: z.string().uuid(),
  })
  .passthrough();
const MEModelRead = z
  .object({
    name: z.string(),
    description: z.string(),
    brain_region: NestedBrainRegionRead,
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    type: z.union([EntityType, z.null()]).optional(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    validation_status: ValidationStatus.optional(),
    id: z.string().uuid(),
    species: NestedSpeciesRead,
    strain: z.union([NestedStrainRead, z.null()]),
    mtypes: z.union([z.array(AnnotationRead), z.null()]),
    etypes: z.union([z.array(AnnotationRead), z.null()]),
    morphology: CellMorphologyRead,
    emodel: EModelRead,
    calibration_result: z.union([MEModelCalibrationResultRead, z.null()]),
  })
  .passthrough();
const ListResponse_MEModelRead_ = z
  .object({
    data: z.array(MEModelRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const MEModelCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    validation_status: ValidationStatus.optional(),
    brain_region_id: z.string().uuid(),
    morphology_id: z.string().uuid(),
    emodel_id: z.string().uuid(),
    species_id: z.string().uuid(),
    strain_id: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const MEModelUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    validation_status: z.union([ValidationStatus, z.string(), z.null()]).default('<NOT_SET>'),
    brain_region_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    morphology_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    emodel_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    species_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    strain_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const ListResponse_MEModelCalibrationResultRead_ = z
  .object({
    data: z.array(MEModelCalibrationResultRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const MEModelCalibrationResultCreate = z
  .object({
    authorized_public: z.boolean().optional().default(false),
    holding_current: z.number(),
    threshold_current: z.number(),
    rin: z.union([z.number(), z.null()]).optional(),
    calibrated_entity_id: z.string().uuid(),
  })
  .passthrough();
const MEModelCalibrationResultUserUpdate = z
  .object({
    holding_current: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    threshold_current: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    rin: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    calibrated_entity_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const MTypeClassificationCreate = z
  .object({
    authorized_public: z.boolean().optional().default(false),
    entity_id: z.string().uuid(),
    mtype_class_id: z.string().uuid(),
  })
  .passthrough();
const MTypeClassificationRead = z
  .object({
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    id: z.string().uuid(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    entity_id: z.string().uuid(),
    mtype_class_id: z.string().uuid(),
  })
  .passthrough();
const ListResponse_MTypeClassificationRead_ = z
  .object({
    data: z.array(MTypeClassificationRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const OrganizationRead = z
  .object({
    id: z.string().uuid(),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    pref_label: z.string(),
    alternative_name: z.union([z.string(), z.null()]).optional(),
    type: z.string(),
  })
  .passthrough();
const ListResponse_OrganizationRead_ = z
  .object({
    data: z.array(OrganizationRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const OrganizationCreate = z
  .object({
    pref_label: z.string(),
    alternative_name: z.union([z.string(), z.null()]).optional(),
    legacy_id: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const PersonRead = z
  .object({
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
    given_name: z.union([z.string(), z.null()]).optional(),
    family_name: z.union([z.string(), z.null()]).optional(),
    pref_label: z.string(),
    type: z.string(),
    sub_id: z.union([z.string(), z.null()]),
  })
  .passthrough();
const ListResponse_PersonRead_ = z
  .object({
    data: z.array(PersonRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const PersonCreate = z
  .object({
    given_name: z.union([z.string(), z.null()]).optional(),
    family_name: z.union([z.string(), z.null()]).optional(),
    pref_label: z.string(),
    legacy_id: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const Author = z.object({ given_name: z.string(), family_name: z.string() }).passthrough();
const PublicationRead = z
  .object({
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
    DOI: z.string(),
    title: z.union([z.string(), z.null()]).optional(),
    authors: z.union([z.array(Author), z.null()]).optional(),
    publication_year: z.union([z.number(), z.null()]).optional(),
    abstract: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const PublicationAdminUpdate = z
  .object({
    DOI: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    title: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    authors: z.union([z.array(Author), z.string(), z.null()]).default('<NOT_SET>'),
    publication_year: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    abstract: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const publication_year__in = z.union([z.array(z.number().int()), z.null()]).optional();
const ListResponse_PublicationRead_ = z
  .object({
    data: z.array(PublicationRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const PublicationCreate = z
  .object({
    DOI: z.string(),
    title: z.union([z.string(), z.null()]).optional(),
    authors: z.union([z.array(Author), z.null()]).optional(),
    publication_year: z.union([z.number(), z.null()]).optional(),
    abstract: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const ListResponse_RoleRead_ = z
  .object({
    data: z.array(RoleRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const RoleCreate = z.object({ name: z.string(), role_id: z.string() }).passthrough();
const RoleAdminUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    role_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const NestedExternalUrlRead = z
  .object({
    name: z.string(),
    description: z.string(),
    id: z.string().uuid(),
    source: ExternalSource,
    url: z.string().min(1).max(2083).url(),
    source_name: z.string(),
  })
  .passthrough();
const NestedScientificArtifactRead = z
  .object({
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    type: z.union([EntityType, z.null()]).optional(),
    id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const ScientificArtifactExternalUrlLinkRead = z
  .object({
    id: z.string().uuid(),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    external_url: NestedExternalUrlRead,
    scientific_artifact: NestedScientificArtifactRead,
  })
  .passthrough();
const ListResponse_ScientificArtifactExternalUrlLinkRead_ = z
  .object({
    data: z.array(ScientificArtifactExternalUrlLinkRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const ScientificArtifactExternalUrlLinkCreate = z
  .object({ external_url_id: z.string().uuid(), scientific_artifact_id: z.string().uuid() })
  .passthrough();
const PublicationType = z.enum(['entity_source', 'component_source', 'application']);
const NestedPublicationRead = z
  .object({
    id: z.string().uuid(),
    DOI: z.string(),
    title: z.union([z.string(), z.null()]).optional(),
    authors: z.union([z.array(Author), z.null()]).optional(),
    publication_year: z.union([z.number(), z.null()]).optional(),
    abstract: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const ScientificArtifactPublicationLinkRead = z
  .object({
    id: z.string().uuid(),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    publication_type: PublicationType,
    publication: NestedPublicationRead,
    scientific_artifact: NestedScientificArtifactRead,
  })
  .passthrough();
const publication_type = z.union([PublicationType, z.null()]).optional();
const ListResponse_ScientificArtifactPublicationLinkRead_ = z
  .object({
    data: z.array(ScientificArtifactPublicationLinkRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const ScientificArtifactPublicationLinkCreate = z
  .object({
    publication_type: PublicationType,
    publication_id: z.string().uuid(),
    scientific_artifact_id: z.string().uuid(),
  })
  .passthrough();
const NestedEMCellMeshRead = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    type: z.union([EntityType, z.null()]).optional(),
    id: z.string().uuid(),
    experiment_date: z.union([z.string(), z.null()]).optional(),
    contact_email: z.union([z.string(), z.null()]).optional(),
    published_in: z.union([z.string(), z.null()]).optional(),
    notice_text: z.union([z.string(), z.null()]).optional(),
    release_version: z.number().int(),
    dense_reconstruction_cell_id: z.number().int(),
    generation_method: EMCellMeshGenerationMethod,
    level_of_detail: z.number().int(),
    generation_parameters: z.union([z.object({}).partial().passthrough(), z.null()]).optional(),
    mesh_type: EMCellMeshType,
  })
  .passthrough();
const NestedSkeletonizationConfigRead = z
  .object({
    name: z.string(),
    description: z.string(),
    id: z.string().uuid(),
    type: z.union([EntityType, z.null()]).optional(),
    skeletonization_campaign_id: z.string().uuid(),
    em_cell_mesh_id: z.string().uuid(),
    scan_parameters: z.object({}).partial().passthrough(),
  })
  .passthrough();
const SkeletonizationCampaignRead = z
  .object({
    name: z.string(),
    description: z.string(),
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    assets: z.array(AssetRead),
    id: z.string().uuid(),
    type: z.union([EntityType, z.null()]).optional(),
    scan_parameters: z.object({}).partial().passthrough(),
    input_meshes: z.array(NestedEMCellMeshRead),
    skeletonization_configs: z.array(NestedSkeletonizationConfigRead),
  })
  .passthrough();
const ListResponse_SkeletonizationCampaignRead_ = z
  .object({
    data: z.array(SkeletonizationCampaignRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const SkeletonizationCampaignCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    scan_parameters: z.object({}).partial().passthrough(),
  })
  .passthrough();
const SkeletonizationCampaignUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    scan_parameters: z
      .union([z.object({}).partial().passthrough(), z.string(), z.null()])
      .default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const SkeletonizationConfigRead = z
  .object({
    name: z.string(),
    description: z.string(),
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    assets: z.array(AssetRead),
    id: z.string().uuid(),
    type: z.union([EntityType, z.null()]).optional(),
    skeletonization_campaign_id: z.string().uuid(),
    em_cell_mesh_id: z.string().uuid(),
    scan_parameters: z.object({}).partial().passthrough(),
  })
  .passthrough();
const ListResponse_SkeletonizationConfigRead_ = z
  .object({
    data: z.array(SkeletonizationConfigRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const SkeletonizationConfigCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    skeletonization_campaign_id: z.string().uuid(),
    em_cell_mesh_id: z.string().uuid(),
    scan_parameters: z.object({}).partial().passthrough(),
  })
  .passthrough();
const SkeletonizationConfigUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    skeletonization_campaign_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    em_cell_mesh_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    scan_parameters: z
      .union([z.object({}).partial().passthrough(), z.string(), z.null()])
      .default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const SkeletonizationConfigGenerationRead = z
  .object({
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    id: z.string().uuid(),
    type: z.union([ActivityType, z.null()]).optional(),
    start_time: z.union([z.string(), z.null()]).optional(),
    end_time: z.union([z.string(), z.null()]).optional(),
    status: ActivityStatus.optional(),
    used: z.array(NestedEntityRead),
    generated: z.array(NestedEntityRead),
  })
  .passthrough();
const ListResponse_SkeletonizationConfigGenerationRead_ = z
  .object({
    data: z.array(SkeletonizationConfigGenerationRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const SkeletonizationConfigGenerationCreate = z
  .object({
    authorized_public: z.boolean().default(false),
    start_time: z.union([z.string(), z.null()]),
    end_time: z.union([z.string(), z.null()]),
    status: ActivityStatus,
    used_ids: z.array(z.string().uuid()).default([]),
    generated_ids: z.array(z.string().uuid()).default([]),
  })
  .partial()
  .passthrough();
const SkeletonizationConfigGenerationUserUpdate = z
  .object({
    start_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    end_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    generated_ids: z.union([z.array(z.string().uuid()), NotSet, z.null()]).default('<NOT_SET>'),
    status: z.union([ActivityStatus, NotSet, z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const SkeletonizationExecutionRead = z
  .object({
    executor: z.union([ExecutorType, z.null()]).optional(),
    execution_id: z.union([z.string(), z.null()]).optional(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    id: z.string().uuid(),
    type: z.union([ActivityType, z.null()]).optional(),
    start_time: z.union([z.string(), z.null()]).optional(),
    end_time: z.union([z.string(), z.null()]).optional(),
    status: ActivityStatus.optional(),
    used: z.array(NestedEntityRead),
    generated: z.array(NestedEntityRead),
  })
  .passthrough();
const ListResponse_SkeletonizationExecutionRead_ = z
  .object({
    data: z.array(SkeletonizationExecutionRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const SkeletonizationExecutionCreate = z
  .object({
    executor: z.union([ExecutorType, z.null()]),
    execution_id: z.union([z.string(), z.null()]),
    authorized_public: z.boolean().default(false),
    start_time: z.union([z.string(), z.null()]),
    end_time: z.union([z.string(), z.null()]),
    status: ActivityStatus,
    used_ids: z.array(z.string().uuid()).default([]),
    generated_ids: z.array(z.string().uuid()).default([]),
  })
  .partial()
  .passthrough();
const SkeletonizationExecutionUserUpdate = z
  .object({
    executor: z.union([ExecutorType, z.null()]),
    execution_id: z.union([z.string(), z.null()]),
    start_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    end_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    generated_ids: z.union([z.array(z.string().uuid()), NotSet, z.null()]).default('<NOT_SET>'),
    status: z.union([ActivityStatus, NotSet, z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const SimulationRead = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    assets: z.array(AssetRead),
    id: z.string().uuid(),
    type: z.union([EntityType, z.null()]).optional(),
    simulation_campaign_id: z.string().uuid(),
    entity_id: z.string().uuid(),
    scan_parameters: z.object({}).partial().passthrough(),
    number_neurons: z.number().int(),
  })
  .passthrough();
const ListResponse_SimulationRead_ = z
  .object({
    data: z.array(SimulationRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const SimulationCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    simulation_campaign_id: z.string().uuid(),
    entity_id: z.string().uuid(),
    scan_parameters: z.object({}).partial().passthrough(),
    number_neurons: z.number().int(),
  })
  .passthrough();
const SimulationUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    simulation_campaign_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    entity_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    scan_parameters: z
      .union([z.object({}).partial().passthrough(), z.string(), z.null()])
      .default('<NOT_SET>'),
    number_neurons: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const entity__type = z.union([z.enum(['circuit', 'memodel']), z.null()]).optional();
const NestedSimulationRead = z
  .object({
    name: z.string(),
    description: z.string(),
    id: z.string().uuid(),
    type: z.union([EntityType, z.null()]).optional(),
    simulation_campaign_id: z.string().uuid(),
    entity_id: z.string().uuid(),
    scan_parameters: z.object({}).partial().passthrough(),
    number_neurons: z.number().int(),
  })
  .passthrough();
const SimulationCampaignRead = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    assets: z.array(AssetRead),
    id: z.string().uuid(),
    type: z.union([EntityType, z.null()]).optional(),
    scan_parameters: z.object({}).partial().passthrough(),
    entity_id: z.string().uuid(),
    simulations: z.array(NestedSimulationRead),
  })
  .passthrough();
const ListResponse_SimulationCampaignRead_ = z
  .object({
    data: z.array(SimulationCampaignRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const SimulationCampaignCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    scan_parameters: z.object({}).partial().passthrough(),
    entity_id: z.string().uuid(),
  })
  .passthrough();
const SimulationCampaignUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    scan_parameters: z
      .union([z.object({}).partial().passthrough(), z.string(), z.null()])
      .default('<NOT_SET>'),
    entity_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const SimulationExecutionRead = z
  .object({
    executor: z.union([ExecutorType, z.null()]).optional(),
    execution_id: z.union([z.string(), z.null()]).optional(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    id: z.string().uuid(),
    type: z.union([ActivityType, z.null()]).optional(),
    start_time: z.union([z.string(), z.null()]).optional(),
    end_time: z.union([z.string(), z.null()]).optional(),
    status: ActivityStatus.optional(),
    used: z.array(NestedEntityRead),
    generated: z.array(NestedEntityRead),
  })
  .passthrough();
const ListResponse_SimulationExecutionRead_ = z
  .object({
    data: z.array(SimulationExecutionRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const SimulationExecutionCreate = z
  .object({
    executor: z.union([ExecutorType, z.null()]),
    execution_id: z.union([z.string(), z.null()]),
    authorized_public: z.boolean().default(false),
    start_time: z.union([z.string(), z.null()]),
    end_time: z.union([z.string(), z.null()]),
    status: ActivityStatus,
    used_ids: z.array(z.string().uuid()).default([]),
    generated_ids: z.array(z.string().uuid()).default([]),
  })
  .partial()
  .passthrough();
const SimulationExecutionUserUpdate = z
  .object({
    executor: z.union([ExecutorType, z.null()]),
    execution_id: z.union([z.string(), z.null()]),
    start_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    end_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    generated_ids: z.union([z.array(z.string().uuid()), NotSet, z.null()]).default('<NOT_SET>'),
    status: z.union([ActivityStatus, NotSet, z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const SimulationGenerationRead = z
  .object({
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    id: z.string().uuid(),
    type: z.union([ActivityType, z.null()]).optional(),
    start_time: z.union([z.string(), z.null()]).optional(),
    end_time: z.union([z.string(), z.null()]).optional(),
    status: ActivityStatus.optional(),
    used: z.array(NestedEntityRead),
    generated: z.array(NestedEntityRead),
  })
  .passthrough();
const ListResponse_SimulationGenerationRead_ = z
  .object({
    data: z.array(SimulationGenerationRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const SimulationGenerationCreate = z
  .object({
    authorized_public: z.boolean().default(false),
    start_time: z.union([z.string(), z.null()]),
    end_time: z.union([z.string(), z.null()]),
    status: ActivityStatus,
    used_ids: z.array(z.string().uuid()).default([]),
    generated_ids: z.array(z.string().uuid()).default([]),
  })
  .partial()
  .passthrough();
const SimulationGenerationUserUpdate = z
  .object({
    start_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    end_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    generated_ids: z.union([z.array(z.string().uuid()), NotSet, z.null()]).default('<NOT_SET>'),
    status: z.union([ActivityStatus, NotSet, z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const SimulationResultRead = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    assets: z.array(AssetRead),
    id: z.string().uuid(),
    type: z.union([EntityType, z.null()]).optional(),
    simulation_id: z.string().uuid(),
  })
  .passthrough();
const ListResponse_SimulationResultRead_ = z
  .object({
    data: z.array(SimulationResultRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const SimulationResultCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    simulation_id: z.string().uuid(),
  })
  .passthrough();
const SimulationResultUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    simulation_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const me_model__validation_status = z.union([ValidationStatus, z.null()]).optional();
const NestedMEModel = z
  .object({
    name: z.string(),
    description: z.string(),
    id: z.string().uuid(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    validation_status: ValidationStatus.optional(),
    mtypes: z.union([z.array(AnnotationRead), z.null()]),
    etypes: z.union([z.array(AnnotationRead), z.null()]),
  })
  .passthrough();
const SingleNeuronSimulationRead = z
  .object({
    name: z.string(),
    description: z.string(),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    assets: z.array(AssetRead),
    type: z.union([EntityType, z.null()]).optional(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    brain_region: NestedBrainRegionRead,
    seed: z.number().int(),
    injection_location: z.array(z.string()),
    recording_location: z.array(z.string()),
    me_model: NestedMEModel,
  })
  .passthrough();
const ListResponse_SingleNeuronSimulationRead_ = z
  .object({
    data: z.array(SingleNeuronSimulationRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const SingleNeuronSimulationCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    brain_region_id: z.string().uuid(),
    authorized_public: z.boolean().optional().default(false),
    seed: z.number().int(),
    injection_location: z.array(z.string()),
    recording_location: z.array(z.string()),
    me_model_id: z.string().uuid(),
  })
  .passthrough();
const SingleNeuronSimulationUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    brain_region_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    seed: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    injection_location: z.union([z.array(z.string()), z.string(), z.null()]).default('<NOT_SET>'),
    recording_location: z.union([z.array(z.string()), z.string(), z.null()]).default('<NOT_SET>'),
    me_model_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const SingleNeuronSynaptomeRead = z
  .object({
    name: z.string(),
    description: z.string(),
    brain_region: NestedBrainRegionRead,
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    assets: z.array(AssetRead),
    type: z.union([EntityType, z.null()]).optional(),
    contributions: z.union([z.array(NestedContributionRead), z.null()]),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    seed: z.number().int(),
    me_model: NestedMEModel,
  })
  .passthrough();
const ListResponse_SingleNeuronSynaptomeRead_ = z
  .object({
    data: z.array(SingleNeuronSynaptomeRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const SingleNeuronSynaptomeCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    authorized_public: z.boolean().optional().default(false),
    seed: z.number().int(),
    me_model_id: z.string().uuid(),
    brain_region_id: z.string().uuid(),
  })
  .passthrough();
const SingleNeuronSynaptomeUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    seed: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    me_model_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    brain_region_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const NestedSynaptome = z
  .object({
    name: z.string(),
    description: z.string(),
    id: z.string().uuid(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    seed: z.number().int(),
  })
  .passthrough();
const SingleNeuronSynaptomeSimulationRead = z
  .object({
    name: z.string(),
    description: z.string(),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    assets: z.array(AssetRead),
    type: z.union([EntityType, z.null()]).optional(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    brain_region: NestedBrainRegionRead,
    seed: z.number().int(),
    injection_location: z.array(z.string()),
    recording_location: z.array(z.string()),
    synaptome: NestedSynaptome,
  })
  .passthrough();
const ListResponse_SingleNeuronSynaptomeSimulationRead_ = z
  .object({
    data: z.array(SingleNeuronSynaptomeSimulationRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const SingleNeuronSynaptomeSimulationCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    brain_region_id: z.string().uuid(),
    authorized_public: z.boolean().optional().default(false),
    seed: z.number().int(),
    injection_location: z.array(z.string()),
    recording_location: z.array(z.string()),
    synaptome_id: z.string().uuid(),
  })
  .passthrough();
const SingleNeuronSynaptomeSimulationUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    brain_region_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    seed: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    injection_location: z.union([z.array(z.string()), z.string(), z.null()]).default('<NOT_SET>'),
    recording_location: z.union([z.array(z.string()), z.string(), z.null()]).default('<NOT_SET>'),
    synaptome_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const SpeciesRead = z
  .object({
    id: z.string().uuid(),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    name: z.string(),
    taxonomy_id: z.string(),
  })
  .passthrough();
const ListResponse_SpeciesRead_ = z
  .object({
    data: z.array(SpeciesRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const SpeciesCreate = z.object({ name: z.string(), taxonomy_id: z.string() }).passthrough();
const SpeciesAdminUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    taxonomy_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const StrainRead = z
  .object({
    id: z.string().uuid(),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    name: z.string(),
    taxonomy_id: z.string(),
    species_id: z.string().uuid(),
  })
  .passthrough();
const ListResponse_StrainRead_ = z
  .object({
    data: z.array(StrainRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const StrainCreate = z
  .object({ name: z.string(), taxonomy_id: z.string(), species_id: z.string().uuid() })
  .passthrough();
const StrainAdminUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    taxonomy_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    species_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const SubjectRead = z
  .object({
    name: z.string(),
    description: z.string(),
    id: z.string().uuid(),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    sex: Sex,
    weight: z.union([z.number(), z.null()]).optional(),
    age_value: z.union([z.number(), z.null()]).optional(),
    age_min: z.union([z.number(), z.null()]).optional(),
    age_max: z.union([z.number(), z.null()]).optional(),
    age_period: z.union([AgePeriod, z.null()]).optional(),
    species: NestedSpeciesRead,
    strain: z.union([NestedStrainRead, z.null()]),
  })
  .passthrough();
const ListResponse_SubjectRead_ = z
  .object({
    data: z.array(SubjectRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const SubjectCreate = z
  .object({
    name: z.string(),
    description: z.string(),
    sex: Sex,
    weight: z.union([z.number(), z.null()]).optional(),
    age_value: z.union([z.number(), z.null()]).optional(),
    age_min: z.union([z.number(), z.null()]).optional(),
    age_max: z.union([z.number(), z.null()]).optional(),
    age_period: z.union([AgePeriod, z.null()]).optional(),
    authorized_public: z.boolean().optional().default(false),
    species_id: z.string().uuid(),
    strain_id: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const SubjectUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    description: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    sex: z.union([Sex, z.string(), z.null()]).default('<NOT_SET>'),
    weight: z.union([z.number(), z.string(), z.null()]).default('<NOT_SET>'),
    age_value: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    age_min: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    age_max: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    age_period: z.union([AgePeriod, z.string(), z.null()]).default('<NOT_SET>'),
    species_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    strain_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const ValidationRead = z
  .object({
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    id: z.string().uuid(),
    type: z.union([ActivityType, z.null()]).optional(),
    start_time: z.union([z.string(), z.null()]).optional(),
    end_time: z.union([z.string(), z.null()]).optional(),
    status: ActivityStatus.optional(),
    used: z.array(NestedEntityRead),
    generated: z.array(NestedEntityRead),
  })
  .passthrough();
const ListResponse_ValidationRead_ = z
  .object({
    data: z.array(ValidationRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const ValidationCreate = z
  .object({
    authorized_public: z.boolean().default(false),
    start_time: z.union([z.string(), z.null()]),
    end_time: z.union([z.string(), z.null()]),
    status: ActivityStatus,
    used_ids: z.array(z.string().uuid()).default([]),
    generated_ids: z.array(z.string().uuid()).default([]),
  })
  .partial()
  .passthrough();
const ValidationUserUpdate = z
  .object({
    start_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    end_time: z.union([z.string(), NotSet, z.null()]).default('<NOT_SET>'),
    generated_ids: z.union([z.array(z.string().uuid()), NotSet, z.null()]).default('<NOT_SET>'),
    status: z.union([ActivityStatus, NotSet, z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const ValidationResultRead = z
  .object({
    assets: z.array(AssetRead),
    authorized_project_id: z.string(),
    authorized_public: z.boolean().optional().default(false),
    created_by: NestedPersonRead,
    updated_by: NestedPersonRead,
    id: z.string().uuid(),
    creation_date: z.string().datetime({ offset: true }),
    update_date: z.string().datetime({ offset: true }),
    name: z.string(),
    passed: z.boolean(),
    validated_entity_id: z.string().uuid(),
  })
  .passthrough();
const ListResponse_ValidationResultRead_ = z
  .object({
    data: z.array(ValidationResultRead),
    pagination: PaginationResponse,
    facets: z.union([Facets, z.null()]).optional(),
  })
  .passthrough();
const ValidationResultCreate = z
  .object({
    authorized_public: z.boolean().optional().default(false),
    name: z.string(),
    passed: z.boolean(),
    validated_entity_id: z.string().uuid(),
  })
  .passthrough();
const ValidationResultUserUpdate = z
  .object({
    name: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
    passed: z.union([z.boolean(), z.string(), z.null()]).default('<NOT_SET>'),
    validated_entity_id: z.union([z.string(), z.string(), z.null()]).default('<NOT_SET>'),
  })
  .partial()
  .passthrough();
const EntityRoute = z.enum([
  'analysis-software-source-code',
  'brain-atlas',
  'brain-atlas-region',
  'cell-composition',
  'cell-morphology',
  'cell-morphology-protocol',
  'electrical-cell-recording',
  'electrical-recording',
  'electrical-recording-stimulus',
  'emodel',
  'experimental-bouton-density',
  'experimental-neuron-density',
  'experimental-synapses-per-connection',
  'external-url',
  'ion-channel-model',
  'ion-channel-modeling-campaign',
  'ion-channel-modeling-config',
  'ion-channel-recording',
  'memodel',
  'memodel-calibration-result',
  'me-type-density',
  'simulation',
  'simulation-campaign',
  'simulation-result',
  'scientific-artifact',
  'single-neuron-simulation',
  'single-neuron-synaptome',
  'single-neuron-synaptome-simulation',
  'subject',
  'validation-result',
  'circuit',
  'circuit-extraction-campaign',
  'circuit-extraction-config',
  'em-dense-reconstruction-dataset',
  'em-cell-mesh',
  'analysis-notebook-template',
  'analysis-notebook-environment',
  'analysis-notebook-result',
  'skeletonization-config',
  'skeletonization-campaign',
]);

export const schemas = {
  ApiErrorCode,
  ErrorResponse,
  virtual_lab_id,
  ContentType,
  AssetLabel,
  StorageType,
  AssetStatus,
  AssetRead,
  PaginationResponse,
  Facet,
  Facets,
  ListResponse_AssetRead_,
  Body_upload_entity_asset__entity_route___entity_id__assets_post,
  AssetRegister,
  DirectoryUpload,
  AssetAndPresignedURLS,
  DetailedFile,
  DetailedFileList,
  authorized_public,
  id__in,
  contribution__pref_label__in,
  AgentType,
  contribution__type,
  NestedPersonRead,
  EntityType,
  PythonRuntimeInfo,
  DockerRuntimeInfo,
  OsRuntimeInfo,
  RuntimeInfo,
  AnalysisNotebookEnvironmentRead,
  ListResponse_AnalysisNotebookEnvironmentRead_,
  AnalysisNotebookEnvironmentCreate,
  AnalysisNotebookEnvironmentUpdate,
  DeleteResponse,
  ExecutorType,
  executor,
  ActivityStatus,
  status,
  used__type,
  ActivityType,
  NestedEntityRead,
  PythonDependency,
  DockerDependency,
  AnalysisNotebookTemplateInputType,
  AnalysisNotebookTemplateSpecifications_Output,
  AnalysisScale,
  NestedAnalysisNotebookTemplateRead,
  NestedAnalysisNotebookEnvironmentRead,
  AnalysisNotebookExecutionRead,
  ListResponse_AnalysisNotebookExecutionRead_,
  AnalysisNotebookExecutionCreate,
  NotSet,
  AnalysisNotebookExecutionUpdate,
  AnalysisNotebookResultRead,
  ListResponse_AnalysisNotebookResultRead_,
  AnalysisNotebookResultCreate,
  AnalysisNotebookResultUpdate,
  NestedOrganizationRead,
  NestedConsortiumRead,
  AgentRead,
  RoleRead,
  NestedContributionRead,
  AnalysisNotebookTemplateRead,
  ListResponse_AnalysisNotebookTemplateRead_,
  AnalysisNotebookTemplateSpecifications_Input,
  AnalysisNotebookTemplateCreate,
  AnalysisNotebookTemplateUpdate,
  NestedSpeciesRead,
  BrainAtlasRead,
  ListResponse_BrainAtlasRead_,
  BrainAtlasCreate,
  BrainAtlasUpdate,
  BrainAtlasRegionRead,
  ListResponse_BrainAtlasRegionRead_,
  BrainAtlasRegionCreate,
  BrainAtlasRegionUpdate,
  annotation_value,
  NestedStrainRead,
  BrainRegionRead,
  ListResponse_BrainRegionRead_,
  BrainRegionCreate,
  BrainRegionAdminUpdate,
  BrainRegionHierarchyRead,
  ListResponse_BrainRegionHierarchyRead_,
  BrainRegionHierarchyCreate,
  BrainRegionHierarchyAdminUpdate,
  CalibrationRead,
  ListResponse_CalibrationRead_,
  CalibrationCreate,
  CalibrationUserUpdate,
  CellCompositionRead,
  ListResponse_CellCompositionRead_,
  StructuralDomain,
  measurement_kind__structural_domain,
  MeasurementStatistic,
  measurement_item__name,
  MeasurementUnit,
  measurement_item__unit,
  CellMorphologyGenerationType,
  cell_morphology_protocol__generation_type,
  cell_morphology_protocol__generation_type__in,
  WithinBrainRegionDirection,
  within_brain_region_direction,
  LicenseRead,
  NestedBrainRegionRead,
  Sex,
  AgePeriod,
  NestedSubjectRead,
  PointLocationBase,
  RepairPipelineType,
  AnnotationRead,
  CellMorphologyProtocolDesign,
  StainingType,
  SlicingDirectionType,
  NestedDigitalReconstructionCellMorphologyProtocolRead,
  ModifiedMorphologyMethodType,
  NestedModifiedReconstructionCellMorphologyProtocolRead,
  NestedComputationallySynthesizedCellMorphologyProtocolRead,
  NestedPlaceholderCellMorphologyProtocolRead,
  NestedCellMorphologyProtocolRead,
  CellMorphologyRead,
  ListResponse_CellMorphologyRead_,
  CellMorphologyCreate,
  ExpandableAttribute,
  expand,
  MeasurableEntity,
  MeasurementItem,
  MeasurementKindRead,
  MeasurementAnnotationRead,
  CellMorphologyAnnotationExpandedRead,
  CellMorphologyUserUpdate,
  DigitalReconstructionCellMorphologyProtocolRead,
  ModifiedReconstructionCellMorphologyProtocolRead,
  ComputationallySynthesizedCellMorphologyProtocolRead,
  PlaceholderCellMorphologyProtocolRead,
  CellMorphologyProtocolRead,
  ListResponse_CellMorphologyProtocolRead_,
  DigitalReconstructionCellMorphologyProtocolCreate,
  ModifiedReconstructionCellMorphologyProtocolCreate,
  ComputationallySynthesizedCellMorphologyProtocolCreate,
  PlaceholderCellMorphologyProtocolCreate,
  CellMorphologyProtocolCreate,
  DerivationType,
  HierarchyNode,
  HierarchyTree,
  CircuitScale,
  scale,
  scale__in,
  CircuitBuildCategory,
  build_category,
  build_category__in,
  CircuitRead,
  ListResponse_CircuitRead_,
  CircuitCreate,
  CircuitUserUpdate,
  CircuitExtractionCampaignRead,
  ListResponse_CircuitExtractionCampaignRead_,
  CircuitExtractionCampaignCreate,
  CircuitExtractionCampaignUserUpdate,
  CircuitExtractionConfigRead,
  ListResponse_CircuitExtractionConfigRead_,
  CircuitExtractionConfigCreate,
  CircuitExtractionConfigUserUpdate,
  CircuitExtractionConfigGenerationRead,
  ListResponse_CircuitExtractionConfigGenerationRead_,
  CircuitExtractionConfigGenerationCreate,
  CircuitExtractionConfigGenerationUserUpdate,
  CircuitExtractionExecutionRead,
  ListResponse_CircuitExtractionExecutionRead_,
  CircuitExtractionExecutionCreate,
  CircuitExtractionExecutionUserUpdate,
  ConsortiumRead,
  ListResponse_ConsortiumRead_,
  ConsortiumCreate,
  ContributionRead,
  ListResponse_ContributionRead_,
  ContributionCreate,
  BasicEntityRead,
  ListResponse_BasicEntityRead_,
  DerivationRead,
  DerivationCreate,
  ElectricalRecordingType,
  recording_type,
  recording_type__in,
  ElectricalRecordingOrigin,
  recording_origin,
  recording_origin__in,
  ElectricalRecordingStimulusType,
  ElectricalRecordingStimulusShape,
  NestedElectricalRecordingStimulusRead,
  ElectricalCellRecordingRead,
  ListResponse_ElectricalCellRecordingRead_,
  ElectricalCellRecordingCreate,
  ElectricalCellRecordingUserUpdate,
  shape,
  injection_type,
  ElectricalRecordingStimulusRead,
  ListResponse_ElectricalRecordingStimulusRead_,
  ElectricalRecordingStimulusCreate,
  ElectricalRecordingStimulusUserUpdate,
  EMCellMeshType,
  mesh_type,
  EMCellMeshGenerationMethod,
  EMCellMeshRead,
  ListResponse_EMCellMeshRead_,
  EMCellMeshCreate,
  Expandable,
  expand__2,
  EMCellMeshAnnotationExpandedRead,
  EMCellMeshUserUpdate,
  EMDenseReconstructionDatasetRead,
  ListResponse_EMDenseReconstructionDatasetRead_,
  EMDenseReconstructionDatasetCreate,
  ExemplarMorphology,
  UseIon,
  NeuronBlock,
  IonChannelModelWAssets,
  EModelReadExpanded,
  ListResponse_EModelReadExpanded_,
  EModelCreate,
  EModelRead,
  EModelUserUpdate,
  EntityTypeWithBrainRegion,
  EntityCountRead,
  EntityRead,
  ListResponse_AnnotationRead_,
  AnnotationCreate,
  AnnotationAdminUpdate,
  ETypeClassificationCreate,
  ETypeClassificationRead,
  ListResponse_ETypeClassificationRead_,
  MeasurementRecordRead,
  ExperimentalBoutonDensityRead,
  ListResponse_ExperimentalBoutonDensityRead_,
  MeasurementRecordCreate,
  ExperimentalBoutonDensityCreate,
  ExperimentalBoutonDensityUserUpdate,
  ExperimentalNeuronDensityRead,
  ListResponse_ExperimentalNeuronDensityRead_,
  ExperimentalNeuronDensityCreate,
  ExperimentalNeuronDensityUserUpdate,
  ExperimentalSynapsesPerConnectionRead,
  ListResponse_ExperimentalSynapsesPerConnectionRead_,
  ExperimentalSynapsesPerConnectionCreate,
  ExperimentalSynapsesPerConnectionUserUpdate,
  ExternalSource,
  ExternalUrlRead,
  source,
  ListResponse_ExternalUrlRead_,
  ExternalUrlCreate,
  IonChannelRead,
  ListResponse_IonChannelRead_,
  IonChannelCreate,
  IonChannelAdminUpdate,
  IonChannelModelExpanded,
  ListResponse_IonChannelModelExpanded_,
  IonChannelModelCreate,
  IonChannelModelRead,
  IonChannelModelUserUpdate,
  NestedIonChannelRecordingRead,
  NestedIonChannelModelingConfigRead,
  IonChannelModelingCampaignRead,
  ListResponse_IonChannelModelingCampaignRead_,
  IonChannelModelingCampaignCreate,
  IonChannelModelingCampaignUserUpdate,
  IonChannelModelingConfigRead,
  ListResponse_IonChannelModelingConfigRead_,
  IonChannelModelingConfigCreate,
  IonChannelModelingConfigUserUpdate,
  IonChannelModelingConfigGenerationRead,
  ListResponse_IonChannelModelingConfigGenerationRead_,
  IonChannelModelingConfigGenerationCreate,
  IonChannelModelingConfigGenerationUserUpdate,
  IonChannelModelingExecutionRead,
  ListResponse_IonChannelModelingExecutionRead_,
  IonChannelModelingExecutionCreate,
  IonChannelModelingExecutionUserUpdate,
  NestedIonChannelRead,
  IonChannelRecordingRead,
  ListResponse_IonChannelRecordingRead_,
  IonChannelRecordingCreate,
  IonChannelRecordingUserUpdate,
  ListResponse_LicenseRead_,
  LicenseCreate,
  LicenseAdminUpdate,
  entity_type,
  ListResponse_MeasurementAnnotationRead_,
  MeasurementKindCreate,
  MeasurementAnnotationCreate,
  MeasurementAnnotationUserUpdate,
  MeasurementLabelRead,
  ListResponse_MeasurementLabelRead_,
  MeasurementLabelCreate,
  MeasurementLabelAdminUpdate,
  ValidationStatus,
  MEModelCalibrationResultRead,
  MEModelRead,
  ListResponse_MEModelRead_,
  MEModelCreate,
  MEModelUserUpdate,
  ListResponse_MEModelCalibrationResultRead_,
  MEModelCalibrationResultCreate,
  MEModelCalibrationResultUserUpdate,
  MTypeClassificationCreate,
  MTypeClassificationRead,
  ListResponse_MTypeClassificationRead_,
  OrganizationRead,
  ListResponse_OrganizationRead_,
  OrganizationCreate,
  PersonRead,
  ListResponse_PersonRead_,
  PersonCreate,
  Author,
  PublicationRead,
  PublicationAdminUpdate,
  publication_year__in,
  ListResponse_PublicationRead_,
  PublicationCreate,
  ListResponse_RoleRead_,
  RoleCreate,
  RoleAdminUpdate,
  NestedExternalUrlRead,
  NestedScientificArtifactRead,
  ScientificArtifactExternalUrlLinkRead,
  ListResponse_ScientificArtifactExternalUrlLinkRead_,
  ScientificArtifactExternalUrlLinkCreate,
  PublicationType,
  NestedPublicationRead,
  ScientificArtifactPublicationLinkRead,
  publication_type,
  ListResponse_ScientificArtifactPublicationLinkRead_,
  ScientificArtifactPublicationLinkCreate,
  NestedEMCellMeshRead,
  NestedSkeletonizationConfigRead,
  SkeletonizationCampaignRead,
  ListResponse_SkeletonizationCampaignRead_,
  SkeletonizationCampaignCreate,
  SkeletonizationCampaignUserUpdate,
  SkeletonizationConfigRead,
  ListResponse_SkeletonizationConfigRead_,
  SkeletonizationConfigCreate,
  SkeletonizationConfigUserUpdate,
  SkeletonizationConfigGenerationRead,
  ListResponse_SkeletonizationConfigGenerationRead_,
  SkeletonizationConfigGenerationCreate,
  SkeletonizationConfigGenerationUserUpdate,
  SkeletonizationExecutionRead,
  ListResponse_SkeletonizationExecutionRead_,
  SkeletonizationExecutionCreate,
  SkeletonizationExecutionUserUpdate,
  SimulationRead,
  ListResponse_SimulationRead_,
  SimulationCreate,
  SimulationUserUpdate,
  entity__type,
  NestedSimulationRead,
  SimulationCampaignRead,
  ListResponse_SimulationCampaignRead_,
  SimulationCampaignCreate,
  SimulationCampaignUserUpdate,
  SimulationExecutionRead,
  ListResponse_SimulationExecutionRead_,
  SimulationExecutionCreate,
  SimulationExecutionUserUpdate,
  SimulationGenerationRead,
  ListResponse_SimulationGenerationRead_,
  SimulationGenerationCreate,
  SimulationGenerationUserUpdate,
  SimulationResultRead,
  ListResponse_SimulationResultRead_,
  SimulationResultCreate,
  SimulationResultUserUpdate,
  me_model__validation_status,
  NestedMEModel,
  SingleNeuronSimulationRead,
  ListResponse_SingleNeuronSimulationRead_,
  SingleNeuronSimulationCreate,
  SingleNeuronSimulationUserUpdate,
  SingleNeuronSynaptomeRead,
  ListResponse_SingleNeuronSynaptomeRead_,
  SingleNeuronSynaptomeCreate,
  SingleNeuronSynaptomeUserUpdate,
  NestedSynaptome,
  SingleNeuronSynaptomeSimulationRead,
  ListResponse_SingleNeuronSynaptomeSimulationRead_,
  SingleNeuronSynaptomeSimulationCreate,
  SingleNeuronSynaptomeSimulationUserUpdate,
  SpeciesRead,
  ListResponse_SpeciesRead_,
  SpeciesCreate,
  SpeciesAdminUpdate,
  StrainRead,
  ListResponse_StrainRead_,
  StrainCreate,
  StrainAdminUpdate,
  SubjectRead,
  ListResponse_SubjectRead_,
  SubjectCreate,
  SubjectUserUpdate,
  ValidationRead,
  ListResponse_ValidationRead_,
  ValidationCreate,
  ValidationUserUpdate,
  ValidationResultRead,
  ListResponse_ValidationResultRead_,
  ValidationResultCreate,
  ValidationResultUserUpdate,
  EntityRoute,
};

const endpoints = makeApi([
  {
    method: 'get',
    path: '/',
    alias: 'root__get',
    description: `Root endpoint.`,
    requestFormat: 'json',
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/:entity_route/:entity_id/assets',
    alias: 'get_entity_assets__entity_route___entity_id__assets_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'entity_route',
        type: 'Path',
        schema: z.enum([
          'analysis-software-source-code',
          'brain-atlas',
          'brain-atlas-region',
          'cell-composition',
          'cell-morphology',
          'cell-morphology-protocol',
          'electrical-cell-recording',
          'electrical-recording',
          'electrical-recording-stimulus',
          'emodel',
          'experimental-bouton-density',
          'experimental-neuron-density',
          'experimental-synapses-per-connection',
          'external-url',
          'ion-channel-model',
          'ion-channel-modeling-campaign',
          'ion-channel-modeling-config',
          'ion-channel-recording',
          'memodel',
          'memodel-calibration-result',
          'me-type-density',
          'simulation',
          'simulation-campaign',
          'simulation-result',
          'scientific-artifact',
          'single-neuron-simulation',
          'single-neuron-synaptome',
          'single-neuron-synaptome-simulation',
          'subject',
          'validation-result',
          'circuit',
          'circuit-extraction-campaign',
          'circuit-extraction-config',
          'em-dense-reconstruction-dataset',
          'em-cell-mesh',
          'analysis-notebook-template',
          'analysis-notebook-environment',
          'analysis-notebook-result',
          'skeletonization-config',
          'skeletonization-campaign',
        ]),
      },
      {
        name: 'entity_id',
        type: 'Path',
        schema: z.string().uuid(),
      },
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
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
    response: ListResponse_AssetRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/:entity_route/:entity_id/assets',
    alias: 'upload_entity_asset__entity_route___entity_id__assets_post',
    description: `Upload an asset to be associated with the specified entity.

To be used only for small files.`,
    requestFormat: 'form-data',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: Body_upload_entity_asset__entity_route___entity_id__assets_post,
      },
      {
        name: 'entity_route',
        type: 'Path',
        schema: z.enum([
          'analysis-software-source-code',
          'brain-atlas',
          'brain-atlas-region',
          'cell-composition',
          'cell-morphology',
          'cell-morphology-protocol',
          'electrical-cell-recording',
          'electrical-recording',
          'electrical-recording-stimulus',
          'emodel',
          'experimental-bouton-density',
          'experimental-neuron-density',
          'experimental-synapses-per-connection',
          'external-url',
          'ion-channel-model',
          'ion-channel-modeling-campaign',
          'ion-channel-modeling-config',
          'ion-channel-recording',
          'memodel',
          'memodel-calibration-result',
          'me-type-density',
          'simulation',
          'simulation-campaign',
          'simulation-result',
          'scientific-artifact',
          'single-neuron-simulation',
          'single-neuron-synaptome',
          'single-neuron-synaptome-simulation',
          'subject',
          'validation-result',
          'circuit',
          'circuit-extraction-campaign',
          'circuit-extraction-config',
          'em-dense-reconstruction-dataset',
          'em-cell-mesh',
          'analysis-notebook-template',
          'analysis-notebook-environment',
          'analysis-notebook-result',
          'skeletonization-config',
          'skeletonization-campaign',
        ]),
      },
      {
        name: 'entity_id',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: AssetRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/:entity_route/:entity_id/assets/:asset_id',
    alias: 'get_entity_asset__entity_route___entity_id__assets__asset_id__get',
    description: `Return the metadata of an assets associated with a specific entity.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'entity_route',
        type: 'Path',
        schema: z.enum([
          'analysis-software-source-code',
          'brain-atlas',
          'brain-atlas-region',
          'cell-composition',
          'cell-morphology',
          'cell-morphology-protocol',
          'electrical-cell-recording',
          'electrical-recording',
          'electrical-recording-stimulus',
          'emodel',
          'experimental-bouton-density',
          'experimental-neuron-density',
          'experimental-synapses-per-connection',
          'external-url',
          'ion-channel-model',
          'ion-channel-modeling-campaign',
          'ion-channel-modeling-config',
          'ion-channel-recording',
          'memodel',
          'memodel-calibration-result',
          'me-type-density',
          'simulation',
          'simulation-campaign',
          'simulation-result',
          'scientific-artifact',
          'single-neuron-simulation',
          'single-neuron-synaptome',
          'single-neuron-synaptome-simulation',
          'subject',
          'validation-result',
          'circuit',
          'circuit-extraction-campaign',
          'circuit-extraction-config',
          'em-dense-reconstruction-dataset',
          'em-cell-mesh',
          'analysis-notebook-template',
          'analysis-notebook-environment',
          'analysis-notebook-result',
          'skeletonization-config',
          'skeletonization-campaign',
        ]),
      },
      {
        name: 'entity_id',
        type: 'Path',
        schema: z.string().uuid(),
      },
      {
        name: 'asset_id',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: AssetRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/:entity_route/:entity_id/assets/:asset_id',
    alias: 'delete_entity_asset__entity_route___entity_id__assets__asset_id__delete',
    description: `Delete an assets associated with a specific entity.

The file is actually deleted from S3, unless it&#x27;s stored in open data storage.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'entity_route',
        type: 'Path',
        schema: z.enum([
          'analysis-software-source-code',
          'brain-atlas',
          'brain-atlas-region',
          'cell-composition',
          'cell-morphology',
          'cell-morphology-protocol',
          'electrical-cell-recording',
          'electrical-recording',
          'electrical-recording-stimulus',
          'emodel',
          'experimental-bouton-density',
          'experimental-neuron-density',
          'experimental-synapses-per-connection',
          'external-url',
          'ion-channel-model',
          'ion-channel-modeling-campaign',
          'ion-channel-modeling-config',
          'ion-channel-recording',
          'memodel',
          'memodel-calibration-result',
          'me-type-density',
          'simulation',
          'simulation-campaign',
          'simulation-result',
          'scientific-artifact',
          'single-neuron-simulation',
          'single-neuron-synaptome',
          'single-neuron-synaptome-simulation',
          'subject',
          'validation-result',
          'circuit',
          'circuit-extraction-campaign',
          'circuit-extraction-config',
          'em-dense-reconstruction-dataset',
          'em-cell-mesh',
          'analysis-notebook-template',
          'analysis-notebook-environment',
          'analysis-notebook-result',
          'skeletonization-config',
          'skeletonization-campaign',
        ]),
      },
      {
        name: 'entity_id',
        type: 'Path',
        schema: z.string().uuid(),
      },
      {
        name: 'asset_id',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: AssetRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/:entity_route/:entity_id/assets/:asset_id/download',
    alias: 'download_entity_asset__entity_route___entity_id__assets__asset_id__download_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'entity_route',
        type: 'Path',
        schema: z.enum([
          'analysis-software-source-code',
          'brain-atlas',
          'brain-atlas-region',
          'cell-composition',
          'cell-morphology',
          'cell-morphology-protocol',
          'electrical-cell-recording',
          'electrical-recording',
          'electrical-recording-stimulus',
          'emodel',
          'experimental-bouton-density',
          'experimental-neuron-density',
          'experimental-synapses-per-connection',
          'external-url',
          'ion-channel-model',
          'ion-channel-modeling-campaign',
          'ion-channel-modeling-config',
          'ion-channel-recording',
          'memodel',
          'memodel-calibration-result',
          'me-type-density',
          'simulation',
          'simulation-campaign',
          'simulation-result',
          'scientific-artifact',
          'single-neuron-simulation',
          'single-neuron-synaptome',
          'single-neuron-synaptome-simulation',
          'subject',
          'validation-result',
          'circuit',
          'circuit-extraction-campaign',
          'circuit-extraction-config',
          'em-dense-reconstruction-dataset',
          'em-cell-mesh',
          'analysis-notebook-template',
          'analysis-notebook-environment',
          'analysis-notebook-result',
          'skeletonization-config',
          'skeletonization-campaign',
        ]),
      },
      {
        name: 'entity_id',
        type: 'Path',
        schema: z.string().uuid(),
      },
      {
        name: 'asset_id',
        type: 'Path',
        schema: z.string().uuid(),
      },
      {
        name: 'asset_path',
        type: 'Query',
        schema: virtual_lab_id,
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
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/:entity_route/:entity_id/assets/:asset_id/list',
    alias: 'entity_asset_directory_list__entity_route___entity_id__assets__asset_id__list_get',
    description: `Return the list of files in a directory asset.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'entity_route',
        type: 'Path',
        schema: z.enum([
          'analysis-software-source-code',
          'brain-atlas',
          'brain-atlas-region',
          'cell-composition',
          'cell-morphology',
          'cell-morphology-protocol',
          'electrical-cell-recording',
          'electrical-recording',
          'electrical-recording-stimulus',
          'emodel',
          'experimental-bouton-density',
          'experimental-neuron-density',
          'experimental-synapses-per-connection',
          'external-url',
          'ion-channel-model',
          'ion-channel-modeling-campaign',
          'ion-channel-modeling-config',
          'ion-channel-recording',
          'memodel',
          'memodel-calibration-result',
          'me-type-density',
          'simulation',
          'simulation-campaign',
          'simulation-result',
          'scientific-artifact',
          'single-neuron-simulation',
          'single-neuron-synaptome',
          'single-neuron-synaptome-simulation',
          'subject',
          'validation-result',
          'circuit',
          'circuit-extraction-campaign',
          'circuit-extraction-config',
          'em-dense-reconstruction-dataset',
          'em-cell-mesh',
          'analysis-notebook-template',
          'analysis-notebook-environment',
          'analysis-notebook-result',
          'skeletonization-config',
          'skeletonization-campaign',
        ]),
      },
      {
        name: 'entity_id',
        type: 'Path',
        schema: z.string().uuid(),
      },
      {
        name: 'asset_id',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: DetailedFileList,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/:entity_route/:entity_id/assets/directory/upload',
    alias: 'entity_asset_directory_upload__entity_route___entity_id__assets_directory_upload_post',
    description: `Given a list of full paths, return a dictionary of presigned URLS for uploading.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DirectoryUpload,
      },
      {
        name: 'entity_route',
        type: 'Path',
        schema: z.enum([
          'analysis-software-source-code',
          'brain-atlas',
          'brain-atlas-region',
          'cell-composition',
          'cell-morphology',
          'cell-morphology-protocol',
          'electrical-cell-recording',
          'electrical-recording',
          'electrical-recording-stimulus',
          'emodel',
          'experimental-bouton-density',
          'experimental-neuron-density',
          'experimental-synapses-per-connection',
          'external-url',
          'ion-channel-model',
          'ion-channel-modeling-campaign',
          'ion-channel-modeling-config',
          'ion-channel-recording',
          'memodel',
          'memodel-calibration-result',
          'me-type-density',
          'simulation',
          'simulation-campaign',
          'simulation-result',
          'scientific-artifact',
          'single-neuron-simulation',
          'single-neuron-synaptome',
          'single-neuron-synaptome-simulation',
          'subject',
          'validation-result',
          'circuit',
          'circuit-extraction-campaign',
          'circuit-extraction-config',
          'em-dense-reconstruction-dataset',
          'em-cell-mesh',
          'analysis-notebook-template',
          'analysis-notebook-environment',
          'analysis-notebook-result',
          'skeletonization-config',
          'skeletonization-campaign',
        ]),
      },
      {
        name: 'entity_id',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: AssetAndPresignedURLS,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/:entity_route/:entity_id/assets/register',
    alias: 'register_entity_asset__entity_route___entity_id__assets_register_post',
    description: `Register an asset already in cloud.

Only open data storage is supported for now.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: AssetRegister,
      },
      {
        name: 'entity_route',
        type: 'Path',
        schema: z.enum([
          'analysis-software-source-code',
          'brain-atlas',
          'brain-atlas-region',
          'cell-composition',
          'cell-morphology',
          'cell-morphology-protocol',
          'electrical-cell-recording',
          'electrical-recording',
          'electrical-recording-stimulus',
          'emodel',
          'experimental-bouton-density',
          'experimental-neuron-density',
          'experimental-synapses-per-connection',
          'external-url',
          'ion-channel-model',
          'ion-channel-modeling-campaign',
          'ion-channel-modeling-config',
          'ion-channel-recording',
          'memodel',
          'memodel-calibration-result',
          'me-type-density',
          'simulation',
          'simulation-campaign',
          'simulation-result',
          'scientific-artifact',
          'single-neuron-simulation',
          'single-neuron-synaptome',
          'single-neuron-synaptome-simulation',
          'subject',
          'validation-result',
          'circuit',
          'circuit-extraction-campaign',
          'circuit-extraction-config',
          'em-dense-reconstruction-dataset',
          'em-cell-mesh',
          'analysis-notebook-template',
          'analysis-notebook-environment',
          'analysis-notebook-result',
          'skeletonization-config',
          'skeletonization-campaign',
        ]),
      },
      {
        name: 'entity_id',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: AssetRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/:entity_route/:entity_id/derived-from',
    alias: 'read_many__entity_route___entity_id__derived_from_get',
    description: `Return a list of basic entities used to generate the specified entity.

Only the used entities that are accessible by the user are returned.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'entity_route',
        type: 'Path',
        schema: z.enum([
          'analysis-software-source-code',
          'brain-atlas',
          'brain-atlas-region',
          'cell-composition',
          'cell-morphology',
          'cell-morphology-protocol',
          'electrical-cell-recording',
          'electrical-recording',
          'electrical-recording-stimulus',
          'emodel',
          'experimental-bouton-density',
          'experimental-neuron-density',
          'experimental-synapses-per-connection',
          'external-url',
          'ion-channel-model',
          'ion-channel-modeling-campaign',
          'ion-channel-modeling-config',
          'ion-channel-recording',
          'memodel',
          'memodel-calibration-result',
          'me-type-density',
          'simulation',
          'simulation-campaign',
          'simulation-result',
          'scientific-artifact',
          'single-neuron-simulation',
          'single-neuron-synaptome',
          'single-neuron-synaptome-simulation',
          'subject',
          'validation-result',
          'circuit',
          'circuit-extraction-campaign',
          'circuit-extraction-config',
          'em-dense-reconstruction-dataset',
          'em-cell-mesh',
          'analysis-notebook-template',
          'analysis-notebook-environment',
          'analysis-notebook-result',
          'skeletonization-config',
          'skeletonization-campaign',
        ]),
      },
      {
        name: 'entity_id',
        type: 'Path',
        schema: z.string().uuid(),
      },
      {
        name: 'derivation_type',
        type: 'Query',
        schema: z.enum(['circuit_extraction', 'circuit_rewiring', 'unspecified']),
      },
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
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
    response: ListResponse_BasicEntityRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/analysis-notebook-environment',
    alias: 'read_many_analysis_notebook_environment_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_AnalysisNotebookEnvironmentRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/analysis-notebook-environment',
    alias: 'create_one_analysis_notebook_environment_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: AnalysisNotebookEnvironmentCreate,
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
    response: AnalysisNotebookEnvironmentRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/analysis-notebook-environment/:id_',
    alias: 'read_one_analysis_notebook_environment__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: AnalysisNotebookEnvironmentRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/analysis-notebook-environment/:id_',
    alias: 'update_one_analysis_notebook_environment__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: AnalysisNotebookEnvironmentUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: AnalysisNotebookEnvironmentRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/analysis-notebook-environment/:id_',
    alias: 'delete_one_analysis_notebook_environment__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/analysis-notebook-execution',
    alias: 'read_many_analysis_notebook_execution_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'executor',
        type: 'Query',
        schema: executor,
      },
      {
        name: 'execution_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'start_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'end_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'status',
        type: 'Query',
        schema: status,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'used__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'generated__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'generated__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'generated__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_AnalysisNotebookExecutionRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/analysis-notebook-execution',
    alias: 'create_one_analysis_notebook_execution_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: AnalysisNotebookExecutionCreate,
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
    response: AnalysisNotebookExecutionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/analysis-notebook-execution/:id_',
    alias: 'read_one_analysis_notebook_execution__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: AnalysisNotebookExecutionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/analysis-notebook-execution/:id_',
    alias: 'delete_one_analysis_notebook_execution__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/analysis-notebook-execution/:id_',
    alias: 'update_one_analysis_notebook_execution__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: AnalysisNotebookExecutionUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: AnalysisNotebookExecutionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/analysis-notebook-result',
    alias: 'read_many_analysis_notebook_result_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_AnalysisNotebookResultRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/analysis-notebook-result',
    alias: 'create_one_analysis_notebook_result_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: AnalysisNotebookResultCreate,
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
    response: AnalysisNotebookResultRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/analysis-notebook-result/:id_',
    alias: 'read_one_analysis_notebook_result__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: AnalysisNotebookResultRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/analysis-notebook-result/:id_',
    alias: 'update_one_analysis_notebook_result__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: AnalysisNotebookResultUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: AnalysisNotebookResultRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/analysis-notebook-result/:id_',
    alias: 'delete_one_analysis_notebook_result__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/analysis-notebook-template',
    alias: 'read_many_analysis_notebook_template_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_AnalysisNotebookTemplateRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/analysis-notebook-template',
    alias: 'create_one_analysis_notebook_template_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: AnalysisNotebookTemplateCreate,
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
    response: AnalysisNotebookTemplateRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/analysis-notebook-template/:id_',
    alias: 'read_one_analysis_notebook_template__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: AnalysisNotebookTemplateRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/analysis-notebook-template/:id_',
    alias: 'update_one_analysis_notebook_template__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: AnalysisNotebookTemplateUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: AnalysisNotebookTemplateRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/analysis-notebook-template/:id_',
    alias: 'delete_one_analysis_notebook_template__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/brain-atlas',
    alias: 'read_many_brain_atlas_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'species_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['name']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
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
    response: ListResponse_BrainAtlasRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/brain-atlas',
    alias: 'create_one_brain_atlas_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: BrainAtlasCreate,
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
    response: BrainAtlasRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/brain-atlas-region',
    alias: 'read_many_brain_atlas_region_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_BrainAtlasRegionRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/brain-atlas-region',
    alias: 'create_one_brain_atlas_region_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: BrainAtlasRegionCreate,
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
    response: BrainAtlasRegionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/brain-atlas-region/:id_',
    alias: 'read_one_brain_atlas_region__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: BrainAtlasRegionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/brain-atlas-region/:id_',
    alias: 'update_one_brain_atlas_region__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: BrainAtlasRegionUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: BrainAtlasRegionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/brain-atlas-region/:id_',
    alias: 'delete_one_brain_atlas_region__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/brain-atlas/:atlas_id',
    alias: 'read_one_brain_atlas__atlas_id__get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'atlas_id',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: BrainAtlasRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/brain-atlas/:atlas_id/regions',
    alias: 'read_many_region_brain_atlas__atlas_id__regions_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'atlas_id',
        type: 'Path',
        schema: z.string().uuid(),
      },
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
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
    response: ListResponse_BrainAtlasRegionRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/brain-atlas/:atlas_id/regions/:atlas_region_id',
    alias: 'read_one_region_brain_atlas__atlas_id__regions__atlas_region_id__get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'atlas_id',
        type: 'Path',
        schema: z.string().uuid(),
      },
      {
        name: 'atlas_region_id',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: BrainAtlasRegionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/brain-atlas/:id_',
    alias: 'update_one_brain_atlas__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: BrainAtlasUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: BrainAtlasRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/brain-atlas/:id_',
    alias: 'delete_one_brain_atlas__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/brain-region',
    alias: 'read_many_brain_region_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'semantic_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['name']),
      },
      {
        name: 'species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'strain__id__in',
        type: 'Query',
        schema: id__in,
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
    response: ListResponse_BrainRegionRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/brain-region',
    alias: 'create_one_brain_region_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: BrainRegionCreate,
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
    response: BrainRegionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/brain-region-hierarchy',
    alias: 'read_many_brain_region_hierarchy_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'species_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['name']),
      },
      {
        name: 'species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_BrainRegionHierarchyRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/brain-region-hierarchy',
    alias: 'create_one_brain_region_hierarchy_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: BrainRegionHierarchyCreate,
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
    response: BrainRegionHierarchyRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/brain-region-hierarchy/:id_',
    alias: 'read_one_brain_region_hierarchy__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: BrainRegionHierarchyRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/brain-region-hierarchy/:id_',
    alias: 'update_one_brain_region_hierarchy__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: BrainRegionHierarchyAdminUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: BrainRegionHierarchyRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/brain-region-hierarchy/:id_',
    alias: 'delete_one_brain_region_hierarchy__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/brain-region-hierarchy/:id_/hierarchy',
    alias: 'read_hierarchy_brain_region_hierarchy__id___hierarchy_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/brain-region/:id_',
    alias: 'read_one_brain_region__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: BrainRegionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/brain-region/:id_',
    alias: 'update_one_brain_region__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: BrainRegionAdminUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: BrainRegionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/brain-region/:id_',
    alias: 'delete_one_brain_region__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/calibration',
    alias: 'read_many_calibration_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'start_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'end_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'status',
        type: 'Query',
        schema: status,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'used__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'generated__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'generated__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'generated__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_CalibrationRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/calibration',
    alias: 'create_one_calibration_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CalibrationCreate,
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
    response: CalibrationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/calibration/:id_',
    alias: 'read_one_calibration__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: CalibrationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/calibration/:id_',
    alias: 'delete_one_calibration__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/calibration/:id_',
    alias: 'update_one_calibration__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CalibrationUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: CalibrationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/cell-composition',
    alias: 'read_many_cell_composition_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
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
    response: ListResponse_CellCompositionRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/cell-composition/:id_',
    alias: 'read_one_cell_composition__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: CellCompositionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/cell-morphology',
    alias: 'read_many_cell_morphology_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'measurement_annotation__creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'measurement_annotation__creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'measurement_annotation__update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'measurement_annotation__update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'measurement_kind__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'measurement_kind__structural_domain',
        type: 'Query',
        schema: measurement_kind__structural_domain,
      },
      {
        name: 'measurement_item__name',
        type: 'Query',
        schema: measurement_item__name,
      },
      {
        name: 'measurement_item__unit',
        type: 'Query',
        schema: measurement_item__unit,
      },
      {
        name: 'measurement_item__value__gte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'measurement_item__value__lte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__age_value',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'cell_morphology_protocol__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'cell_morphology_protocol__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'cell_morphology_protocol__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'cell_morphology_protocol__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'cell_morphology_protocol__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'cell_morphology_protocol__generation_type',
        type: 'Query',
        schema: cell_morphology_protocol__generation_type,
      },
      {
        name: 'cell_morphology_protocol__generation_type__in',
        type: 'Query',
        schema: cell_morphology_protocol__generation_type__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_brain_region_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_ascendants',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_direction',
        type: 'Query',
        schema: within_brain_region_direction,
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
    response: ListResponse_CellMorphologyRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/cell-morphology',
    alias: 'create_one_cell_morphology_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CellMorphologyCreate,
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
    response: CellMorphologyRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/cell-morphology-protocol',
    alias: 'read_many_cell_morphology_protocol_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'generation_type',
        type: 'Query',
        schema: cell_morphology_protocol__generation_type,
      },
      {
        name: 'generation_type__in',
        type: 'Query',
        schema: cell_morphology_protocol__generation_type__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_CellMorphologyProtocolRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/cell-morphology-protocol',
    alias: 'create_one_cell_morphology_protocol_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CellMorphologyProtocolCreate,
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
    response: CellMorphologyProtocolRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/cell-morphology-protocol/:id_',
    alias: 'read_one_cell_morphology_protocol__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: CellMorphologyProtocolRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/cell-morphology-protocol/:id_',
    alias: 'update_one_cell_morphology_protocol__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: z.object({}).partial().passthrough(),
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: CellMorphologyProtocolRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/cell-morphology-protocol/:id_',
    alias: 'delete_one_cell_morphology_protocol__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/cell-morphology/:id_',
    alias: 'read_one_cell_morphology__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
      },
      {
        name: 'expand',
        type: 'Query',
        schema: expand,
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
    response: z.union([CellMorphologyRead, CellMorphologyAnnotationExpandedRead]),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/cell-morphology/:id_',
    alias: 'update_one_cell_morphology__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CellMorphologyUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: CellMorphologyRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/cell-morphology/:id_',
    alias: 'delete_one_cell_morphology__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/circuit',
    alias: 'read_many_circuit_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'scale',
        type: 'Query',
        schema: scale,
      },
      {
        name: 'scale__in',
        type: 'Query',
        schema: scale__in,
      },
      {
        name: 'build_category',
        type: 'Query',
        schema: build_category,
      },
      {
        name: 'build_category__in',
        type: 'Query',
        schema: build_category__in,
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'experiment_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'experiment_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contact_email',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'published_in',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'published_in__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'atlas_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'root_circuit_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'has_morphologies',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'has_point_neurons',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'has_electrical_cell_models',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'has_spines',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'number_neurons__lte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'number_neurons__gte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'number_synapses__lte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'number_synapses__gte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'number_connections__lte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'number_connections__gte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__age_value',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_brain_region_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_ascendants',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_direction',
        type: 'Query',
        schema: within_brain_region_direction,
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
    response: ListResponse_CircuitRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/circuit',
    alias: 'create_one_circuit_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CircuitCreate,
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
    response: CircuitRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/circuit-extraction-campaign',
    alias: 'read_many_circuit_extraction_campaign_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_CircuitExtractionCampaignRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/circuit-extraction-campaign',
    alias: 'create_one_circuit_extraction_campaign_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CircuitExtractionCampaignCreate,
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
    response: CircuitExtractionCampaignRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/circuit-extraction-campaign/:id_',
    alias: 'read_one_circuit_extraction_campaign__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: CircuitExtractionCampaignRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/circuit-extraction-campaign/:id_',
    alias: 'update_one_circuit_extraction_campaign__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CircuitExtractionCampaignUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: CircuitExtractionCampaignRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/circuit-extraction-campaign/:id_',
    alias: 'delete_one_circuit_extraction_campaign__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/circuit-extraction-config',
    alias: 'read_many_circuit_extraction_config_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'circuit_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'circuit_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'circuit_extraction_campaign_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'circuit_extraction_campaign_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'circuit__scale',
        type: 'Query',
        schema: scale,
      },
      {
        name: 'circuit__scale__in',
        type: 'Query',
        schema: scale__in,
      },
      {
        name: 'circuit__build_category',
        type: 'Query',
        schema: build_category,
      },
      {
        name: 'circuit__build_category__in',
        type: 'Query',
        schema: build_category__in,
      },
      {
        name: 'circuit__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'circuit__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'circuit__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'circuit__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'circuit__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_CircuitExtractionConfigRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/circuit-extraction-config',
    alias: 'create_one_circuit_extraction_config_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CircuitExtractionConfigCreate,
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
    response: CircuitExtractionConfigRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/circuit-extraction-config-generation',
    alias: 'read_many_circuit_extraction_config_generation_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'start_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'end_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'status',
        type: 'Query',
        schema: status,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'used__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'generated__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'generated__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'generated__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_CircuitExtractionConfigGenerationRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/circuit-extraction-config-generation',
    alias: 'create_one_circuit_extraction_config_generation_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CircuitExtractionConfigGenerationCreate,
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
    response: CircuitExtractionConfigGenerationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/circuit-extraction-config-generation/:id_',
    alias: 'read_one_circuit_extraction_config_generation__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: CircuitExtractionConfigGenerationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/circuit-extraction-config-generation/:id_',
    alias: 'delete_one_circuit_extraction_config_generation__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/circuit-extraction-config-generation/:id_',
    alias: 'update_one_circuit_extraction_config_generation__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CircuitExtractionConfigGenerationUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: CircuitExtractionConfigGenerationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/circuit-extraction-config/:id_',
    alias: 'read_one_circuit_extraction_config__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: CircuitExtractionConfigRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/circuit-extraction-config/:id_',
    alias: 'update_one_circuit_extraction_config__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CircuitExtractionConfigUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: CircuitExtractionConfigRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/circuit-extraction-config/:id_',
    alias: 'delete_one_circuit_extraction_config__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/circuit-extraction-execution',
    alias: 'read_many_circuit_extraction_execution_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'executor',
        type: 'Query',
        schema: executor,
      },
      {
        name: 'execution_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'start_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'end_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'status',
        type: 'Query',
        schema: status,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'used__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'generated__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'generated__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'generated__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_CircuitExtractionExecutionRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/circuit-extraction-execution',
    alias: 'create_one_circuit_extraction_execution_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CircuitExtractionExecutionCreate,
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
    response: CircuitExtractionExecutionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/circuit-extraction-execution/:id_',
    alias: 'read_one_circuit_extraction_execution__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: CircuitExtractionExecutionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/circuit-extraction-execution/:id_',
    alias: 'delete_one_circuit_extraction_execution__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/circuit-extraction-execution/:id_',
    alias: 'update_one_circuit_extraction_execution__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CircuitExtractionExecutionUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: CircuitExtractionExecutionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/circuit/:id_',
    alias: 'read_one_circuit__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: CircuitRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/circuit/:id_',
    alias: 'update_one_circuit__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CircuitUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: CircuitRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/circuit/:id_',
    alias: 'delete_one_circuit__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/circuit/hierarchy',
    alias: 'read_circuit_hierarchy_circuit_hierarchy_get',
    description: `Return a hierarchy tree of circuits based on derivations.

Depending on the derivation type, the hierarchy will be built differently. In particular,
a circuit is considered a root if it has no parents of the specified derivation type.

The hierarchy assumes the following rules for the derivations:

- A circuit can have zero or more children linked with any derivation type.
- A circuit can have zero or more parents, provided each parent is different, and is linked with
  a different derivation type.
- A public circuit can have any combination of public and private circuits as children.
- A private circuit can have only private circuits with the same project_id as children.

See also https://github.com/openbraininstitute/entitycore/issues/292#issuecomment-3174884561`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'derivation_type',
        type: 'Query',
        schema: z.enum(['circuit_extraction', 'circuit_rewiring', 'unspecified']),
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
    response: HierarchyTree,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/consortium',
    alias: 'read_many_consortium_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'alternative_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
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
    response: ListResponse_ConsortiumRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/consortium',
    alias: 'create_one_consortium_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ConsortiumCreate,
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
    response: ConsortiumRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/consortium/:id_',
    alias: 'read_one_consortium__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ConsortiumRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/consortium/:id_',
    alias: 'delete_one_consortium__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/contribution',
    alias: 'read_many_contribution_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'agent__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'agent__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'agent__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'agent__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'agent__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'agent__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'entity__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'entity__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'entity__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
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
    response: ListResponse_ContributionRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/contribution',
    alias: 'create_one_contribution_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ContributionCreate,
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
    response: ContributionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/contribution/:id_',
    alias: 'read_one_contribution__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ContributionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/derivation',
    alias: 'delete_one_derivation_delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'used_id',
        type: 'Query',
        schema: z.string().uuid(),
      },
      {
        name: 'generated_id',
        type: 'Query',
        schema: z.string().uuid(),
      },
      {
        name: 'derivation_type',
        type: 'Query',
        schema: z.enum(['circuit_extraction', 'circuit_rewiring', 'unspecified']),
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
    response: DerivationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/derivation',
    alias: 'create_one_derivation_post',
    description: `Create a new derivation from a readable entity (used) to a writable entity (generated).

Used entity: a readable entity (public in any project, or private in the same project).
Generated entity: a writable entity (public or private, in the same project).

Even when the parent (used) is private, the child (generated) can be either public or private.

See also https://github.com/openbraininstitute/entitycore/issues/427`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DerivationCreate,
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
    response: DerivationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/electrical-cell-recording',
    alias: 'read_many_electrical_cell_recording_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'experiment_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'experiment_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contact_email',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'published_in',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'published_in__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'recording_type',
        type: 'Query',
        schema: recording_type,
      },
      {
        name: 'recording_type__in',
        type: 'Query',
        schema: recording_type__in,
      },
      {
        name: 'recording_origin',
        type: 'Query',
        schema: recording_origin,
      },
      {
        name: 'recording_origin__in',
        type: 'Query',
        schema: recording_origin__in,
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'etype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'etype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'etype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'etype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'etype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__age_value',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_brain_region_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_ascendants',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_direction',
        type: 'Query',
        schema: within_brain_region_direction,
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
    response: ListResponse_ElectricalCellRecordingRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/electrical-cell-recording',
    alias: 'create_one_electrical_cell_recording_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ElectricalCellRecordingCreate,
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
    response: ElectricalCellRecordingRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/electrical-cell-recording/:id_',
    alias: 'read_one_electrical_cell_recording__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ElectricalCellRecordingRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/electrical-cell-recording/:id_',
    alias: 'update_one_electrical_cell_recording__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ElectricalCellRecordingUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ElectricalCellRecordingRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/electrical-cell-recording/:id_',
    alias: 'delete_one_electrical_cell_recording__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/electrical-recording-stimulus',
    alias: 'read_many_electrical_recording_stimulus_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'shape',
        type: 'Query',
        schema: shape,
      },
      {
        name: 'injection_type',
        type: 'Query',
        schema: injection_type,
      },
      {
        name: 'recording_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'recording_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_ElectricalRecordingStimulusRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/electrical-recording-stimulus',
    alias: 'create_one_electrical_recording_stimulus_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ElectricalRecordingStimulusCreate,
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
    response: ElectricalRecordingStimulusRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/electrical-recording-stimulus/:id_',
    alias: 'read_one_electrical_recording_stimulus__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ElectricalRecordingStimulusRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/electrical-recording-stimulus/:id_',
    alias: 'update_one_electrical_recording_stimulus__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ElectricalRecordingStimulusUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ElectricalRecordingStimulusRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/electrical-recording-stimulus/:id_',
    alias: 'delete_one_electrical_recording_stimulus__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/em-cell-mesh',
    alias: 'read_many_em_cell_mesh_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'experiment_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'experiment_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contact_email',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'published_in',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'published_in__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'release_version',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'dense_reconstruction_cell_id',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'level_of_detail',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'mesh_type',
        type: 'Query',
        schema: mesh_type,
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'measurement_annotation__creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'measurement_annotation__creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'measurement_annotation__update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'measurement_annotation__update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'measurement_kind__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'measurement_kind__structural_domain',
        type: 'Query',
        schema: measurement_kind__structural_domain,
      },
      {
        name: 'measurement_item__name',
        type: 'Query',
        schema: measurement_item__name,
      },
      {
        name: 'measurement_item__unit',
        type: 'Query',
        schema: measurement_item__unit,
      },
      {
        name: 'measurement_item__value__gte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'measurement_item__value__lte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__age_value',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'em_dense_reconstruction_dataset__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'em_dense_reconstruction_dataset__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'em_dense_reconstruction_dataset__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'em_dense_reconstruction_dataset__creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'em_dense_reconstruction_dataset__creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'em_dense_reconstruction_dataset__update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'em_dense_reconstruction_dataset__update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'em_dense_reconstruction_dataset__authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'em_dense_reconstruction_dataset__authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'em_dense_reconstruction_dataset__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'em_dense_reconstruction_dataset__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'em_dense_reconstruction_dataset__experiment_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'em_dense_reconstruction_dataset__experiment_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'em_dense_reconstruction_dataset__contact_email',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'em_dense_reconstruction_dataset__published_in',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'em_dense_reconstruction_dataset__published_in__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'em_dense_reconstruction_dataset__order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'within_brain_region_hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_brain_region_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_ascendants',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_direction',
        type: 'Query',
        schema: within_brain_region_direction,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_EMCellMeshRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/em-cell-mesh',
    alias: 'create_one_em_cell_mesh_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: EMCellMeshCreate,
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
    response: EMCellMeshRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/em-cell-mesh/:id_',
    alias: 'read_one_em_cell_mesh__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
      },
      {
        name: 'expand',
        type: 'Query',
        schema: expand__2,
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
    response: z.union([EMCellMeshRead, EMCellMeshAnnotationExpandedRead]),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/em-cell-mesh/:id_',
    alias: 'update_one_em_cell_mesh__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: EMCellMeshUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: EMCellMeshRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/em-cell-mesh/:id_',
    alias: 'delete_one_em_cell_mesh__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/em-dense-reconstruction-dataset',
    alias: 'read_many_em_dense_reconstruction_dataset_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'experiment_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'experiment_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contact_email',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'published_in',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'published_in__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__age_value',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'within_brain_region_hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_brain_region_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_ascendants',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_direction',
        type: 'Query',
        schema: within_brain_region_direction,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_EMDenseReconstructionDatasetRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/em-dense-reconstruction-dataset',
    alias: 'create_one_em_dense_reconstruction_dataset_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: EMDenseReconstructionDatasetCreate,
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
    response: EMDenseReconstructionDatasetRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/em-dense-reconstruction-dataset/:id_',
    alias: 'read_one_em_dense_reconstruction_dataset__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: EMDenseReconstructionDatasetRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/emodel',
    alias: 'read_many_emodel_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'score__lte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'score__gte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'etype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'etype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'etype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'etype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'etype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'exemplar_morphology__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'exemplar_morphology__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'exemplar_morphology__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'exemplar_morphology__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'exemplar_morphology__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'morphology__brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__subject__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__subject__age_value',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'ion_channel_model__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'ion_channel_model__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'ion_channel_model__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'ion_channel_model__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'ion_channel_model__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_brain_region_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_ascendants',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_direction',
        type: 'Query',
        schema: within_brain_region_direction,
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
    response: ListResponse_EModelReadExpanded_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/emodel',
    alias: 'create_one_emodel_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: EModelCreate,
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
    response: EModelRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/emodel/:id_',
    alias: 'read_one_emodel__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: EModelReadExpanded,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/emodel/:id_',
    alias: 'update_one_emodel__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: EModelUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: EModelRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/emodel/:id_',
    alias: 'delete_one_emodel__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/entity/:id_',
    alias: 'read_one_entity__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: EntityRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/entity/counts',
    alias: 'count_entities_by_type_entity_counts_get',
    description: `Count entities by their types.

Returns the count of entities for each requested entity type that the user has access to.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'types',
        type: 'Query',
        schema: z.array(EntityTypeWithBrainRegion).min(1),
      },
      {
        name: 'within_brain_region_hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_brain_region_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_ascendants',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_direction',
        type: 'Query',
        schema: within_brain_region_direction,
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
    response: z.record(z.number().int()),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/etype',
    alias: 'read_many_etype_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['pref_label']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
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
    response: ListResponse_AnnotationRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/etype',
    alias: 'create_one_etype_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: AnnotationCreate,
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
    response: AnnotationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/etype-classification',
    alias: 'create_one_etype_classification_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ETypeClassificationCreate,
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
    response: ETypeClassificationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/etype-classification',
    alias: 'read_many_etype_classification_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'entity_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'etype_class_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_ETypeClassificationRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/etype-classification/:id_',
    alias: 'read_one_etype_classification__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ETypeClassificationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/etype/:id_',
    alias: 'read_one_etype__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: AnnotationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/etype/:id_',
    alias: 'update_one_etype__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: AnnotationAdminUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: AnnotationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/etype/:id_',
    alias: 'delete_one_etype__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/experimental-bouton-density',
    alias: 'read_many_experimental_bouton_density_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__age_value',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_brain_region_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_ascendants',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_direction',
        type: 'Query',
        schema: within_brain_region_direction,
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
    response: ListResponse_ExperimentalBoutonDensityRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/experimental-bouton-density',
    alias: 'create_one_experimental_bouton_density_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ExperimentalBoutonDensityCreate,
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
    response: ExperimentalBoutonDensityRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/experimental-bouton-density/:id_',
    alias: 'read_one_experimental_bouton_density__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ExperimentalBoutonDensityRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/experimental-bouton-density/:id_',
    alias: 'update_one_experimental_bouton_density__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ExperimentalBoutonDensityUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ExperimentalBoutonDensityRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/experimental-bouton-density/:id_',
    alias: 'delete_one_experimental_bouton_density__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/experimental-neuron-density',
    alias: 'read_many_experimental_neuron_density_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'etype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'etype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'etype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'etype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'etype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__age_value',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_brain_region_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_ascendants',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_direction',
        type: 'Query',
        schema: within_brain_region_direction,
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
    response: ListResponse_ExperimentalNeuronDensityRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/experimental-neuron-density',
    alias: 'create_one_experimental_neuron_density_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ExperimentalNeuronDensityCreate,
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
    response: ExperimentalNeuronDensityRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/experimental-neuron-density/:id_',
    alias: 'read_one_experimental_neuron_density__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ExperimentalNeuronDensityRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/experimental-neuron-density/:id_',
    alias: 'update_one_experimental_neuron_density__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ExperimentalNeuronDensityUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ExperimentalNeuronDensityRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/experimental-neuron-density/:id_',
    alias: 'delete_one_experimental_neuron_density__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/experimental-synapses-per-connection',
    alias: 'read_many_experimental_synapses_per_connection_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__age_value',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'pre_mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'pre_mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'pre_mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'pre_mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'pre_mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'post_mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'post_mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'post_mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'post_mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'post_mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'pre_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'pre_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'pre_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'pre_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'pre_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'pre_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'pre_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'pre_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'pre_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'post_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'post_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'post_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'post_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'post_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'post_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'post_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'post_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'post_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_brain_region_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_ascendants',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_direction',
        type: 'Query',
        schema: within_brain_region_direction,
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
    response: ListResponse_ExperimentalSynapsesPerConnectionRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/experimental-synapses-per-connection',
    alias: 'create_one_experimental_synapses_per_connection_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ExperimentalSynapsesPerConnectionCreate,
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
    response: ExperimentalSynapsesPerConnectionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/experimental-synapses-per-connection/:id_',
    alias: 'read_one_experimental_synapses_per_connection__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ExperimentalSynapsesPerConnectionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/experimental-synapses-per-connection/:id_',
    alias: 'update_one_experimental_synapses_per_connection__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ExperimentalSynapsesPerConnectionUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ExperimentalSynapsesPerConnectionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/experimental-synapses-per-connection/:id_',
    alias: 'delete_one_experimental_synapses_per_connection__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/external-url',
    alias: 'read_many_external_url_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'source',
        type: 'Query',
        schema: source,
      },
      {
        name: 'url',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_ExternalUrlRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/external-url',
    alias: 'create_one_external_url_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ExternalUrlCreate,
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
    response: ExternalUrlRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/external-url/:id_',
    alias: 'read_one_external_url__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ExternalUrlRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
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
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/ion-channel',
    alias: 'read_many_ion_channel_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'gene',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['label']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_IonChannelRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/ion-channel',
    alias: 'create_one_ion_channel_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: IonChannelCreate,
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
    response: IonChannelRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/ion-channel-model',
    alias: 'read_many_ion_channel_model_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'experiment_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'experiment_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contact_email',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'published_in',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'published_in__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'nmodl_suffix',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'is_ljp_corrected',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'is_temperature_dependent',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'temperature_celsius',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'temperature_celsius__lte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'temperature_celsius__gte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'is_stochastic',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'conductance_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'conductance_name__isnull',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'max_permeability_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'max_permeability_name__isnull',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__age_value',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'within_brain_region_hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_brain_region_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_ascendants',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_direction',
        type: 'Query',
        schema: within_brain_region_direction,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_IonChannelModelExpanded_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/ion-channel-model',
    alias: 'create_one_ion_channel_model_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: IonChannelModelCreate,
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
    response: IonChannelModelRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/ion-channel-model/:id_',
    alias: 'read_one_ion_channel_model__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: IonChannelModelExpanded,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/ion-channel-model/:id_',
    alias: 'update_one_ion_channel_model__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: IonChannelModelUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: IonChannelModelRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/ion-channel-model/:id_',
    alias: 'delete_one_ion_channel_model__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/ion-channel-modeling-campaign',
    alias: 'read_many_ion_channel_modeling_campaign_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'ion_channel_modeling_config__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'ion_channel_modeling_config__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'ion_channel_modeling_config__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'ion_channel_modeling_config__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'ion_channel_modeling_config__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_IonChannelModelingCampaignRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/ion-channel-modeling-campaign',
    alias: 'create_one_ion_channel_modeling_campaign_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: IonChannelModelingCampaignCreate,
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
    response: IonChannelModelingCampaignRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/ion-channel-modeling-campaign/:id_',
    alias: 'read_one_ion_channel_modeling_campaign__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: IonChannelModelingCampaignRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/ion-channel-modeling-campaign/:id_',
    alias: 'update_one_ion_channel_modeling_campaign__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: IonChannelModelingCampaignUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: IonChannelModelingCampaignRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/ion-channel-modeling-campaign/:id_',
    alias: 'delete_one_ion_channel_modeling_campaign__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/ion-channel-modeling-config',
    alias: 'read_many_ion_channel_modeling_config_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'ion_channel_modeling_campaign_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'ion_channel_modeling_campaign_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_IonChannelModelingConfigRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/ion-channel-modeling-config',
    alias: 'create_one_ion_channel_modeling_config_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: IonChannelModelingConfigCreate,
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
    response: IonChannelModelingConfigRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/ion-channel-modeling-config-generation',
    alias: 'read_many_ion_channel_modeling_config_generation_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'start_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'end_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'status',
        type: 'Query',
        schema: status,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'used__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'generated__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'generated__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'generated__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_IonChannelModelingConfigGenerationRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/ion-channel-modeling-config-generation',
    alias: 'create_one_ion_channel_modeling_config_generation_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: IonChannelModelingConfigGenerationCreate,
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
    response: IonChannelModelingConfigGenerationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/ion-channel-modeling-config-generation/:id_',
    alias: 'read_one_ion_channel_modeling_config_generation__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: IonChannelModelingConfigGenerationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/ion-channel-modeling-config-generation/:id_',
    alias: 'delete_one_ion_channel_modeling_config_generation__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/ion-channel-modeling-config-generation/:id_',
    alias: 'update_one_ion_channel_modeling_config_generation__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: IonChannelModelingConfigGenerationUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: IonChannelModelingConfigGenerationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/ion-channel-modeling-config/:id_',
    alias: 'read_one_ion_channel_modeling_config__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: IonChannelModelingConfigRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/ion-channel-modeling-config/:id_',
    alias: 'update_one_ion_channel_modeling_config__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: IonChannelModelingConfigUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: IonChannelModelingConfigRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/ion-channel-modeling-config/:id_',
    alias: 'delete_one_ion_channel_modeling_config__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/ion-channel-modeling-execution',
    alias: 'read_many_ion_channel_modeling_execution_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'executor',
        type: 'Query',
        schema: executor,
      },
      {
        name: 'execution_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'start_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'end_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'status',
        type: 'Query',
        schema: status,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'used__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'generated__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'generated__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'generated__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_IonChannelModelingExecutionRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/ion-channel-modeling-execution',
    alias: 'create_one_ion_channel_modeling_execution_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: IonChannelModelingExecutionCreate,
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
    response: IonChannelModelingExecutionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/ion-channel-modeling-execution/:id_',
    alias: 'read_one_ion_channel_modeling_execution__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: IonChannelModelingExecutionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/ion-channel-modeling-execution/:id_',
    alias: 'delete_one_ion_channel_modeling_execution__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/ion-channel-modeling-execution/:id_',
    alias: 'update_one_ion_channel_modeling_execution__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: IonChannelModelingExecutionUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: IonChannelModelingExecutionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/ion-channel-recording',
    alias: 'read_many_ion_channel_recording_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'experiment_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'experiment_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contact_email',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'published_in',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'published_in__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'recording_type',
        type: 'Query',
        schema: recording_type,
      },
      {
        name: 'recording_type__in',
        type: 'Query',
        schema: recording_type__in,
      },
      {
        name: 'recording_origin',
        type: 'Query',
        schema: recording_origin,
      },
      {
        name: 'recording_origin__in',
        type: 'Query',
        schema: recording_origin__in,
      },
      {
        name: 'temperature',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'temperature__lte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'temperature__gte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'cell_line',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'cell_line__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__age_value',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'ion_channel__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'ion_channel__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'ion_channel__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'ion_channel__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'ion_channel__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'ion_channel__label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'ion_channel__gene',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_brain_region_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_ascendants',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_direction',
        type: 'Query',
        schema: within_brain_region_direction,
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
    response: ListResponse_IonChannelRecordingRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/ion-channel-recording',
    alias: 'create_one_ion_channel_recording_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: IonChannelRecordingCreate,
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
    response: IonChannelRecordingRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/ion-channel-recording/:id_',
    alias: 'read_one_ion_channel_recording__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: IonChannelRecordingRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/ion-channel-recording/:id_',
    alias: 'update_one_ion_channel_recording__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: IonChannelRecordingUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: IonChannelRecordingRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/ion-channel-recording/:id_',
    alias: 'delete_one_ion_channel_recording__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/ion-channel/:id_',
    alias: 'read_one_ion_channel__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: IonChannelRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/ion-channel/:id_',
    alias: 'update_one_ion_channel__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: IonChannelAdminUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: IonChannelRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/ion-channel/:id_',
    alias: 'delete_one_ion_channel__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/license',
    alias: 'read_many_license_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
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
    response: ListResponse_LicenseRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/license',
    alias: 'create_one_license_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: LicenseCreate,
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
    response: LicenseRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/license/:id_',
    alias: 'read_one_license__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: LicenseRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/license/:id_',
    alias: 'update_one_license__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: LicenseAdminUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: LicenseRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/license/:id_',
    alias: 'delete_one_license__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/measurement-annotation',
    alias: 'read_many_measurement_annotation_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'entity_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'entity_type',
        type: 'Query',
        schema: entity_type,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'measurement_kind__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'measurement_kind__structural_domain',
        type: 'Query',
        schema: measurement_kind__structural_domain,
      },
      {
        name: 'measurement_item__name',
        type: 'Query',
        schema: measurement_item__name,
      },
      {
        name: 'measurement_item__unit',
        type: 'Query',
        schema: measurement_item__unit,
      },
      {
        name: 'measurement_item__value__gte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'measurement_item__value__lte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
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
    response: ListResponse_MeasurementAnnotationRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/measurement-annotation',
    alias: 'create_one_measurement_annotation_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: MeasurementAnnotationCreate,
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
    response: MeasurementAnnotationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/measurement-annotation/:id_',
    alias: 'read_one_measurement_annotation__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: MeasurementAnnotationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/measurement-annotation/:id_',
    alias: 'delete_one_measurement_annotation__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: MeasurementAnnotationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/measurement-annotation/:id_',
    alias: 'update_one_measurement_annotation__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: MeasurementAnnotationUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: MeasurementAnnotationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/measurement-label',
    alias: 'read_many_measurement_label_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'entity_type',
        type: 'Query',
        schema: entity_type,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
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
    response: ListResponse_MeasurementLabelRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/measurement-label',
    alias: 'create_one_measurement_label_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: MeasurementLabelCreate,
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
    response: MeasurementLabelRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/measurement-label/:id_',
    alias: 'read_one_measurement_label__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: MeasurementLabelRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/measurement-label/:id_',
    alias: 'update_one_measurement_label__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: MeasurementLabelAdminUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: MeasurementLabelRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/measurement-label/:id_',
    alias: 'delete_one_measurement_label__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/memodel',
    alias: 'read_many_memodel_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'species_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'etype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'etype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'etype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'etype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'etype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'morphology__brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__subject__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__subject__age_value',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'emodel__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'emodel__score__lte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'emodel__score__gte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'emodel__brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'emodel__brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'emodel__brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'emodel__etype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__etype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__etype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__etype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__etype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'emodel__exemplar_morphology__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__exemplar_morphology__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__exemplar_morphology__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__exemplar_morphology__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__exemplar_morphology__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_brain_region_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_ascendants',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_direction',
        type: 'Query',
        schema: within_brain_region_direction,
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
    response: ListResponse_MEModelRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/memodel',
    alias: 'create_one_memodel_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: MEModelCreate,
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
    response: MEModelRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/memodel-calibration-result',
    alias: 'read_many_memodel_calibration_result_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'passed',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'calibrated_entity_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['calibrated_entity_id']),
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_MEModelCalibrationResultRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/memodel-calibration-result',
    alias: 'create_one_memodel_calibration_result_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: MEModelCalibrationResultCreate,
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
    response: MEModelCalibrationResultRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/memodel-calibration-result/:id_',
    alias: 'read_one_memodel_calibration_result__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: MEModelCalibrationResultRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/memodel-calibration-result/:id_',
    alias: 'update_one_memodel_calibration_result__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: MEModelCalibrationResultUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: MEModelCalibrationResultRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/memodel-calibration-result/:id_',
    alias: 'delete_one_memodel_calibration_result__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/memodel/:id_',
    alias: 'read_one_memodel__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: MEModelRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/memodel/:id_',
    alias: 'update_one_memodel__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: MEModelUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: MEModelRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/memodel/:id_',
    alias: 'delete_one_memodel__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/mtype',
    alias: 'read_many_mtype_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['pref_label']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
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
    response: ListResponse_AnnotationRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/mtype',
    alias: 'create_one_mtype_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: AnnotationCreate,
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
    response: AnnotationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/mtype-classification',
    alias: 'create_one_mtype_classification_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: MTypeClassificationCreate,
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
    response: MTypeClassificationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/mtype-classification',
    alias: 'read_many_mtype_classification_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'entity_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'mtype_class_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_MTypeClassificationRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/mtype-classification/:id_',
    alias: 'read_one_mtype_classification__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: MTypeClassificationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/mtype/:id_',
    alias: 'read_one_mtype__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: AnnotationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/mtype/:id_',
    alias: 'update_one_mtype__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: AnnotationAdminUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: AnnotationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/mtype/:id_',
    alias: 'delete_one_mtype__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/organization',
    alias: 'read_many_organization_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'alternative_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
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
    response: ListResponse_OrganizationRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/organization',
    alias: 'create_one_organization_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: OrganizationCreate,
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
    response: OrganizationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/organization/:id_',
    alias: 'read_one_organization__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: OrganizationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/organization/:id_',
    alias: 'delete_one_organization__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/person',
    alias: 'read_many_person_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
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
    response: ListResponse_PersonRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/person',
    alias: 'create_one_person_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: PersonCreate,
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
    response: PersonRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/person/:id_',
    alias: 'read_one_person__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: PersonRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/person/:id_',
    alias: 'delete_one_person__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/publication',
    alias: 'read_many_publication_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'DOI',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'publication_year',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'publication_year__in',
        type: 'Query',
        schema: publication_year__in,
      },
      {
        name: 'publication_year__lte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'publication_year__gte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'title',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_PublicationRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/publication',
    alias: 'create_one_publication_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: PublicationCreate,
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
    response: PublicationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/publication/:id_',
    alias: 'read_one_publication__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: PublicationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/publication/:id_',
    alias: 'update_one_publication__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: PublicationAdminUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: PublicationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/publication/:id_',
    alias: 'delete_one_publication__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/role',
    alias: 'read_many_role_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'role_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
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
    response: ListResponse_RoleRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/role',
    alias: 'create_one_role_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: RoleCreate,
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
    response: RoleRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/role/:id_',
    alias: 'read_one_role__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: RoleRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/role/:id_',
    alias: 'update_one_role__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: RoleAdminUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: RoleRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/role/:id_',
    alias: 'delete_one_role__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/scientific-artifact-external-url-link',
    alias: 'read_many_scientific_artifact_external_url_link_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'external_url__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'external_url__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'external_url__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'external_url__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'external_url__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'external_url__source',
        type: 'Query',
        schema: source,
      },
      {
        name: 'external_url__url',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'scientific_artifact__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'scientific_artifact__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'scientific_artifact__experiment_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'scientific_artifact__experiment_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'scientific_artifact__contact_email',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'scientific_artifact__published_in',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'scientific_artifact__published_in__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_ScientificArtifactExternalUrlLinkRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/scientific-artifact-external-url-link',
    alias: 'create_one_scientific_artifact_external_url_link_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ScientificArtifactExternalUrlLinkCreate,
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
    response: ScientificArtifactExternalUrlLinkRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/scientific-artifact-external-url-link/:id_',
    alias: 'read_one_scientific_artifact_external_url_link__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ScientificArtifactExternalUrlLinkRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/scientific-artifact-publication-link',
    alias: 'read_many_scientific_artifact_publication_link_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'publication_type',
        type: 'Query',
        schema: publication_type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'publication__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'publication__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'publication__DOI',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'publication__publication_year',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'publication__publication_year__in',
        type: 'Query',
        schema: publication_year__in,
      },
      {
        name: 'publication__publication_year__lte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'publication__publication_year__gte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'publication__title',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'scientific_artifact__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'scientific_artifact__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'scientific_artifact__experiment_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'scientific_artifact__experiment_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'scientific_artifact__contact_email',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'scientific_artifact__published_in',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'scientific_artifact__published_in__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_ScientificArtifactPublicationLinkRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/scientific-artifact-publication-link',
    alias: 'create_one_scientific_artifact_publication_link_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ScientificArtifactPublicationLinkCreate,
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
    response: ScientificArtifactPublicationLinkRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/scientific-artifact-publication-link/:id_',
    alias: 'read_one_scientific_artifact_publication_link__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ScientificArtifactPublicationLinkRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/simulation',
    alias: 'read_many_simulation_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'entity_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'entity_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'simulation_campaign_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'simulation_campaign_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'circuit__scale',
        type: 'Query',
        schema: scale,
      },
      {
        name: 'circuit__scale__in',
        type: 'Query',
        schema: scale__in,
      },
      {
        name: 'circuit__build_category',
        type: 'Query',
        schema: build_category,
      },
      {
        name: 'circuit__build_category__in',
        type: 'Query',
        schema: build_category__in,
      },
      {
        name: 'circuit__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'circuit__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'circuit__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'circuit__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'circuit__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_SimulationRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/simulation',
    alias: 'create_one_simulation_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SimulationCreate,
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
    response: SimulationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/simulation-campaign',
    alias: 'read_many_simulation_campaign_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'entity_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'entity_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'entity__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'entity__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'entity__type',
        type: 'Query',
        schema: entity__type,
      },
      {
        name: 'circuit__scale',
        type: 'Query',
        schema: scale,
      },
      {
        name: 'circuit__scale__in',
        type: 'Query',
        schema: scale__in,
      },
      {
        name: 'circuit__build_category',
        type: 'Query',
        schema: build_category,
      },
      {
        name: 'circuit__build_category__in',
        type: 'Query',
        schema: build_category__in,
      },
      {
        name: 'circuit__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'circuit__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'circuit__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'circuit__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'circuit__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'simulation__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'simulation__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'simulation__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'simulation__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'simulation__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'simulation__entity_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'simulation__entity_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_SimulationCampaignRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/simulation-campaign',
    alias: 'create_one_simulation_campaign_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SimulationCampaignCreate,
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
    response: SimulationCampaignRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/simulation-campaign/:id_',
    alias: 'read_one_simulation_campaign__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SimulationCampaignRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/simulation-campaign/:id_',
    alias: 'update_one_simulation_campaign__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SimulationCampaignUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SimulationCampaignRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/simulation-campaign/:id_',
    alias: 'delete_one_simulation_campaign__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/simulation-execution',
    alias: 'read_many_simulation_execution_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'executor',
        type: 'Query',
        schema: executor,
      },
      {
        name: 'execution_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'start_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'end_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'status',
        type: 'Query',
        schema: status,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'used__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'generated__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'generated__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'generated__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_SimulationExecutionRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/simulation-execution',
    alias: 'create_one_simulation_execution_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SimulationExecutionCreate,
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
    response: SimulationExecutionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/simulation-execution/:id_',
    alias: 'read_one_simulation_execution__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SimulationExecutionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/simulation-execution/:id_',
    alias: 'delete_one_simulation_execution__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/simulation-execution/:id_',
    alias: 'update_one_simulation_execution__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SimulationExecutionUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SimulationExecutionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/simulation-generation',
    alias: 'read_many_simulation_generation_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'start_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'end_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'status',
        type: 'Query',
        schema: status,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'used__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'generated__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'generated__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'generated__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_SimulationGenerationRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/simulation-generation',
    alias: 'create_one_simulation_generation_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SimulationGenerationCreate,
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
    response: SimulationGenerationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/simulation-generation/:id_',
    alias: 'read_one_simulation_generation__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SimulationGenerationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/simulation-generation/:id_',
    alias: 'delete_one_simulation_generation__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/simulation-generation/:id_',
    alias: 'update_one_simulation_generation__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SimulationGenerationUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SimulationGenerationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/simulation-result',
    alias: 'read_many_simulation_result_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_SimulationResultRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/simulation-result',
    alias: 'create_one_simulation_result_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SimulationResultCreate,
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
    response: SimulationResultRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/simulation-result/:id_',
    alias: 'read_one_simulation_result__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SimulationResultRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/simulation-result/:id_',
    alias: 'update_one_simulation_result__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SimulationResultUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SimulationResultRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/simulation-result/:id_',
    alias: 'delete_one_simulation_result__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/simulation/:id_',
    alias: 'read_one_simulation__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SimulationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/simulation/:id_',
    alias: 'update_one_simulation__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SimulationUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SimulationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/simulation/:id_',
    alias: 'delete_one_simulation__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/single-neuron-simulation',
    alias: 'read_many_single_neuron_simulation_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__validation_status',
        type: 'Query',
        schema: me_model__validation_status,
      },
      {
        name: 'me_model__brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'me_model__brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__morphology__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__morphology__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__morphology__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__morphology__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__morphology__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'morphology__brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__subject__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__subject__age_value',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__emodel__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__emodel__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__emodel__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__emodel__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__emodel__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__emodel__score__lte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'me_model__emodel__score__gte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'emodel__brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'emodel__brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'emodel__brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'emodel__etype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__etype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__etype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__etype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__etype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'emodel__exemplar_morphology__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__exemplar_morphology__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__exemplar_morphology__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__exemplar_morphology__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__exemplar_morphology__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__etype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__etype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__etype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__etype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__etype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_brain_region_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_ascendants',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_direction',
        type: 'Query',
        schema: within_brain_region_direction,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_SingleNeuronSimulationRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/single-neuron-simulation',
    alias: 'create_one_single_neuron_simulation_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SingleNeuronSimulationCreate,
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
    response: SingleNeuronSimulationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/single-neuron-simulation/:id_',
    alias: 'read_one_single_neuron_simulation__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SingleNeuronSimulationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/single-neuron-simulation/:id_',
    alias: 'update_one_single_neuron_simulation__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SingleNeuronSimulationUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SingleNeuronSimulationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/single-neuron-simulation/:id_',
    alias: 'delete_one_single_neuron_simulation__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/single-neuron-synaptome',
    alias: 'read_many_single_neuron_synaptome_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__validation_status',
        type: 'Query',
        schema: me_model__validation_status,
      },
      {
        name: 'me_model__brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'me_model__brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__morphology__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__morphology__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__morphology__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__morphology__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__morphology__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'morphology__brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__subject__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__subject__age_value',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__emodel__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__emodel__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__emodel__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__emodel__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__emodel__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__emodel__score__lte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'me_model__emodel__score__gte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'emodel__brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'emodel__brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'emodel__brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'emodel__etype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__etype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__etype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__etype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__etype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'emodel__exemplar_morphology__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__exemplar_morphology__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__exemplar_morphology__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__exemplar_morphology__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__exemplar_morphology__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__etype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__etype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__etype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__etype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__etype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_brain_region_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_ascendants',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_direction',
        type: 'Query',
        schema: within_brain_region_direction,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_SingleNeuronSynaptomeRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/single-neuron-synaptome',
    alias: 'create_one_single_neuron_synaptome_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SingleNeuronSynaptomeCreate,
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
    response: SingleNeuronSynaptomeRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/single-neuron-synaptome-simulation',
    alias: 'read_many_single_neuron_synaptome_simulation_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'synaptome__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'synaptome__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'synaptome__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'synaptome__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'synaptome__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'synaptome__brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'synaptome__brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'synaptome__brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'synaptome__brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'synaptome__brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'synaptome__brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'synaptome__brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'synaptome__brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'synaptome__brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'synaptome__me_model__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'synaptome__me_model__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'synaptome__me_model__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'synaptome__me_model__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'synaptome__me_model__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'synaptome__me_model__validation_status',
        type: 'Query',
        schema: me_model__validation_status,
      },
      {
        name: 'me_model__brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'me_model__brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__morphology__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__morphology__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__morphology__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__morphology__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__morphology__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'morphology__brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__subject__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__subject__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__subject__age_value',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'subject__strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'subject__strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'subject__strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'morphology__mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'morphology__mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'morphology__mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__emodel__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__emodel__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__emodel__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__emodel__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__emodel__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__emodel__score__lte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'me_model__emodel__score__gte',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'emodel__brain_region__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__brain_region__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__brain_region__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__brain_region__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__brain_region__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'emodel__brain_region__acronym',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__brain_region__acronym__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__brain_region__annotation_value',
        type: 'Query',
        schema: annotation_value,
      },
      {
        name: 'emodel__brain_region__hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'emodel__etype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__etype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__etype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__etype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__etype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'emodel__exemplar_morphology__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__exemplar_morphology__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'emodel__exemplar_morphology__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__exemplar_morphology__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'emodel__exemplar_morphology__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__mtype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__mtype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__mtype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__mtype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__mtype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'me_model__etype__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__etype__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'me_model__etype__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__etype__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'me_model__etype__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_hierarchy_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_brain_region_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'within_brain_region_ascendants',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'within_brain_region_direction',
        type: 'Query',
        schema: within_brain_region_direction,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_SingleNeuronSynaptomeSimulationRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/single-neuron-synaptome-simulation',
    alias: 'create_one_single_neuron_synaptome_simulation_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SingleNeuronSynaptomeSimulationCreate,
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
    response: SingleNeuronSynaptomeSimulationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/single-neuron-synaptome-simulation/:id_',
    alias: 'read_one_single_neuron_synaptome_simulation__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SingleNeuronSynaptomeSimulationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/single-neuron-synaptome-simulation/:id_',
    alias: 'update_one_single_neuron_synaptome_simulation__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SingleNeuronSynaptomeSimulationUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SingleNeuronSynaptomeSimulationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/single-neuron-synaptome-simulation/:id_',
    alias: 'delete_one_single_neuron_synaptome_simulation__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/single-neuron-synaptome/:id_',
    alias: 'read_one_single_neuron_synaptome__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SingleNeuronSynaptomeRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/single-neuron-synaptome/:id_',
    alias: 'update_one_single_neuron_synaptome__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SingleNeuronSynaptomeUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SingleNeuronSynaptomeRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/single-neuron-synaptome/:id_',
    alias: 'delete_one_single_neuron_synaptome__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/skeletonization-campaign',
    alias: 'read_many_skeletonization_campaign_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'skeletonization_config__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'skeletonization_config__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'skeletonization_config__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'skeletonization_config__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'skeletonization_config__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_SkeletonizationCampaignRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/skeletonization-campaign',
    alias: 'create_one_skeletonization_campaign_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SkeletonizationCampaignCreate,
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
    response: SkeletonizationCampaignRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/skeletonization-campaign/:id_',
    alias: 'read_one_skeletonization_campaign__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SkeletonizationCampaignRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/skeletonization-campaign/:id_',
    alias: 'update_one_skeletonization_campaign__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SkeletonizationCampaignUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SkeletonizationCampaignRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/skeletonization-campaign/:id_',
    alias: 'delete_one_skeletonization_campaign__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/skeletonization-config',
    alias: 'read_many_skeletonization_config_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'skeletonization_campaign_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'skeletonization_campaign_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'em_cell_mesh_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'em_cell_mesh_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_SkeletonizationConfigRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/skeletonization-config',
    alias: 'create_one_skeletonization_config_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SkeletonizationConfigCreate,
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
    response: SkeletonizationConfigRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/skeletonization-config-generation',
    alias: 'read_many_skeletonization_config_generation_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'start_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'end_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'status',
        type: 'Query',
        schema: status,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'used__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'generated__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'generated__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'generated__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_SkeletonizationConfigGenerationRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/skeletonization-config-generation',
    alias: 'create_one_skeletonization_config_generation_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SkeletonizationConfigGenerationCreate,
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
    response: SkeletonizationConfigGenerationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/skeletonization-config-generation/:id_',
    alias: 'read_one_skeletonization_config_generation__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SkeletonizationConfigGenerationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/skeletonization-config-generation/:id_',
    alias: 'delete_one_skeletonization_config_generation__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/skeletonization-config-generation/:id_',
    alias: 'update_one_skeletonization_config_generation__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SkeletonizationConfigGenerationUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SkeletonizationConfigGenerationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/skeletonization-config/:id_',
    alias: 'read_one_skeletonization_config__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SkeletonizationConfigRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/skeletonization-config/:id_',
    alias: 'update_one_skeletonization_config__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SkeletonizationConfigUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SkeletonizationConfigRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/skeletonization-config/:id_',
    alias: 'delete_one_skeletonization_config__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/skeletonization-execution',
    alias: 'read_many_skeletonization_execution_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'executor',
        type: 'Query',
        schema: executor,
      },
      {
        name: 'execution_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'start_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'end_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'status',
        type: 'Query',
        schema: status,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'used__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'generated__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'generated__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'generated__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_SkeletonizationExecutionRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/skeletonization-execution',
    alias: 'create_one_skeletonization_execution_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SkeletonizationExecutionCreate,
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
    response: SkeletonizationExecutionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/skeletonization-execution/:id_',
    alias: 'read_one_skeletonization_execution__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SkeletonizationExecutionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/skeletonization-execution/:id_',
    alias: 'delete_one_skeletonization_execution__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/skeletonization-execution/:id_',
    alias: 'update_one_skeletonization_execution__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SkeletonizationExecutionUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SkeletonizationExecutionRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/species',
    alias: 'read_many_species_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'semantic_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['name']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
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
    response: ListResponse_SpeciesRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/species',
    alias: 'create_one_species_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SpeciesCreate,
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
    response: SpeciesRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/species/:id_',
    alias: 'read_one_species__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SpeciesRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/species/:id_',
    alias: 'update_one_species__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SpeciesAdminUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SpeciesRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/species/:id_',
    alias: 'delete_one_species__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/strain',
    alias: 'read_many_strain_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'semantic_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['name']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
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
    response: ListResponse_StrainRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/strain',
    alias: 'create_one_strain_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: StrainCreate,
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
    response: StrainRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/strain/:id_',
    alias: 'read_one_strain__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: StrainRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/strain/:id_',
    alias: 'update_one_strain__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: StrainAdminUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: StrainRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/strain/:id_',
    alias: 'delete_one_strain__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/subject',
    alias: 'read_many_subject_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'age_value',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'ilike_search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'species__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'species__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'strain__name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'strain__name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'strain__name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'strain__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'strain__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_SubjectRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/subject',
    alias: 'create_one_subject_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SubjectCreate,
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
    response: SubjectRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/subject/:id_',
    alias: 'read_one_subject__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SubjectRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/subject/:id_',
    alias: 'update_one_subject__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SubjectUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: SubjectRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/subject/:id_',
    alias: 'delete_one_subject__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/validation',
    alias: 'read_many_validation_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'start_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'end_time',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'status',
        type: 'Query',
        schema: status,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['-creation_date']),
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'used__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'used__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'generated__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'generated__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'generated__type',
        type: 'Query',
        schema: used__type,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_ValidationRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/validation',
    alias: 'create_one_validation_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ValidationCreate,
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
    response: ValidationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/validation-result',
    alias: 'read_many_validation_result_get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'page',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().gte(1).optional().default(100),
      },
      {
        name: 'name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'name__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'creation_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__lte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'update_date__gte',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'authorized_public',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'authorized_project_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'passed',
        type: 'Query',
        schema: authorized_public,
      },
      {
        name: 'validated_entity_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'order_by',
        type: 'Query',
        schema: z.array(z.string()).optional().default(['name']),
      },
      {
        name: 'contribution__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'contribution__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'contribution__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'contribution__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'created_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'created_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'created_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'created_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__pref_label',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__pref_label__in',
        type: 'Query',
        schema: contribution__pref_label__in,
      },
      {
        name: 'updated_by__pref_label__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'updated_by__type',
        type: 'Query',
        schema: contribution__type,
      },
      {
        name: 'updated_by__given_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__given_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__family_name__ilike',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'updated_by__sub_id__in',
        type: 'Query',
        schema: id__in,
      },
      {
        name: 'search',
        type: 'Query',
        schema: virtual_lab_id,
      },
      {
        name: 'with_facets',
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
    response: ListResponse_ValidationResultRead_,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'post',
    path: '/validation-result',
    alias: 'create_one_validation_result_post',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ValidationResultCreate,
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
    response: ValidationResultRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/validation-result/:id_',
    alias: 'read_one_validation_result__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ValidationResultRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/validation-result/:id_',
    alias: 'update_one_validation_result__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ValidationResultUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ValidationResultRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/validation-result/:id_',
    alias: 'delete_one_validation_result__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/validation/:id_',
    alias: 'read_one_validation__id___get',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ValidationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'delete',
    path: '/validation/:id_',
    alias: 'delete_one_validation__id___delete',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: z.object({ id: z.string().uuid() }).passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'patch',
    path: '/validation/:id_',
    alias: 'update_one_validation__id___patch',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ValidationUserUpdate,
      },
      {
        name: 'id_',
        type: 'Path',
        schema: z.string().uuid(),
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
    response: ValidationRead,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: 'get',
    path: '/version',
    alias: 'version_version_get',
    description: `Version endpoint.`,
    requestFormat: 'json',
    response: z.object({}).partial().passthrough(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: ErrorResponse,
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: ErrorResponse,
      },
    ],
  },
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
