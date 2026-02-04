import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core';
import { z } from 'zod';

const dpi = z.union([z.number(), z.null()]).optional();
const virtual_lab_id = z.union([z.string(), z.null()]).optional();
const ValidationError = z
  .object({ loc: z.array(z.union([z.string(), z.number()])), msg: z.string(), type: z.string() })
  .passthrough();
const HTTPValidationError = z
  .object({ detail: z.array(ValidationError) })
  .partial()
  .passthrough();
const ErrorMessage = z.object({ detail: z.string() }).passthrough();

export const schemas = {
  dpi,
  virtual_lab_id,
  ValidationError,
  HTTPValidationError,
  ErrorMessage,
};

const endpoints = makeApi([
  {
    method: 'get',
    path: '/api/thumbnail-generation/core/:simulation_type/preview',
    alias: 'get_simulation_plot_api_thumbnail_generation_core__simulation_type__preview_get',
    description: `Generate a preview of a simulation

Args:
    entity_id: The ID of the entity
    asset_id: The ID of the asset
    simulation_type: Type of simulation
    target: Plot target
    w: Width of the generated image
    h: Height of the generated image
    context: The context of the request

Returns:
    A response containing the plot of the simulation target`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'simulation_type',
        type: 'Path',
        schema: z.enum(['single-neuron-simulation', 'single-neuron-synaptome-simulation']),
      },
      {
        name: 'entity_id',
        type: 'Query',
        schema: z.string().uuid(),
      },
      {
        name: 'asset_id',
        type: 'Query',
        schema: z.string().uuid(),
      },
      {
        name: 'target',
        type: 'Query',
        schema: z.enum(['stimulus', 'simulation']),
      },
      {
        name: 'w',
        type: 'Query',
        schema: dpi,
      },
      {
        name: 'h',
        type: 'Query',
        schema: dpi,
      },
      {
        name: 'virtual-lab-id',
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
    method: 'get',
    path: '/api/thumbnail-generation/core/cell-morphology/preview',
    alias: 'get_morphology_preview_api_thumbnail_generation_core_cell_morphology_preview_get',
    description: `Generate a preview of a morphology

Args:
    entity_id: The ID of the entity
    asset_id: The ID of the asset
    dpi: The DPI of the preview
    context: The context of the request

Returns:
    A response containing the preview of the morphology`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'entity_id',
        type: 'Query',
        schema: z.string().uuid(),
      },
      {
        name: 'asset_id',
        type: 'Query',
        schema: z.string().uuid(),
      },
      {
        name: 'dpi',
        type: 'Query',
        schema: dpi,
      },
      {
        name: 'virtual-lab-id',
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
    method: 'get',
    path: '/api/thumbnail-generation/core/electrical-cell-recording/preview',
    alias: 'get_ephys_preview_api_thumbnail_generation_core_electrical_cell_recording_preview_get',
    description: `Generate a preview of an ephys trace.

Args:
    entity_id: The ID of the entity
    asset_id: The ID of the asset
    dpi: The DPI of the preview
    context: The context of the request

Returns:
    A response containing the preview of the ephys trace`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'entity_id',
        type: 'Query',
        schema: z.string().uuid(),
      },
      {
        name: 'asset_id',
        type: 'Query',
        schema: z.string().uuid(),
      },
      {
        name: 'dpi',
        type: 'Query',
        schema: dpi,
      },
      {
        name: 'virtual-lab-id',
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
    method: 'get',
    path: '/api/thumbnail-generation/core/ion-channel-recording/preview',
    alias:
      'get_ion_channel_recording_preview_api_thumbnail_generation_core_ion_channel_recording_preview_get',
    description: `Generate a preview of an ion_channel_recording trace.

Args:
    entity_id: The ID of the entity
    asset_id: The ID of the asset
    dpi: The DPI of the preview
    context: The context of the request

Returns:
    A response containing the preview of the ion_channel_recording trace`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'entity_id',
        type: 'Query',
        schema: z.string().uuid(),
      },
      {
        name: 'asset_id',
        type: 'Query',
        schema: z.string().uuid(),
      },
      {
        name: 'dpi',
        type: 'Query',
        schema: dpi,
      },
      {
        name: 'virtual-lab-id',
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
    method: 'get',
    path: '/api/thumbnail-generation/core/model-trace/preview',
    alias: 'get_model_trace_preview_api_thumbnail_generation_core_model_trace_preview_get',
    description: `Generate a preview of a model trace

Args:
    entity_id: The ID of the entity
    context: The context of the request

Returns:
    A response containing the preview of the model trace`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'entity_id',
        type: 'Query',
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
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/api/thumbnail-generation/generate/morphology-image',
    alias: 'get_morphology_image_api_thumbnail_generation_generate_morphology_image_get',
    description: `Endpoint to get a preview image of a morphology.
Sample Content URL:
https://bbp.epfl.ch/nexus/v1/files/bbp/mouselight/https%3A%2F%2Fbbp.epfl.ch%2Fnexus%2Fv1%2Fresources%2Fbbp%2Fmouselight%2F_%2F0befd25c-a28a-4916-9a8a-adcd767db118`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'content_url',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'dpi',
        type: 'Query',
        schema: dpi,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not Found`,
        schema: z.object({ detail: z.string() }).passthrough(),
      },
      {
        status: 422,
        description: `Unprocessable Entity`,
        schema: z.object({ detail: z.string() }).passthrough(),
      },
    ],
  },
  {
    method: 'get',
    path: '/api/thumbnail-generation/generate/simulation-plot',
    alias: 'get_simulation_plot_api_thumbnail_generation_generate_simulation_plot_get',
    description: `Endpoint to get a preview image of an simulation plots
Sample Content URL:
https://sbo-nexus-delta.shapes-registry.org/v1/files/cad43d74-f697-48d6-9242-28cb6b4a4956/f9b265b2-22c3-4a92-9ad5-79dff37e39ca/https%3A%2F%2Fopenbrainplatform.org%2Fdata%2Fcad43d74-f697-48d6-9242-28cb6b4a4956%2Ff9b265b2-22c3-4a92-9ad5-79dff37e39ca%2Feadf0aa4-109c-4422-806c-325e5669565a?rev&#x3D;1`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'content_url',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'target',
        type: 'Query',
        schema: z.enum(['stimulus', 'simulation']),
      },
      {
        name: 'w',
        type: 'Query',
        schema: dpi,
      },
      {
        name: 'h',
        type: 'Query',
        schema: dpi,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not Found`,
        schema: z.object({ detail: z.string() }).passthrough(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/api/thumbnail-generation/generate/trace-image',
    alias: 'get_trace_image_api_thumbnail_generation_generate_trace_image_get',
    description: `Endpoint to get a preview image of an electrophysiology trace
Sample Content URL:
https://bbp.epfl.ch/nexus/v1/files/public/hippocampus/https%3A%2F%2Fbbp.epfl.ch%2Fneurosciencegraph%2Fdata%2Fb67a2aa6-d132-409b-8de5-49bb306bb251`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'content_url',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'dpi',
        type: 'Query',
        schema: dpi,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not Found`,
        schema: z.object({ detail: z.string() }).passthrough(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/api/thumbnail-generation/health',
    alias: 'health_api_thumbnail_generation_health_get',
    description: `Simple health check endpoint`,
    requestFormat: 'json',
    response: z.object({}).partial().passthrough(),
  },
  {
    method: 'get',
    path: '/api/thumbnail-generation/soma/process-nexus-swc',
    alias: 'process_soma_api_thumbnail_generation_soma_process_nexus_swc_get',
    description: `Process the SWC file fetched from the given URL and return the generated mesh file.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'content_url',
        type: 'Query',
        schema: z.string(),
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
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
