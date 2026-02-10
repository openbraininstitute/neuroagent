import { S3Client } from '@aws-sdk/client-s3';

import { getSettings } from '@/lib/config/settings';

let s3ClientInstance: S3Client | null = null;

/**
 * Get or create S3 client instance (singleton pattern)
 *
 * Supports both AWS S3 and MinIO (S3-compatible storage)
 *
 * Requirements: 10.1, 10.2
 */
export function getS3Client(): S3Client {
  if (s3ClientInstance) {
    return s3ClientInstance;
  }

  const settings = getSettings();

  // For MinIO compatibility, we need to ensure the endpoint URL is properly formatted
  // AWS SDK v3 has issues with port numbers in endpoints for presigned URLs
  // See: https://github.com/minio/minio/discussions/14709
  const endpointUrl = settings.storage.endpointUrl;

  s3ClientInstance = new S3Client({
    endpoint: endpointUrl,
    region: 'us-east-1', // MinIO doesn't care about region, but SDK requires it
    credentials:
      settings.storage.accessKey && settings.storage.secretKey
        ? {
            accessKeyId: settings.storage.accessKey,
            secretAccessKey: settings.storage.secretKey,
          }
        : undefined,
    forcePathStyle: true, // Required for MinIO compatibility
    // Disable host prefix injection to ensure endpoint is used as-is
    // This is critical for MinIO with non-standard ports
    disableHostPrefix: true,
  });

  return s3ClientInstance;
}

/**
 * Reset the S3 client instance (useful for testing)
 */
export function resetS3Client(): void {
  s3ClientInstance = null;
}
