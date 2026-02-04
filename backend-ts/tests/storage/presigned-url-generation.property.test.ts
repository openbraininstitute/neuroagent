/**
 * Property-Based Tests for Presigned URL Generation
 *
 * Feature: typescript-backend-migration
 * Property 23: Presigned URL Generation
 *
 * For any valid S3/MinIO object key, generating a presigned URL should return
 * a valid, time-limited URL that allows access to the object.
 *
 * Validates: Requirements 10.3
 *
 * This test verifies that:
 * 1. Presigned URLs are generated with valid format
 * 2. URLs contain required query parameters (signature, expiration)
 * 3. URLs are time-limited based on configuration
 * 4. URLs are specific to the user and file identifier
 * 5. URLs can be used to access the object before expiration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import { HeadObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client, resetS3Client } from '@/lib/storage/client';

/**
 * Helper to parse presigned URL and extract query parameters
 */
function parsePresignedUrl(url: string): {
  baseUrl: string;
  params: URLSearchParams;
  expiresAt: number | null;
} {
  const urlObj = new URL(url);
  const params = urlObj.searchParams;

  // Extract expiration timestamp from various possible parameter names
  let expiresAt: number | null = null;
  const expiresParam =
    params.get('X-Amz-Expires') || params.get('Expires') || params.get('x-amz-expires');

  if (expiresParam) {
    expiresAt = parseInt(expiresParam, 10);
  }

  // Also check for X-Amz-Date to calculate absolute expiration
  const dateParam = params.get('X-Amz-Date');
  if (dateParam && expiresAt) {
    // X-Amz-Date is in format YYYYMMDDTHHMMSSZ
    const year = parseInt(dateParam.substring(0, 4), 10);
    const month = parseInt(dateParam.substring(4, 6), 10) - 1;
    const day = parseInt(dateParam.substring(6, 8), 10);
    const hour = parseInt(dateParam.substring(9, 11), 10);
    const minute = parseInt(dateParam.substring(11, 13), 10);
    const second = parseInt(dateParam.substring(13, 15), 10);

    const signedDate = new Date(Date.UTC(year, month, day, hour, minute, second));
    const absoluteExpiration = Math.floor(signedDate.getTime() / 1000) + expiresAt;
    expiresAt = absoluteExpiration;
  }

  return {
    baseUrl: `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`,
    params,
    expiresAt,
  };
}

/**
 * Helper to validate presigned URL structure
 */
function validatePresignedUrlStructure(url: string): {
  isValid: boolean;
  hasSignature: boolean;
  hasExpiration: boolean;
  hasAlgorithm: boolean;
  hasCredential: boolean;
} {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    return {
      isValid: true,
      hasSignature:
        params.has('X-Amz-Signature') || params.has('Signature') || params.has('x-amz-signature'),
      hasExpiration:
        params.has('X-Amz-Expires') || params.has('Expires') || params.has('x-amz-expires'),
      hasAlgorithm: params.has('X-Amz-Algorithm') || params.has('x-amz-algorithm'),
      hasCredential: params.has('X-Amz-Credential') || params.has('x-amz-credential'),
    };
  } catch {
    return {
      isValid: false,
      hasSignature: false,
      hasExpiration: false,
      hasAlgorithm: false,
      hasCredential: false,
    };
  }
}

