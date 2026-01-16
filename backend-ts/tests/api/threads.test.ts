/**
 * Tests for Threads API Routes
 * 
 * Tests CRUD operations, authentication, authorization, and full-text search.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { GET as getThreads, POST as createThread } from '@/app/api/threads/route';
import { GET as getThread, PATCH as updateThread, DELETE as deleteThread } from '@/app/api/threads/[thread_id]/route';
import { GET as searchThreads } from '@/app/api/threads/search/route';
import { prisma } from '@/lib/db/client';

// Mock the auth middleware
vi.mock('@/lib/middleware/auth', () => ({
  validateAuth: vi.fn(),
  validateProject: vi.fn(),
  AuthenticationError: class AuthenticationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'AuthenticationError';
    }
  },
  AuthorizationError: class AuthorizationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'AuthorizationError';
    }
  },
}));

describe('Threads API Routes', () => {
  const testUserId = crypto.randomUUID();
  const testThreadId = crypto.randomUUID();
  const otherUserId = crypto.randomUUID();

  beforeEach(async () => {
    // Clean up test data
    await prisma.message.deleteMany({});
    await prisma.thread.deleteMany({});
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.message.deleteMany({});
    await prisma.thread.deleteMany({});
    vi.clearAllMocks();
  });

  describe('POST /api/threads', () => {
    it('should create a new thread', async () => {
      const { validateAuth, validateProject } = await import('@/lib/middleware/auth');

      vi.mocked(validateAuth).mockResolvedValue({
        sub: testUserId,
        groups: [],
      });

      vi.mocked(validateProject).mockReturnValue(undefined);

      const request = new NextRequest('http://localhost/api/threads', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Thread',
          virtual_lab_id: null,
          project_id: null,
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      const response = await createThread(request);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.title).toBe('Test Thread');
      expect(body.user_id).toBe(testUserId);
      expect(body.thread_id).toBeDefined();
    });

    it('should return 401 for unauthenticated requests', async () => {
      const { validateAuth } = await import('@/lib/middleware/auth');
      const { AuthenticationError } = await import('@/lib/middleware/auth');

      vi.mocked(validateAuth).mockRejectedValue(
        new AuthenticationError('Missing or invalid Authorization header')
      );

      const request = new NextRequest('http://localhost/api/threads', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await createThread(request);

      expect(response.status).toBe(401);
    });

    it('should validate project access when provided', async () => {
      const { validateAuth, validateProject } = await import('@/lib/middleware/auth');
      const { AuthorizationError } = await import('@/lib/middleware/auth');

      vi.mocked(validateAuth).mockResolvedValue({
        sub: testUserId,
        groups: [],
      });

      vi.mocked(validateProject).mockImplementation(() => {
        throw new AuthorizationError('User does not belong to the project');
      });

      const request = new NextRequest('http://localhost/api/threads', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test',
          virtual_lab_id: crypto.randomUUID(),
          project_id: crypto.randomUUID(),
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      const response = await createThread(request);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/threads', () => {
    beforeEach(async () => {
      // Create test threads
      await prisma.thread.createMany({
        data: [
          {
            id: crypto.randomUUID(),
            userId: testUserId,
            title: 'Thread 1',
            creationDate: new Date('2024-01-01'),
            updateDate: new Date('2024-01-01'),
          },
          {
            id: crypto.randomUUID(),
            userId: testUserId,
            title: 'Thread 2',
            creationDate: new Date('2024-01-02'),
            updateDate: new Date('2024-01-02'),
          },
          {
            id: crypto.randomUUID(),
            userId: otherUserId,
            title: 'Other User Thread',
            creationDate: new Date('2024-01-03'),
            updateDate: new Date('2024-01-03'),
          },
        ],
      });
    });

    it('should list threads for authenticated user', async () => {
      const { validateAuth, validateProject } = await import('@/lib/middleware/auth');

      vi.mocked(validateAuth).mockResolvedValue({
        sub: testUserId,
        groups: [],
      });

      vi.mocked(validateProject).mockReturnValue(undefined);

      const request = new NextRequest('http://localhost/api/threads', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
        },
      });

      const response = await getThreads(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.results).toHaveLength(2);
      expect(body.results.every((t: any) => t.user_id === testUserId)).toBe(true);
    });

    it('should support pagination', async () => {
      const { validateAuth, validateProject } = await import('@/lib/middleware/auth');

      vi.mocked(validateAuth).mockResolvedValue({
        sub: testUserId,
        groups: [],
      });

      vi.mocked(validateProject).mockReturnValue(undefined);

      const request = new NextRequest('http://localhost/api/threads?page_size=1', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
        },
      });

      const response = await getThreads(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.results).toHaveLength(1);
      expect(body.has_more).toBe(true);
      expect(body.next_cursor).toBeDefined();
    });

    it('should support sorting', async () => {
      const { validateAuth, validateProject } = await import('@/lib/middleware/auth');

      vi.mocked(validateAuth).mockResolvedValue({
        sub: testUserId,
        groups: [],
      });

      vi.mocked(validateProject).mockReturnValue(undefined);

      const request = new NextRequest('http://localhost/api/threads?sort=creation_date', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
        },
      });

      const response = await getThreads(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.results[0].title).toBe('Thread 1');
    });
  });

  describe('GET /api/threads/[thread_id]', () => {
    beforeEach(async () => {
      await prisma.thread.create({
        data: {
          id: testThreadId,
          userId: testUserId,
          title: 'Test Thread',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });
    });

    it('should get thread by id', async () => {
      const { validateAuth } = await import('@/lib/middleware/auth');

      vi.mocked(validateAuth).mockResolvedValue({
        sub: testUserId,
        groups: [],
      });

      const request = new NextRequest(`http://localhost/api/threads/${testThreadId}`, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
        },
      });

      const response = await getThread(request, { params: { thread_id: testThreadId } });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.thread_id).toBe(testThreadId);
      expect(body.title).toBe('Test Thread');
    });

    it('should return 404 for non-existent thread', async () => {
      const { validateAuth } = await import('@/lib/middleware/auth');

      vi.mocked(validateAuth).mockResolvedValue({
        sub: testUserId,
        groups: [],
      });

      const nonExistentId = crypto.randomUUID();
      const request = new NextRequest(`http://localhost/api/threads/${nonExistentId}`, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
        },
      });

      const response = await getThread(request, { params: { thread_id: nonExistentId } });

      expect(response.status).toBe(404);
    });

    it('should return 403 for thread owned by different user', async () => {
      const { validateAuth } = await import('@/lib/middleware/auth');

      vi.mocked(validateAuth).mockResolvedValue({
        sub: otherUserId,
        groups: [],
      });

      const request = new NextRequest(`http://localhost/api/threads/${testThreadId}`, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
        },
      });

      const response = await getThread(request, { params: { thread_id: testThreadId } });

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/threads/[thread_id]', () => {
    beforeEach(async () => {
      await prisma.thread.create({
        data: {
          id: testThreadId,
          userId: testUserId,
          title: 'Original Title',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });
    });

    it('should update thread title', async () => {
      const { validateAuth } = await import('@/lib/middleware/auth');

      vi.mocked(validateAuth).mockResolvedValue({
        sub: testUserId,
        groups: [],
      });

      const request = new NextRequest(`http://localhost/api/threads/${testThreadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Title' }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      const response = await updateThread(request, { params: { thread_id: testThreadId } });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.title).toBe('Updated Title');

      // Verify in database
      const thread = await prisma.thread.findUnique({ where: { id: testThreadId } });
      expect(thread?.title).toBe('Updated Title');
    });

    it('should return 403 for thread owned by different user', async () => {
      const { validateAuth } = await import('@/lib/middleware/auth');

      vi.mocked(validateAuth).mockResolvedValue({
        sub: otherUserId,
        groups: [],
      });

      const request = new NextRequest(`http://localhost/api/threads/${testThreadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Title' }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      const response = await updateThread(request, { params: { thread_id: testThreadId } });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/threads/[thread_id]', () => {
    beforeEach(async () => {
      await prisma.thread.create({
        data: {
          id: testThreadId,
          userId: testUserId,
          title: 'Test Thread',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });
    });

    it('should delete thread', async () => {
      const { validateAuth } = await import('@/lib/middleware/auth');

      vi.mocked(validateAuth).mockResolvedValue({
        sub: testUserId,
        groups: [],
      });

      const request = new NextRequest(`http://localhost/api/threads/${testThreadId}`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer test-token',
        },
      });

      const response = await deleteThread(request, { params: { thread_id: testThreadId } });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.Acknowledged).toBe('true');

      // Verify deletion
      const thread = await prisma.thread.findUnique({ where: { id: testThreadId } });
      expect(thread).toBeNull();
    });

    it('should return 403 for thread owned by different user', async () => {
      const { validateAuth } = await import('@/lib/middleware/auth');

      vi.mocked(validateAuth).mockResolvedValue({
        sub: otherUserId,
        groups: [],
      });

      const request = new NextRequest(`http://localhost/api/threads/${testThreadId}`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer test-token',
        },
      });

      const response = await deleteThread(request, { params: { thread_id: testThreadId } });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/threads/search', () => {
    beforeEach(async () => {
      // Create thread with messages for search testing
      await prisma.thread.create({
        data: {
          id: testThreadId,
          userId: testUserId,
          title: 'Neuroscience Discussion',
          creationDate: new Date(),
          updateDate: new Date(),
        },
      });

      // Note: Full-text search requires the search_vector to be populated
      // In production, this is done via database triggers
      // For testing, we'll just verify the endpoint works
      await prisma.message.create({
        data: {
          id: crypto.randomUUID(),
          threadId: testThreadId,
          entity: 'USER',
          content: JSON.stringify({ content: 'Tell me about neurons' }),
          isComplete: true,
          creationDate: new Date(),
        },
      });
    });

    it('should return 400 without query parameter', async () => {
      const { validateAuth, validateProject } = await import('@/lib/middleware/auth');

      vi.mocked(validateAuth).mockResolvedValue({
        sub: testUserId,
        groups: [],
      });

      vi.mocked(validateProject).mockReturnValue(undefined);

      const request = new NextRequest('http://localhost/api/threads/search', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
        },
      });

      const response = await searchThreads(request);

      expect(response.status).toBe(400);
    });

    it('should accept search query', async () => {
      const { validateAuth, validateProject } = await import('@/lib/middleware/auth');

      vi.mocked(validateAuth).mockResolvedValue({
        sub: testUserId,
        groups: [],
      });

      vi.mocked(validateProject).mockReturnValue(undefined);

      const request = new NextRequest('http://localhost/api/threads/search?query=neurons', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
        },
      });

      const response = await searchThreads(request);

      // Should return 200 even if no results (search_vector not populated in test)
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.result_list).toBeDefined();
      expect(Array.isArray(body.result_list)).toBe(true);
    });
  });
});
