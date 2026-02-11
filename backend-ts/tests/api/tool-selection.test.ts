/**
 * Tool Selection Tests
 *
 * Tests the tool_selection parameter in the chat_streamed endpoint.
 * Verifies that:
 * - When tool_selection is provided, only those tools are used
 * - When tool_selection is not provided, all tools are available
 * - Invalid tool names are filtered out
 * - Empty tool_selection array is handled correctly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/qa/chat_streamed/[thread_id]/route';
import { prisma } from '@/lib/db/client';
import { Entity } from '@/types';
import * as auth from '@/lib/middleware/auth';
import * as rateLimit from '@/lib/middleware/rate-limit';
import * as tools from '@/lib/tools';
import * as routine from '@/lib/agents/routine';

// Mock dependencies
vi.mock('@/lib/middleware/auth');
vi.mock('@/lib/middleware/rate-limit');
vi.mock('@/lib/tools');
vi.mock('@/lib/agents/routine');

describe('Tool Selection in Chat Streaming', () => {
  const mockThreadId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '660e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock auth
    vi.mocked(auth.validateAuth).mockResolvedValue({
      sub: mockUserId,
      groups: [],
    } as any);
    vi.mocked(auth.validateProject).mockReturnValue(undefined);

    // Mock rate limiting
    vi.mocked(rateLimit.checkRateLimit).mockResolvedValue({
      limited: false,
      headers: {},
    } as any);

    // Mock tools initialization
    vi.mocked(tools.initializeTools).mockResolvedValue([
      { toolName: 'literature_search', toolDescription: 'Search literature' },
      { toolName: 'brain_region_get_one', toolDescription: 'Get brain region' },
      { toolName: 'web_search', toolDescription: 'Search the web' },
      { toolName: 'run_python', toolDescription: 'Execute Python code' },
    ] as any);

    // Mock AgentsRoutine
    vi.mocked(routine.AgentsRoutine).mockImplementation(() => ({
      streamChat: vi.fn().mockResolvedValue(
        new Response('data: test\n\n', {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
          },
        })
      ),
    } as any));
  });

  afterEach(async () => {
    // Clean up test data from the database
    await prisma.thread.deleteMany({ where: { id: mockThreadId } });
  });

  it('should use only selected tools when tool_selection is provided', async () => {
    // Setup: Create thread in database
    await prisma.thread.create({
      data: {
        id: mockThreadId,
        userId: mockUserId,
        title: 'Test Thread',
        creationDate: new Date(),
        updateDate: new Date(),
      },
    });

    // Create request with tool_selection
    const request = new Request(`http://localhost/api/qa/chat_streamed/${mockThreadId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        content: 'Test message',
        tool_selection: ['literature_search', 'brain_region_get_one'],
      }),
    });

    const params = Promise.resolve({ thread_id: mockThreadId });

    // Execute
    const response = await POST(request as any, { params });

    // Verify
    expect(response.status).toBe(200);

    // Check that AgentsRoutine was called with filtered tools
    const mockInstance = vi.mocked(routine.AgentsRoutine).mock.results[0].value;
    const streamChatCall = mockInstance.streamChat.mock.calls[0];
    const agentConfig = streamChatCall[0];

    // Should only have 2 tools (the selected ones)
    expect(agentConfig.tools).toHaveLength(2);
    expect(agentConfig.tools.map((t: any) => t.toolName)).toEqual([
      'literature_search',
      'brain_region_get_one',
    ]);
  });

  it('should use all tools when tool_selection is not provided', async () => {
    // Setup: Create thread in database
    await prisma.thread.create({
      data: {
        id: mockThreadId,
        userId: mockUserId,
        title: 'Test Thread',
        creationDate: new Date(),
        updateDate: new Date(),
      },
    });

    // Create request without tool_selection
    const request = new Request(`http://localhost/api/qa/chat_streamed/${mockThreadId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        content: 'Test message',
      }),
    });

    const params = Promise.resolve({ thread_id: mockThreadId });

    // Execute
    const response = await POST(request as any, { params });

    // Verify
    expect(response.status).toBe(200);

    // Check that AgentsRoutine was called with all tools (or filtered by conversation)
    const mockInstance = vi.mocked(routine.AgentsRoutine).mock.results[0].value;
    const streamChatCall = mockInstance.streamChat.mock.calls[0];
    const agentConfig = streamChatCall[0];

    // Should have tools (exact count depends on filtering logic)
    expect(agentConfig.tools.length).toBeGreaterThan(0);
  });

  it('should filter out invalid tool names from tool_selection', async () => {
    // Setup: Create thread in database
    await prisma.thread.create({
      data: {
        id: mockThreadId,
        userId: mockUserId,
        title: 'Test Thread',
        creationDate: new Date(),
        updateDate: new Date(),
      },
    });

    // Create request with some invalid tool names
    const request = new Request(`http://localhost/api/qa/chat_streamed/${mockThreadId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        content: 'Test message',
        tool_selection: [
          'literature_search',
          'invalid_tool_name',
          'brain_region_get_one',
          'another_invalid_tool',
        ],
      }),
    });

    const params = Promise.resolve({ thread_id: mockThreadId });

    // Execute
    const response = await POST(request as any, { params });

    // Verify
    expect(response.status).toBe(200);

    // Check that only valid tools are included
    const mockInstance = vi.mocked(routine.AgentsRoutine).mock.results[0].value;
    const streamChatCall = mockInstance.streamChat.mock.calls[0];
    const agentConfig = streamChatCall[0];

    // Should only have 2 valid tools
    expect(agentConfig.tools).toHaveLength(2);
    expect(agentConfig.tools.map((t: any) => t.toolName)).toEqual([
      'literature_search',
      'brain_region_get_one',
    ]);
  });

  it('should handle empty tool_selection array by using automatic filtering', async () => {
    // Setup: Create thread in database
    await prisma.thread.create({
      data: {
        id: mockThreadId,
        userId: mockUserId,
        title: 'Test Thread',
        creationDate: new Date(),
        updateDate: new Date(),
      },
    });

    // Create request with empty tool_selection
    const request = new Request(`http://localhost/api/qa/chat_streamed/${mockThreadId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        content: 'Test message',
        tool_selection: [],
      }),
    });

    const params = Promise.resolve({ thread_id: mockThreadId });

    // Execute
    const response = await POST(request as any, { params });

    // Verify
    expect(response.status).toBe(200);

    // Empty array should trigger automatic filtering
    const mockInstance = vi.mocked(routine.AgentsRoutine).mock.results[0].value;
    const streamChatCall = mockInstance.streamChat.mock.calls[0];
    const agentConfig = streamChatCall[0];

    // Should have tools from automatic filtering
    expect(agentConfig.tools.length).toBeGreaterThan(0);
  });

  it('should use tool_selection as the pool for automatic filtering', async () => {
    // Setup: Create thread in database
    await prisma.thread.create({
      data: {
        id: mockThreadId,
        userId: mockUserId,
        title: 'Test Thread',
        creationDate: new Date(),
        updateDate: new Date(),
      },
    });

    // Create request with tool_selection
    const request = new Request(`http://localhost/api/qa/chat_streamed/${mockThreadId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        content: 'Test message',
        tool_selection: ['literature_search'],
      }),
    });

    const params = Promise.resolve({ thread_id: mockThreadId });

    // Execute
    await POST(request as any, { params });

    // Verify that the selected tools were used as the pool for filtering
    // The route implementation filters from the selected tools, not all tools
    const mockInstance = vi.mocked(routine.AgentsRoutine).mock.results[0].value;
    const streamChatCall = mockInstance.streamChat.mock.calls[0];
    const agentConfig = streamChatCall[0];

    // Should have tools (filtered from the selected pool)
    expect(agentConfig.tools.length).toBeGreaterThan(0);
    // All tools should be from the selected pool
    agentConfig.tools.forEach((tool: any) => {
      expect(['literature_search']).toContain(tool.toolName);
    });
  });
});
