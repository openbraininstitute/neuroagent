/**
 * OBIOne Base Tool
 * 
 * Base class for all OBIOne tools that interact with the OBIOne API.
 * OBIOne provides circuit analysis and metrics computation capabilities.
 */

import { z } from 'zod';
import { BaseTool } from '../base-tool';

/**
 * OBIOne metadata interface
 * 
 * Contains configuration needed for OBIOne API calls
 */
export interface OBIOneMetadata {
  /** OBIOne API base URL */
  obiOneUrl: string;
  
  /** Virtual lab ID for scoped queries (optional) */
  vlabId?: string;
  
  /** Project ID for scoped queries (optional) */
  projectId?: string;
  
  /** JWT token for authentication (optional) */
  jwtToken?: string;
}

/**
 * Abstract base class for OBIOne tools
 * 
 * Provides common functionality for making authenticated requests to OBIOne API
 * and handling circuit analysis operations.
 * 
 * @template TInput - Zod schema type for tool input validation
 */
export abstract class OBIOneTool<TInput extends z.ZodType> extends BaseTool<TInput> {
  protected obiOneMetadata: OBIOneMetadata;

  constructor(metadata: OBIOneMetadata) {
    super();
    this.obiOneMetadata = metadata;
  }

  /**
   * Build headers for OBIOne API requests
   * 
   * Includes virtual lab and project IDs if available,
   * and JWT token for authentication
   * 
   * @returns Headers object for fetch requests
   */
  protected buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.obiOneMetadata.vlabId) {
      headers['virtual_lab_id'] = this.obiOneMetadata.vlabId;
    }

    if (this.obiOneMetadata.projectId) {
      headers['project_id'] = this.obiOneMetadata.projectId;
    }

    if (this.obiOneMetadata.jwtToken) {
      headers['Authorization'] = `Bearer ${this.obiOneMetadata.jwtToken}`;
    }

    return headers;
  }

  /**
   * Make a GET request to OBIOne API
   * 
   * @param endpoint - API endpoint path (e.g., '/declared/circuit-metrics/{id}')
   * @param params - Query parameters
   * @returns Parsed JSON response
   * @throws Error if response is not 200
   */
  protected async get<T>(
    endpoint: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    const url = new URL(
      `${this.obiOneMetadata.obiOneUrl.replace(/\/$/, '')}${endpoint}`
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
        `The ${endpoint} endpoint returned a non 200 response code (${response.status}). Error: ${errorText}`
      );
    }

    const data = await response.json();
    
    // Log response for debugging
    console.log(`[OBIOne] Response from ${endpoint}:`, {
      status: response.status,
      dataPreview: JSON.stringify(data).substring(0, 200),
    });

    return data as T;
  }

  /**
   * Make a POST request to OBIOne API
   * 
   * @param endpoint - API endpoint path
   * @param body - Request body
   * @returns Parsed JSON response
   * @throws Error if response is not 200
   */
  protected async post<T>(
    endpoint: string,
    body: unknown
  ): Promise<T> {
    const url = `${this.obiOneMetadata.obiOneUrl.replace(/\/$/, '')}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
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
   * Check if OBIOne API is online
   * 
   * @returns True if health check passes
   */
  override async isOnline(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.obiOneMetadata.obiOneUrl.replace(/\/$/, '')}/health`,
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
 * Level of detail enum for OBIOne responses
 */
export const LevelOfDetailSchema = z.number().int().min(0).max(3);
