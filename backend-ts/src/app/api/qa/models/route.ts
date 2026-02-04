/**
 * Models API Route
 *
 * Endpoint:
 * - GET /api/qa/models - List available LLM models from OpenRouter
 *
 * Features:
 * - Fetches models from OpenRouter API
 * - Filters models based on whitelisted regex pattern
 * - Returns model metadata (id, name, description, pricing, etc.)
 * - Authentication required
 * - Matches Python backend format
 */

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSettings } from '@/lib/config/settings';
import { validateAuth, AuthenticationError } from '@/lib/middleware/auth';

/**
 * OpenRouter API response schemas
 */
const ArchitectureSchema = z.object({
  input_modalities: z.array(z.string()),
  output_modalities: z.array(z.string()),
  tokenizer: z.string(),
});

const TopProviderSchema = z.object({
  is_moderated: z.boolean(),
});

const PricingSchema = z.object({
  prompt: z.string(),
  completion: z.string(),
  image: z.string().nullable().optional(),
  request: z.string().nullable().optional(),
  input_cache_read: z.string().nullable().optional(),
  input_cache_write: z.string().nullable().optional(),
  web_search: z.string().nullable().optional(),
  internal_reasoning: z.string().nullable().optional(),
});

const OpenRouterModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  created: z.number(),
  description: z.string(),
  architecture: ArchitectureSchema,
  top_provider: TopProviderSchema,
  pricing: PricingSchema,
  context_length: z.number(),
  hugging_face_id: z.string().nullable().optional(),
  per_request_limits: z.record(z.string()).nullable().optional(),
  supported_parameters: z.array(z.string()),
});

const OpenRouterResponseSchema = z.object({
  data: z.array(OpenRouterModelSchema),
});

export type OpenRouterModel = z.infer<typeof OpenRouterModelSchema>;

/**
 * Fetch available models from OpenRouter API
 */
async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    // Cache for 5 minutes to avoid excessive API calls
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch models from OpenRouter: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  const parsed = OpenRouterResponseSchema.parse(data);
  return parsed.data;
}

/**
 * Filter models based on whitelist regex pattern
 */
function filterModels(models: OpenRouterModel[], regexPattern: string): OpenRouterModel[] {
  try {
    const regex = new RegExp(regexPattern);
    return models.filter((model) => regex.test(model.id));
  } catch (error) {
    console.error('Invalid regex pattern for model filtering:', error);
    // If regex is invalid, return all models
    return models;
  }
}

/**
 * GET /api/qa/models
 *
 * Returns a list of available LLM models from OpenRouter, filtered by whitelist regex.
 * Matches the Python backend format and behavior.
 *
 * Response:
 * - Array of OpenRouter model objects with full metadata
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication (required like Python backend)
    await validateAuth(request);

    const settings = getSettings();

    // Fetch models from OpenRouter
    const allModels = await fetchOpenRouterModels();

    // Filter models based on whitelist regex
    const filteredModels = filterModels(allModels, settings.llm.whitelistedModelIdsRegex);

    return NextResponse.json(filteredModels);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: 'Authentication failed', message: error.message },
        { status: 401 }
      );
    }

    console.error('Error fetching models:', error);

    // Return appropriate error status
    if (error instanceof Error && error.message.includes('Failed to fetch models')) {
      return NextResponse.json(
        {
          error: 'Something went wrong. Could not retrieve list of models.',
          message: error.message,
        },
        { status: 502 } // Bad Gateway - external service error
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
