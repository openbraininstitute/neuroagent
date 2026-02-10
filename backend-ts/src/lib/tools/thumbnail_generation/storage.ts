/**
 * Storage utilities for thumbnail generation tools
 * Translated from: backend/src/neuroagent/utils.py (save_to_storage function)
 */

import { PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

/**
 * Save content to S3 storage and return the storage ID.
 *
 * @param s3Client - AWS S3 client instance
 * @param bucketName - Name of the S3 bucket
 * @param userId - User identifier
 * @param contentType - Content type of the object (e.g. 'image/png', 'application/json')
 * @param category - Category metadata for the object ('image' or 'json')
 * @param body - Content to store (bytes or string)
 * @param threadId - Optional thread identifier for grouping related objects
 * @returns Generated storage identifier
 */
export async function saveToStorage(
  s3Client: S3Client,
  bucketName: string,
  userId: string,
  contentType: string,
  category: 'image' | 'json',
  body: Buffer | Uint8Array | string,
  threadId?: string
): Promise<string> {
  // Generate unique identifier
  const identifier = randomUUID();

  // Construct the full path including user_id
  const filename = `${userId}/${identifier}`;

  // Build metadata
  const metadata: Record<string, string> = {
    category,
  };

  if (threadId) {
    metadata['thread_id'] = threadId;
  }

  // Save to S3 with metadata
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filename,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  });

  await s3Client.send(command);

  return identifier;
}
