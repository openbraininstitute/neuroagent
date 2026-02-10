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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/qa/chat_streamed/[thread_id]/route';
import { prisma } from '@/lib/db/client';
import { Entity } from '@/types';

// Mock dependencies
vi.mock('@/lib/config/settings');
vi.mock('@/lib/middleware/auth');
vi.mock('@/lib/middleware/rate-limit');
vi.mock('@/lib/tools');
vi.mock('@/lib/agents/routine');

describe('Tool Selection in Chat Streaming', () => {
  const mockThreadId = 'test-thread-123';
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock settings
    const { getSettings } = require('@/lib/config/settings');
    getSettings.mockReturnValue({
      rateLimiter: {
        limitChat: 10,
        expiryChat: 60,
      },
      misc: {
        queryMaxSize: 10000,
      },
      tools: {
        exaApiKey: 'test-key',
        entitycore: { url: 'http://entitycore' },
        frontendBaseUrl: 'http://frontend',
        obiOne: { url: 'http://obione' },
        minToolSelection: 3,
      },
      llm: {
        openaiToken: 'test-openai-token',
        openaiBaseUrl: 'https://api.openai.com/v1',
        openRouterToken: 'test-openrouter-token',
        temperature: 0.7,
        maxTokens: 4096,
        defaultChatModel: 'gpt-4',
        defaultChatReasoning: 'medium',
      },
      agent: {
        maxTurns: 10,
        maxParallelToolCalls: 5,
      },
      mcp: {},
    });

    // Mock auth
    const { validateAuth, validateProject } = require('@/lib/middleware/auth');
    validateAuth.mockResolvedValue({
      sub: mockUserId,
      groups: [],
    });
    validateProject.mockReturnValue(undefined);

    // Mock rate limiting
    const { checkRateLimit } = require('@/lib/middleware/rate-limit');
    checkRateLimit.mockResolvedValue({
      limited: false,
      headers: {},
    });

    // Mock tools initialization
    const { initializeTools } = require('@/lib/tools');
    initializeTools.mockResolvedValue([
      { toolName: 'literature_search', toolDescription: 'Search literature' },
      { toolName: 'brain_region_get_one', toolDescription: 'Get brain region' },
      { toolName: 'web_search', toolDescription: 'Search the web' },
      { toolName: 'run_python', toolDescription: 'Execute Python code' },
    ]);

    // Mock AgentsRoutine
    const { AgentsRoutine } = require('@/lib/agents/routine');
    AgentsRoutine.mockImplementation(() => ({
      streamChat: vi.fn().mockResolvedValue(
        new Response('data: test\n\n', {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
          },
        })
      ),
    }));
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
    const { AgentsRoutine } = require('@/lib/agents/routine');
    const mockInstance = AgentsRoutine.mock.results[0].value;
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
    const { AgentsRoutine } = require('@/lib/agents/routine');
    const mockInstance = AgentsRoutine.mock.results[0].value;
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
    const { AgentsRoutine } = require('@/lib/agents/routine');
    const mockInstance = AgentsRoutine.mock.results[0].value;
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
    const { AgentsRoutine } = require('@/lib/agents/routine');
    const mockInstance = AgentsRoutine.mock.results[0].value;
    const streamChatCall = mockInstance.streamChat.mock.calls[0];
    const agentConfig = streamChatCall[0];

    // Should have tools from automatic filtering
    expect(agentConfig.tools.length).toBeGreaterThan(0);
  });

  it('should skip automatic filtering when tool_selection is provided', async () => {
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

    // Mock the filtering function to track if it's called
    const mockFilterFunction = vi.fn().mockResolvedValue({
      filteredTools: [],
      model: 'gpt-4',
      reasoning: 'medium',
    });

    vi.doMock('@/lib/utils/tool-filtering', () => ({
      filterToolsAndModelByConversation: mockFilterFunction,
    }));

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

    // Verify that automatic filtering was NOT called
    expect(mockFilterFunction).not.toHaveBeenCalled();
  });
});
