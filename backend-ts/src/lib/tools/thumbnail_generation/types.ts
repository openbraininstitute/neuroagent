/**
 * Shared types for Thumbnail Generation tools
 */

import { type KyInstance } from 'ky';
import { type BaseContextVariables } from '../base-tool';
import { type S3Client } from '@aws-sdk/client-s3';

/**
 * Context variables for Thumbnail Generation tools.
 */
export interface ThumbnailGenerationContextVariables
  extends BaseContextVariables {
  /** HTTP client (ky instance) pre-configured with JWT token */
  httpClient: KyInstance;

  /** Thumbnail Generation API base URL */
  thumbnailGenerationUrl: string;

  /** EntityCore API base URL (for fetching entity assets) */
  entitycoreUrl: string;

  /** S3 client for storage operations */
  s3Client: S3Client;

  /** User ID for storage path */
  userId: string;

  /** S3 bucket name */
  bucketName: string;

  /** Thread ID for metadata */
  threadId: string;

  /** Virtual lab ID (optional) */
  vlabId?: string;

  /** Project ID (optional) */
  projectId?: string;
}
