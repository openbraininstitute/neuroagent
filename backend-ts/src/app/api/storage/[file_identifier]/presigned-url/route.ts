import { HeadObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { type NextRequest, NextResponse } from 'next/server';

import { getSettings } from '@/lib/config/settings';
import { validateAuth } from '@/lib/middleware/auth';
import { getS3Client } from '@/lib/storage/client';

/**
 * GET /api/storage/{file_identifier}/presigned-url
 *
 * Generate a presigned URL for file download from S3/MinIO storage.
 * The file is stored under a user-specific path: {userId}/{file_identifier}
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ file_identifier: string }> }
): Promise<NextResponse> {
  try {
    const settings = getSettings();

    // Validate authentication
    const userInfo = await validateAuth(request);
    if (!userInfo) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get file identifier from params
    const params = await context.params;
    const fileIdentifier = params.file_identifier;

    // Validate file identifier
    if (!fileIdentifier || fileIdentifier === 'undefined' || fileIdentifier === 'null') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'File identifier is required' },
        { status: 400 }
      );
    }

    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(fileIdentifier)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'File identifier must be a valid UUID format' },
        { status: 400 }
      );
    }

    // Get S3 client
    const s3Client = getS3Client();

    // Construct the key with user-specific path
    const key = `${userInfo.sub}/${fileIdentifier}`;

    // Check if object exists
    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: settings.storage.bucketName,
          Key: key,
        })
      );
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return NextResponse.json(
          { error: 'Not Found', message: `File ${fileIdentifier} not found` },
          { status: 404 }
        );
      }
      console.error('Error checking file existence:', error);
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Error accessing the file' },
        { status: 500 }
      );
    }

    // Generate presigned URL for download
    const command = new GetObjectCommand({
      Bucket: settings.storage.bucketName,
      Key: key,
    });

    // Generate presigned URL with explicit configuration for MinIO compatibility
    // AWS SDK v3 has known issues with MinIO and non-standard ports
    // We need to ensure the URL uses the correct endpoint
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: settings.storage.expiresIn || 600, // Default 10 minutes
      // Ensure signature version 4 is used (required for MinIO)
      signableHeaders: new Set(['host']),
    });

    // Return the presigned URL as JSON string (matching Python backend)
    // Python FastAPI returns str as JSON, so we need to match that format
    return NextResponse.json(presignedUrl, {
      status: 200,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to generate presigned URL',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/storage/{file_identifier}/presigned-url
 *
 * Generate a presigned URL for file upload to S3/MinIO storage.
 * The file will be stored under a user-specific path: {userId}/{file_identifier}
 *
 * Requirements: 10.1, 10.2, 10.3, 10.5
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ file_identifier: string }> }
): Promise<NextResponse> {
  try {
    const settings = getSettings();

    // Validate authentication
    const userInfo = await validateAuth(request);
    if (!userInfo) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get file identifier from params
    const params = await context.params;
    const fileIdentifier = params.file_identifier;

    // Validate file identifier
    if (!fileIdentifier || fileIdentifier === 'undefined' || fileIdentifier === 'null') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'File identifier is required' },
        { status: 400 }
      );
    }

    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(fileIdentifier)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'File identifier must be a valid UUID format' },
        { status: 400 }
      );
    }

    // Parse request body for optional content type
    let contentType = 'application/octet-stream';
    try {
      const body = await request.json();
      if (body.contentType) {
        contentType = body.contentType;
      }
    } catch {
      // Body is optional, use default content type
    }

    // Get S3 client
    const s3Client = getS3Client();

    // Construct the key with user-specific path
    const key = `${userInfo.sub}/${fileIdentifier}`;

    // Generate presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: settings.storage.bucketName,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: settings.storage.expiresIn || 600, // Default 10 minutes
    });

    // Return the presigned URL as JSON string (matching Python backend)
    return NextResponse.json(presignedUrl, {
      status: 200,
    });
  } catch (error) {
    console.error('Error generating upload presigned URL:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to generate presigned URL for upload',
      },
      { status: 500 }
    );
  }
}
