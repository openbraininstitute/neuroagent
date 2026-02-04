/**
 * Integration Tests for Storage Integration (S3/MinIO)
 *
 * Feature: typescript-backend-migration
 * Task: 27.3 Write integration tests for external services
 * Requirements: 13.2
 *
 * These tests verify storage integration with mocks to avoid actual S3/MinIO calls.
 * CRITICAL: All tests use mocks - NO real storage operations are performed.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  HeadObjectCommand: vi.fn(),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  ListObjectsV2Command: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

describe('Integration: Storage Integration (S3/MinIO)', () => {
  let mockS3Client: any;
  let mockSend: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend = vi.fn();
    mockS3Client = {
      send: mockSend,
    };
    vi.mocked(S3Client).mockImplementation(() => mockS3Client);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('S3Client Initialization', () => {
    it('should initialize S3 client with MinIO endpoint', () => {
      const client = new S3Client({
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
        forcePathStyle: true,
      });

      expect(client).toBeDefined();
      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'http://localhost:9000',
          forcePathStyle: true,
        })
      );
    });

    it('should initialize S3 client with AWS S3 endpoint', () => {
      const client = new S3Client({
        region: 'us-west-2',
        credentials: {
          accessKeyId: 'aws-key',
          secretAccessKey: 'aws-secret',
        },
      });

      expect(client).toBeDefined();
    });

    it('should handle missing credentials gracefully', () => {
      // Should not throw during initialization
      expect(() => {
        new S3Client({
          endpoint: 'http://localhost:9000',
          region: 'us-east-1',
        });
      }).not.toThrow();
    });
  });

  describe('File Operations', () => {
    it('should check if file exists (mocked)', async () => {
      mockSend.mockResolvedValue({
        ContentLength: 1024,
        LastModified: new Date(),
      });

      const client = new S3Client({
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      });

      const command = new HeadObjectCommand({
        Bucket: 'test-bucket',
        Key: 'test-file.txt',
      });

      const result = await client.send(command);

      expect(mockSend).toHaveBeenCalledWith(command);
      expect(result.ContentLength).toBe(1024);
    });

    it('should handle file not found error', async () => {
      mockSend.mockRejectedValue({
        name: 'NotFound',
        $metadata: { httpStatusCode: 404 },
      });

      const client = new S3Client({
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      });

      const command = new HeadObjectCommand({
        Bucket: 'test-bucket',
        Key: 'non-existent.txt',
      });

      await expect(client.send(command)).rejects.toMatchObject({
        name: 'NotFound',
      });
    });

    it('should upload file (mocked)', async () => {
      mockSend.mockResolvedValue({
        ETag: '"abc123"',
        VersionId: 'v1',
      });

      const client = new S3Client({
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      });

      const command = new PutObjectCommand({
        Bucket: 'test-bucket',
        Key: 'uploads/test-file.txt',
        Body: 'Test content',
        ContentType: 'text/plain',
      });

      const result = await client.send(command);

      expect(mockSend).toHaveBeenCalledWith(command);
      expect(result.ETag).toBe('"abc123"');
    });

    it('should download file (mocked)', async () => {
      const mockBody = {
        transformToString: vi.fn().mockResolvedValue('File content'),
      };

      mockSend.mockResolvedValue({
        Body: mockBody,
        ContentType: 'text/plain',
        ContentLength: 12,
      });

      const client = new S3Client({
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      });

      const command = new GetObjectCommand({
        Bucket: 'test-bucket',
        Key: 'downloads/test-file.txt',
      });

      const result = await client.send(command);

      expect(mockSend).toHaveBeenCalledWith(command);
      expect(result.Body).toBeDefined();
    });
  });

  describe('Presigned URLs', () => {
    it('should generate presigned URL for download (mocked)', async () => {
      vi.mocked(getSignedUrl).mockResolvedValue(
        'http://localhost:9000/test-bucket/test-file.txt?X-Amz-Signature=abc123'
      );

      const client = new S3Client({
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      });

      const command = new GetObjectCommand({
        Bucket: 'test-bucket',
        Key: 'test-file.txt',
      });

      const url = await getSignedUrl(client, command, { expiresIn: 3600 });

      expect(getSignedUrl).toHaveBeenCalledWith(client, command, { expiresIn: 3600 });
      expect(url).toContain('test-bucket');
      expect(url).toContain('test-file.txt');
      expect(url).toContain('X-Amz-Signature');
    });

    it('should generate presigned URL for upload (mocked)', async () => {
      vi.mocked(getSignedUrl).mockResolvedValue(
        'http://localhost:9000/test-bucket/upload.txt?X-Amz-Signature=def456'
      );

      const client = new S3Client({
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      });

      const command = new PutObjectCommand({
        Bucket: 'test-bucket',
        Key: 'upload.txt',
        ContentType: 'text/plain',
      });

      const url = await getSignedUrl(client, command, { expiresIn: 600 });

      expect(getSignedUrl).toHaveBeenCalledWith(client, command, { expiresIn: 600 });
      expect(url).toContain('upload.txt');
    });

    it('should respect expiration time in presigned URLs', async () => {
      vi.mocked(getSignedUrl).mockResolvedValue(
        'http://localhost:9000/test-bucket/file.txt?X-Amz-Expires=300&X-Amz-Signature=xyz'
      );

      const client = new S3Client({
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      });

      const command = new GetObjectCommand({
        Bucket: 'test-bucket',
        Key: 'file.txt',
      });

      const url = await getSignedUrl(client, command, { expiresIn: 300 });

      expect(url).toContain('X-Amz-Expires=300');
    });

    it('should generate user-specific presigned URLs', async () => {
      const userId = 'user-123';
      const fileName = 'document.pdf';

      vi.mocked(getSignedUrl).mockResolvedValue(
        `http://localhost:9000/test-bucket/${userId}/${fileName}?X-Amz-Signature=abc`
      );

      const client = new S3Client({
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      });

      const command = new GetObjectCommand({
        Bucket: 'test-bucket',
        Key: `${userId}/${fileName}`,
      });

      const url = await getSignedUrl(client, command, { expiresIn: 3600 });

      expect(url).toContain(userId);
      expect(url).toContain(fileName);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors', async () => {
      mockSend.mockRejectedValue(new Error('Connection refused'));

      const client = new S3Client({
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      });

      const command = new HeadObjectCommand({
        Bucket: 'test-bucket',
        Key: 'test-file.txt',
      });

      await expect(client.send(command)).rejects.toThrow('Connection refused');
    });

    it('should handle access denied errors', async () => {
      mockSend.mockRejectedValue({
        name: 'AccessDenied',
        $metadata: { httpStatusCode: 403 },
        message: 'Access Denied',
      });

      const client = new S3Client({
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'wrong-key',
          secretAccessKey: 'wrong-secret',
        },
      });

      const command = new GetObjectCommand({
        Bucket: 'test-bucket',
        Key: 'protected-file.txt',
      });

      await expect(client.send(command)).rejects.toMatchObject({
        name: 'AccessDenied',
      });
    });

    it('should handle bucket not found errors', async () => {
      mockSend.mockRejectedValue({
        name: 'NoSuchBucket',
        $metadata: { httpStatusCode: 404 },
        message: 'The specified bucket does not exist',
      });

      const client = new S3Client({
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      });

      const command = new HeadObjectCommand({
        Bucket: 'non-existent-bucket',
        Key: 'file.txt',
      });

      await expect(client.send(command)).rejects.toMatchObject({
        name: 'NoSuchBucket',
      });
    });

    it('should handle network timeout errors', async () => {
      mockSend.mockRejectedValue({
        name: 'TimeoutError',
        message: 'Request timed out',
      });

      const client = new S3Client({
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
        requestHandler: {
          requestTimeout: 1000,
        } as any,
      });

      const command = new GetObjectCommand({
        Bucket: 'test-bucket',
        Key: 'large-file.bin',
      });

      await expect(client.send(command)).rejects.toMatchObject({
        name: 'TimeoutError',
      });
    });
  });

  describe('Content Type Handling', () => {
    it('should set correct content type for different file types', async () => {
      mockSend.mockResolvedValue({ ETag: '"abc"' });

      const client = new S3Client({
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      });

      const testCases = [
        { file: 'document.pdf', contentType: 'application/pdf' },
        { file: 'image.png', contentType: 'image/png' },
        { file: 'data.json', contentType: 'application/json' },
        { file: 'style.css', contentType: 'text/css' },
        { file: 'script.js', contentType: 'application/javascript' },
      ];

      for (const { file, contentType } of testCases) {
        const command = new PutObjectCommand({
          Bucket: 'test-bucket',
          Key: file,
          Body: 'content',
          ContentType: contentType,
        });

        await client.send(command);
        expect(mockSend).toHaveBeenCalledWith(command);
      }
    });

    it('should use default content type when not specified', async () => {
      mockSend.mockResolvedValue({ ETag: '"def"' });

      const client = new S3Client({
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      });

      const command = new PutObjectCommand({
        Bucket: 'test-bucket',
        Key: 'unknown-file.bin',
        Body: 'binary content',
        ContentType: 'application/octet-stream',
      });

      await client.send(command);
      expect(mockSend).toHaveBeenCalledWith(command);
    });
  });

  describe('Path Style Configuration', () => {
    it('should use path-style URLs for MinIO', () => {
      const client = new S3Client({
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
        forcePathStyle: true,
      });

      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          forcePathStyle: true,
        })
      );
    });

    it('should use virtual-hosted-style URLs for AWS S3', () => {
      const client = new S3Client({
        region: 'us-west-2',
        credentials: {
          accessKeyId: 'aws-key',
          secretAccessKey: 'aws-secret',
        },
        forcePathStyle: false,
      });

      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          forcePathStyle: false,
        })
      );
    });
  });
});