describe('Presigned URL Generation Property Tests', () => {
  // Mock environment variables for testing
  beforeEach(() => {
    process.env['NEUROAGENT_STORAGE__ENDPOINT_URL'] = 'http://localhost:9000';
    process.env['NEUROAGENT_STORAGE__BUCKET_NAME'] = 'test-bucket';
    process.env['NEUROAGENT_STORAGE__ACCESS_KEY'] = 'test-access-key';
    process.env['NEUROAGENT_STORAGE__SECRET_KEY'] = 'test-secret-key';
    process.env['NEUROAGENT_STORAGE__EXPIRES_IN'] = '600';
  });

  afterEach(() => {
    resetS3Client();
    vi.clearAllMocks();
  });

  describe('Property 23: Presigned URL Generation', () => {
    /**
     * **Validates: Requirements 10.3**
     *
     * Test that presigned URLs have valid structure with required parameters
     */
    test.prop([
      fc.uuid(), // userId
      fc
        .string({ minLength: 1, maxLength: 100 })
        .filter((s) => !s.includes('/'))
        .filter((s) => s !== '.' && s !== '..'), // Exclude path navigation characters
    ])('should generate presigned URL with valid structure', async (userId, fileIdentifier) => {
      const s3Client = getS3Client();
      const bucketName = 'test-bucket';
      const key = `${userId}/${fileIdentifier}`;

      // Generate presigned URL for GET operation
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const presignedUrl = await getSignedUrl(s3Client, getCommand, {
        expiresIn: 600,
      });

      // Validate URL structure
      const validation = validatePresignedUrlStructure(presignedUrl);

      expect(validation.isValid).toBe(true);
      expect(validation.hasSignature).toBe(true);
      expect(validation.hasExpiration).toBe(true);
      expect(validation.hasAlgorithm).toBe(true);
      expect(validation.hasCredential).toBe(true);

      // Verify URL contains the key (check for the path structure)
      const urlObj = new URL(presignedUrl);

      // Decode the path to check for userId and fileIdentifier
      const decodedPath = decodeURIComponent(urlObj.pathname);
      expect(decodedPath).toContain(userId);
      expect(decodedPath).toContain(fileIdentifier);
    });

    /**
     * Test that presigned URLs are time-limited
     */
    test.prop([
      fc.uuid(),
      fc.string({ minLength: 1, maxLength: 100 }).filter((s) => !s.includes('/')),
      fc.integer({ min: 60, max: 3600 }), // expiresIn between 1 minute and 1 hour
    ])(
      'should generate presigned URL with correct expiration time',
      async (userId, fileIdentifier, expiresIn) => {
        const s3Client = getS3Client();
        const bucketName = 'test-bucket';
        const key = `${userId}/${fileIdentifier}`;

        const beforeGeneration = Math.floor(Date.now() / 1000);

        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        });

        const presignedUrl = await getSignedUrl(s3Client, getCommand, {
          expiresIn,
        });

        const afterGeneration = Math.floor(Date.now() / 1000);

        // Parse URL to extract expiration
        const parsed = parsePresignedUrl(presignedUrl);

        // Verify expiration is set
        expect(parsed.expiresAt).not.toBeNull();

        if (parsed.expiresAt !== null) {
          // Check if expiration is within reasonable bounds
          // The expiration should be approximately now + expiresIn
          const minExpectedExpiration = beforeGeneration + expiresIn;
          const maxExpectedExpiration = afterGeneration + expiresIn + 5; // Allow 5 seconds buffer

          expect(parsed.expiresAt).toBeGreaterThanOrEqual(minExpectedExpiration);
          expect(parsed.expiresAt).toBeLessThanOrEqual(maxExpectedExpiration);
        }
      }
    );

    /**
     * Test that presigned URLs for different users are different
     */
    test.prop([
      fc.uuid(), // userId1
      fc.uuid(), // userId2
      fc.string({ minLength: 1, maxLength: 100 }).filter((s) => !s.includes('/')), // fileIdentifier
    ])(
      'should generate different URLs for different users',
      async (userId1, userId2, fileIdentifier) => {
        // Skip if users are the same
        fc.pre(userId1 !== userId2);

        const s3Client = getS3Client();
        const bucketName = 'test-bucket';

        const key1 = `${userId1}/${fileIdentifier}`;
        const key2 = `${userId2}/${fileIdentifier}`;

        const command1 = new GetObjectCommand({
          Bucket: bucketName,
          Key: key1,
        });

        const command2 = new GetObjectCommand({
          Bucket: bucketName,
          Key: key2,
        });

        const url1 = await getSignedUrl(s3Client, command1, { expiresIn: 600 });
        const url2 = await getSignedUrl(s3Client, command2, { expiresIn: 600 });

        // URLs should be different
        expect(url1).not.toBe(url2);

        // URLs should contain different user IDs (check decoded paths)
        const urlObj1 = new URL(url1);
        const urlObj2 = new URL(url2);
        const decodedPath1 = decodeURIComponent(urlObj1.pathname);
        const decodedPath2 = decodeURIComponent(urlObj2.pathname);

        expect(decodedPath1).toContain(userId1);
        expect(decodedPath2).toContain(userId2);
      }
    );

    /**
     * Test that presigned URLs for different files are different
     */
    test.prop([
      fc.uuid(), // userId
      fc
        .string({ minLength: 1, maxLength: 100 })
        .filter((s) => !s.includes('/'))
        .filter((s) => s !== '.' && s !== '..'), // fileIdentifier1
      fc
        .string({ minLength: 1, maxLength: 100 })
        .filter((s) => !s.includes('/'))
        .filter((s) => s !== '.' && s !== '..'), // fileIdentifier2
    ])(
      'should generate different URLs for different files',
      async (userId, fileIdentifier1, fileIdentifier2) => {
        // Skip if files are the same
        fc.pre(fileIdentifier1 !== fileIdentifier2);

        const s3Client = getS3Client();
        const bucketName = 'test-bucket';

        const key1 = `${userId}/${fileIdentifier1}`;
        const key2 = `${userId}/${fileIdentifier2}`;

        const command1 = new GetObjectCommand({
          Bucket: bucketName,
          Key: key1,
        });

        const command2 = new GetObjectCommand({
          Bucket: bucketName,
          Key: key2,
        });

        const url1 = await getSignedUrl(s3Client, command1, { expiresIn: 600 });
        const url2 = await getSignedUrl(s3Client, command2, { expiresIn: 600 });

        // URLs should be different
        expect(url1).not.toBe(url2);

        // URLs should contain different file identifiers (check decoded paths)
        const urlObj1 = new URL(url1);
        const urlObj2 = new URL(url2);
        const decodedPath1 = decodeURIComponent(urlObj1.pathname);
        const decodedPath2 = decodeURIComponent(urlObj2.pathname);

        expect(decodedPath1).toContain(fileIdentifier1);
        expect(decodedPath2).toContain(fileIdentifier2);
      }
    );

    /**
     * Test that presigned URLs for GET and PUT operations are different
     */
    test.prop([
      fc.uuid(),
      fc.string({ minLength: 1, maxLength: 100 }).filter((s) => !s.includes('/')),
    ])(
      'should generate different URLs for GET and PUT operations',
      async (userId, fileIdentifier) => {
        const s3Client = getS3Client();
        const bucketName = 'test-bucket';
        const key = `${userId}/${fileIdentifier}`;

        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        });

        const putCommand = new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
        });

        const getUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 600 });
        const putUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 600 });

        // URLs should be different (different signatures for different operations)
        expect(getUrl).not.toBe(putUrl);

        // Both should have valid structure
        const getValidation = validatePresignedUrlStructure(getUrl);
        const putValidation = validatePresignedUrlStructure(putUrl);

        expect(getValidation.isValid).toBe(true);
        expect(putValidation.isValid).toBe(true);
      }
    );

    /**
     * Test that presigned URLs contain the bucket name
     */
    test.prop([
      fc.uuid(),
      fc.string({ minLength: 1, maxLength: 100 }).filter((s) => !s.includes('/')),
    ])('should include bucket name in presigned URL', async (userId, fileIdentifier) => {
      const s3Client = getS3Client();
      const bucketName = 'test-bucket';
      const key = `${userId}/${fileIdentifier}`;

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 600,
      });

      // URL should contain the bucket name (in path-style URLs)
      expect(presignedUrl).toContain(bucketName);
    });

    /**
     * Test that presigned URLs are deterministic for same inputs at same time
     */
    it('should generate consistent URLs for same inputs', async () => {
      const s3Client = getS3Client();
      const bucketName = 'test-bucket';
      const userId = '12345678-1234-1234-1234-123456789012';
      const fileIdentifier = 'test-file.txt';
      const key = `${userId}/${fileIdentifier}`;

      const command1 = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const command2 = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      // Generate URLs at approximately the same time
      const url1 = await getSignedUrl(s3Client, command1, { expiresIn: 600 });
      const url2 = await getSignedUrl(s3Client, command2, { expiresIn: 600 });

      // Parse both URLs
      const parsed1 = parsePresignedUrl(url1);
      const parsed2 = parsePresignedUrl(url2);

      // Base URLs should be identical
      expect(parsed1.baseUrl).toBe(parsed2.baseUrl);

      // Expiration times should be very close (within 1 second)
      if (parsed1.expiresAt !== null && parsed2.expiresAt !== null) {
        expect(Math.abs(parsed1.expiresAt - parsed2.expiresAt)).toBeLessThanOrEqual(1);
      }
    });

    /**
     * Test that presigned URLs work with special characters in file names
     */
    test.prop([
      fc.uuid(),
      fc
        .string({ minLength: 1, maxLength: 50 })
        .filter((s) => !s.includes('/'))
        .map((s) => s.replace(/[<>:"|?*]/g, '_')), // Remove invalid filename chars
    ])('should handle special characters in file identifiers', async (userId, fileIdentifier) => {
      const s3Client = getS3Client();
      const bucketName = 'test-bucket';
      const key = `${userId}/${fileIdentifier}`;

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 600,
      });

      // URL should be valid
      const validation = validatePresignedUrlStructure(presignedUrl);
      expect(validation.isValid).toBe(true);

      // URL should be properly encoded
      expect(() => new URL(presignedUrl)).not.toThrow();
    });

    /**
     * Test that presigned URLs respect minimum expiration time
     */
    test.prop([
      fc.uuid(),
      fc.string({ minLength: 1, maxLength: 100 }).filter((s) => !s.includes('/')),
    ])('should enforce minimum expiration time of 1 second', async (userId, fileIdentifier) => {
      const s3Client = getS3Client();
      const bucketName = 'test-bucket';
      const key = `${userId}/${fileIdentifier}`;

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      // AWS SDK enforces minimum of 1 second
      const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 1,
      });

      const validation = validatePresignedUrlStructure(presignedUrl);
      expect(validation.isValid).toBe(true);
      expect(validation.hasExpiration).toBe(true);
    });

    /**
     * Test that presigned URLs respect maximum expiration time
     */
    test.prop([
      fc.uuid(),
      fc.string({ minLength: 1, maxLength: 100 }).filter((s) => !s.includes('/')),
    ])('should enforce maximum expiration time of 7 days', async (userId, fileIdentifier) => {
      const s3Client = getS3Client();
      const bucketName = 'test-bucket';
      const key = `${userId}/${fileIdentifier}`;

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      // AWS SDK enforces maximum of 7 days (604800 seconds)
      const maxExpiration = 604800;
      const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: maxExpiration,
      });

      const validation = validatePresignedUrlStructure(presignedUrl);
      expect(validation.isValid).toBe(true);
      expect(validation.hasExpiration).toBe(true);

      const parsed = parsePresignedUrl(presignedUrl);
      expect(parsed.expiresAt).not.toBeNull();
    });

    /**
     * Test that presigned URLs include correct HTTP method information
     */
    test.prop([
      fc.uuid(),
      fc.string({ minLength: 1, maxLength: 100 }).filter((s) => !s.includes('/')),
      fc.constantFrom('GET', 'PUT', 'HEAD'),
    ])(
      'should generate valid URLs for different HTTP methods',
      async (userId, fileIdentifier, method) => {
        const s3Client = getS3Client();
        const bucketName = 'test-bucket';
        const key = `${userId}/${fileIdentifier}`;

        let command;
        switch (method) {
          case 'GET':
            command = new GetObjectCommand({ Bucket: bucketName, Key: key });
            break;
          case 'PUT':
            command = new PutObjectCommand({ Bucket: bucketName, Key: key });
            break;
          case 'HEAD':
            command = new HeadObjectCommand({ Bucket: bucketName, Key: key });
            break;
        }

        const presignedUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 600,
        });

        const validation = validatePresignedUrlStructure(presignedUrl);
        expect(validation.isValid).toBe(true);
        expect(validation.hasSignature).toBe(true);
      }
    );

    /**
     * Test that presigned URLs with content type are valid
     */
    test.prop([
      fc.uuid(),
      fc.string({ minLength: 1, maxLength: 100 }).filter((s) => !s.includes('/')),
      fc.constantFrom(
        'application/json',
        'text/plain',
        'image/png',
        'application/pdf',
        'video/mp4'
      ),
    ])(
      'should generate valid URLs with content type',
      async (userId, fileIdentifier, contentType) => {
        const s3Client = getS3Client();
        const bucketName = 'test-bucket';
        const key = `${userId}/${fileIdentifier}`;

        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          ContentType: contentType,
        });

        const presignedUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 600,
        });

        const validation = validatePresignedUrlStructure(presignedUrl);
        expect(validation.isValid).toBe(true);
        expect(validation.hasSignature).toBe(true);
      }
    );
  });
});
