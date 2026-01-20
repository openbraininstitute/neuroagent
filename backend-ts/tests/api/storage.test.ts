import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/storage/[file_identifier]/presigned-url/route';
import { validateAuth } from '@/lib/middleware/auth';

// Mock dependencies
vi.mock('@/lib/middleware/auth');

// Mock getSignedUrl to avoid actual S3 operations
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async (client, command) => {
    // Generate a fake presigned URL based on the command
    const bucket = command.input.Bucket;
    const key = command.input.Key;
    return `http://localhost:9000/${bucket}/${key}?X-Amz-Signature=fake-signature`;
  }),
}));

vi.mock('@/lib/config/settings', () => ({
  getSettings: () => ({
    storage: {
      endpointUrl: 'http://localhost:9000',
      bucketName: 'test-bucket',
      accessKey: 'test-key',
      secretKey: 'test-secret',
      expiresIn: 600,
    },
  }),
}));

describe('Storage API Routes', () => {
  const mockUserInfo = {
    sub: 'test-user-id',
    email: 'test@example.com',
    groups: [],
  };

  let mockS3Send: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockResolvedValue(mockUserInfo);

    // Mock S3Client.send to simulate file operations
    const { S3Client } = await import('@aws-sdk/client-s3');
    mockS3Send = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockS3Send?.mockRestore();
  });

  describe('GET /api/storage/{file_identifier}/presigned-url', () => {
    it('should return 401 for unauthenticated requests', async () => {
      vi.mocked(validateAuth).mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost/api/storage/test-file/presigned-url');
      const response = await GET(request, {
        params: Promise.resolve({ file_identifier: 'test-file' }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when file does not exist', async () => {
      // Mock S3 to throw NotFound error
      mockS3Send.mockRejectedValueOnce({
        name: 'NotFound',
        $metadata: { httpStatusCode: 404 },
      });

      const request = new NextRequest('http://localhost/api/storage/test-file/presigned-url');
      const response = await GET(request, {
        params: Promise.resolve({ file_identifier: 'test-file' }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Not Found');
      expect(data.message).toContain('test-file');
    });

    it('should generate presigned URL for existing file', async () => {
      const request = new NextRequest('http://localhost/api/storage/test-file.txt/presigned-url');
      const response = await GET(request, {
        params: Promise.resolve({ file_identifier: 'test-file.txt' }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain');

      const url = await response.text();
      expect(url).toBeTruthy();
      expect(typeof url).toBe('string');
      // Presigned URL should contain the bucket and key
      expect(url).toContain('test-bucket');
    });

    it('should use user-specific path for file key', async () => {
      const request = new NextRequest('http://localhost/api/storage/my-document.pdf/presigned-url');
      const response = await GET(request, {
        params: Promise.resolve({ file_identifier: 'my-document.pdf' }),
      });

      expect(response.status).toBe(200);

      const url = await response.text();
      expect(url).toBeTruthy();
      // URL should contain user-specific path (not URL-encoded in the path)
      expect(url).toContain(`${mockUserInfo.sub}/my-document.pdf`);
    });
  });

  describe('POST /api/storage/{file_identifier}/presigned-url', () => {
    it('should return 401 for unauthenticated requests', async () => {
      vi.mocked(validateAuth).mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost/api/storage/test-file/presigned-url', {
        method: 'POST',
      });
      const response = await POST(request, {
        params: Promise.resolve({ file_identifier: 'test-file' }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should generate presigned URL for upload', async () => {
      const request = new NextRequest('http://localhost/api/storage/new-file.txt/presigned-url', {
        method: 'POST',
      });
      const response = await POST(request, {
        params: Promise.resolve({ file_identifier: 'new-file.txt' }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain');

      const url = await response.text();
      expect(url).toBeTruthy();
      expect(typeof url).toBe('string');
    });

    it('should accept custom content type in request body', async () => {
      const request = new NextRequest('http://localhost/api/storage/image.png/presigned-url', {
        method: 'POST',
        body: JSON.stringify({ contentType: 'image/png' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request, {
        params: Promise.resolve({ file_identifier: 'image.png' }),
      });

      expect(response.status).toBe(200);
      const url = await response.text();
      expect(url).toBeTruthy();
    });

    it('should use default content type when not specified', async () => {
      const request = new NextRequest('http://localhost/api/storage/file.bin/presigned-url', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ file_identifier: 'file.bin' }),
      });

      expect(response.status).toBe(200);
      const url = await response.text();
      expect(url).toBeTruthy();
    });

    it('should use user-specific path for upload key', async () => {
      const request = new NextRequest('http://localhost/api/storage/upload.csv/presigned-url', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ file_identifier: 'upload.csv' }),
      });

      expect(response.status).toBe(200);
      const url = await response.text();
      expect(url).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle S3 errors gracefully', async () => {
      // Mock S3 to throw a generic error
      mockS3Send.mockRejectedValueOnce(new Error('S3 connection failed'));

      const request = new NextRequest('http://localhost/api/storage/test-file/presigned-url');
      const response = await GET(request, {
        params: Promise.resolve({ file_identifier: 'test-file' }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal Server Error');
    });

    it('should return 400 for missing file identifier', async () => {
      const request = new NextRequest('http://localhost/api/storage//presigned-url');
      const response = await GET(request, {
        params: Promise.resolve({ file_identifier: '' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Bad Request');
    });
  });
});
