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

    if (!fileIdentifier) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'File identifier is required' },
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

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: settings.storage.expiresIn || 600, // Default 10 minutes
    });

    // Return the presigned URL as plain text (matching Python backend)
    return new NextResponse(presignedUrl, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
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

    if (!fileIdentifier) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'File identifier is required' },
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

    // Return the presigned URL as plain text
    return new NextResponse(presignedUrl, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
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
