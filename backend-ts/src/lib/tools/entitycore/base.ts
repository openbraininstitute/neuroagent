/**
 * EntityCore Base Tool
 * 
 * Base class for all EntityCore tools that interact with the EntityCore API.
 * Provides common functionality for authentication, headers, and API communication.
 */

import { z } from 'zod';
import { BaseTool } from '../base-tool';

/**
 * EntityCore metadata interface
 * 
 * Contains configuration needed for EntityCore API calls
 */
export interface EntityCoreMetadata {
  /** EntityCore API base URL */
  entitycoreUrl: string;
  
  /** Virtual lab ID for scoped queries (optional) */
  vlabId?: string;
  
  /** Project ID for scoped queries (optional) */
  projectId?: string;
  
  /** Frontend URL for entity links */
  entityFrontendUrl: string;
}

/**
 * Abstract base class for EntityCore tools
 * 
 * Provides common functionality for making authenticated requests to EntityCore API
 * and handling brain region hierarchy queries.
 * 
 * @template TInput - Zod schema type for tool input validation
 */
export abstract class EntityCoreTool<TInput extends z.ZodType> extends BaseTool<TInput> {
  protected entityCoreMetadata: EntityCoreMetadata;

  constructor(metadata: EntityCoreMetadata) {
    super();
    this.entityCoreMetadata = metadata;
  }

  /**
   * Build headers for EntityCore API requests
   * 
   * Includes virtual lab and project IDs if available
   * 
   * @returns Headers object for fetch requests
   */
  protected buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.entityCoreMetadata.vlabId) {
      headers['virtual-lab-id'] = this.entityCoreMetadata.vlabId;
    }

    if (this.entityCoreMetadata.projectId) {
      headers['project-id'] = this.entityCoreMetadata.projectId;
    }

    return headers;
  }

  /**
   * Make a GET request to EntityCore API
   * 
   * @param endpoint - API endpoint path (e.g., '/brain-region')
   * @param params - Query parameters
   * @returns Parsed JSON response
   * @throws Error if response is not 200
   */
  protected async get<T>(
    endpoint: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    const url = new URL(
      `${this.entityCoreMetadata.entitycoreUrl.replace(/\/$/, '')}${endpoint}`
    );

    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `The ${endpoint} endpoint returned a non 200 response code. Error: ${errorText}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Resolve brain region ID to hierarchy ID
   * 
   * Makes an extra request to map brain region ID to hierarchy ID
   * for use in within_brain_region_hierarchy_id parameter.
   * 
   * @param brainRegionId - Brain region ID to resolve
   * @returns Hierarchy ID for the brain region
   */
  protected async resolveBrainRegionToHierarchyId(
    brainRegionId: string
  ): Promise<string> {
    const response = await this.get<{ hierarchy_id: string }>(
      `/brain-region/${brainRegionId}`
    );
    return response.hierarchy_id;
  }

  /**
   * Check if EntityCore API is online
   * 
   * @returns True if health check passes
   */
  override async isOnline(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.entityCoreMetadata.entitycoreUrl.replace(/\/$/, '')}/health`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Exclude brain region parameters from LLM input
 * 
 * These parameters should not be provided directly by the LLM.
 * Instead, the tool will automatically handle brain region filtering
 * using within_brain_region_brain_region_id.
 */
export const EntityCoreExcludeBRParamsSchema = z.object({
  // All brain region filter fields are excluded
  brain_region__name: z.never().optional(),
  brain_region__name__in: z.never().optional(),
  brain_region__name__ilike: z.never().optional(),
  brain_region__id: z.never().optional(),
  brain_region__id__in: z.never().optional(),
  brain_region__acronym: z.never().optional(),
  brain_region__acronym__in: z.never().optional(),
  
  // Hierarchy fields are excluded
  within_brain_region_hierarchy_id: z.never().optional(),
  within_brain_region_ascendants: z.never().optional(),
});

/**
 * Exclude name parameters from LLM input
 * 
 * These parameters are excluded to encourage the LLM to use
 * semantic_search instead of direct name-based filtering.
 * 
 * Note: We use an empty object instead of z.never() fields because
 * z.never() generates JSON Schema "not" constraints that are not
 * supported by OpenAI's function calling API.
 */
export const EntityCoreExcludeNameParamsSchema = z.object({
  // Empty object - name parameters are simply not included
  // This encourages LLM to use semantic_search instead
});

/**
 * Common pagination parameters for EntityCore list endpoints
 * 
 * Note: Using .default() without .optional() because:
 * - Zod treats .default() as optional (you can omit the field)
 * - But JSON Schema marks it as required with a default value
 * - OpenAI's function calling requires this format
 */
export const EntityCorePaginationSchema = z.object({
  page: z.number().int().min(1).default(1).describe('Page number'),
  page_size: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe('Number of items per page'),
});

/**
 * Standard list response wrapper from EntityCore
 */
export const EntityCoreListResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int(),
    page: z.number().int(),
    page_size: z.number().int(),
    pages: z.number().int(),
  });
