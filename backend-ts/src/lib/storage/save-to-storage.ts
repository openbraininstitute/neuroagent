/**
 * Utility for saving content to S3-compatible storage
 *
 * Translated from: backend/src/neuroagent/utils.py (save_to_storage function)
 */

import { PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

export interface SaveToStorageOptions {
  /** S3 client instance */
  s3Client: S3Client;

  /** S3 bucket name */
  bucketName: string;

  /** User ID for organizing storage */
  userId: string;

  /** Content MIME type */
  contentType: string;

  /** Content to store (string or buffer) */
  body: string | Buffer;

  /** Category for organizing files (e.g., 'json', 'image', 'data') */
  category: string;

  /** Thread ID for organizing storage */
  threadId: string;
}

/**
 * Save content to S3-compatible storage and return the storage identifier
 *
 * This function uploads content to S3/MinIO and returns a unique identifier
 * that can be used to retrieve the content later via presigned URLs.
 *
 * The storage path follows the pattern:
 * `{userId}/{threadId}/{category}/{uuid}`
 *
 * @param options - Storage options
 * @returns Storage identifier (UUID)
 */
export async function saveToStorage(options: SaveToStorageOptions): Promise<string> {
  const { s3Client, bucketName, userId, contentType, body, category, threadId } = options;

  // Generate unique identifier
  const identifier = randomUUID();

  // Construct S3 key with organized path structure
  const key = `${userId}/${threadId}/${category}/${identifier}`;

  // Upload to S3
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: typeof body === 'string' ? Buffer.from(body, 'utf-8') : body,
      ContentType: contentType,
    })
  );

  return identifier;
}
