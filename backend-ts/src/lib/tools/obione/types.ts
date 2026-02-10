/**
 * Shared types for OBI-One tools
 */

import { type KyInstance } from 'ky';
import { type BaseContextVariables } from '../base-tool';

/**
 * Context variables for OBI-One tools.
 */
export interface ObiOneContextVariables extends BaseContextVariables {
  /** HTTP client (ky instance) pre-configured with JWT token */
  httpClient: KyInstance;

  /** OBI-One API base URL */
  obiOneUrl: string;

  /** Virtual lab ID (optional) */
  vlabId?: string;

  /** Project ID (optional) */
  projectId?: string;
}
