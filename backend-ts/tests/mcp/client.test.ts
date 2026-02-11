/**
 * Tests for MCP Client
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPClient, createDynamicMCPToolClass as createDynamicMCPTool, initializeMCPTools } from '@/lib/mcp/client';
import { SettingsMCP } from '@/lib/config/settings';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

describe('MCPClient', () => {
  describe('constructor', () => {
    it('should create an MCPClient instance', () => {
      const config: SettingsMCP = {
        servers: {},
      };

      const client = new MCPClient(config);
      expect(client).toBeInstanceOf(MCPClient);
    });
  });

  describe('connect', () => {
    it('should handle empty server configuration', async () => {
      const config: SettingsMCP = {
        servers: {},
      };

      const client = new MCPClient(config);
      await expect(client.connect()).resolves.not.toThrow();
    });

    it('should handle undefined servers', async () => {
      const config: SettingsMCP = {};

      const client = new MCPClient(config);
      await expect(client.connect()).resolves.not.toThrow();
    });
  });

  describe('getAllTools', () => {
    it('should return empty array when no servers connected', () => {
      const config: SettingsMCP = {
        servers: {},
      };

      const client = new MCPClient(config);
      const tools = client.getAllTools();

      expect(tools).toEqual([]);
    });
  });

  describe('isServerOnline', () => {
    it('should return false for non-existent server', async () => {
      const config: SettingsMCP = {
        servers: {},
      };

      const client = new MCPClient(config);
      const isOnline = await client.isServerOnline('non-existent');

      expect(isOnline).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect gracefully with no servers', async () => {
      const config: SettingsMCP = {
        servers: {},
      };

      const client = new MCPClient(config);
      await expect(client.disconnect()).resolves.not.toThrow();
    });
  });
});

describe('createDynamicMCPTool', () => {
  it('should create a dynamic tool from MCP tool definition', () => {
    const mockClient = {
      callTool: vi.fn(),
      isServerOnline: vi.fn().mockResolvedValue(true),
    } as any;

    const mcpTool: Tool = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          input: { type: 'string' },
        },
      },
    };

    const DynamicToolClass = createDynamicMCPTool('test-server', mcpTool, mockClient);

    expect(DynamicToolClass).toBeDefined();
    expect(DynamicToolClass.toolName).toBe('test-tool');
    expect(DynamicToolClass.toolDescription).toBe('A test tool');
  });

  it('should apply custom metadata overrides', () => {
    const mockClient = {
      callTool: vi.fn(),
      isServerOnline: vi.fn().mockResolvedValue(true),
    } as any;

    const mcpTool: Tool = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };

    const DynamicToolClass = createDynamicMCPTool('test-server', mcpTool, mockClient, {
      nameFrontend: 'Custom Test Tool',
      descriptionFrontend: 'Custom description',
      utterances: ['test', 'sample'],
    });

    expect(DynamicToolClass.toolNameFrontend).toBe('Custom Test Tool');
    expect(DynamicToolClass.toolDescriptionFrontend).toBe('Custom description');
    expect(DynamicToolClass.toolUtterances).toEqual(['test', 'sample']);
  });

  it('should generate frontend name from tool name', () => {
    const mockClient = {
      callTool: vi.fn(),
      isServerOnline: vi.fn().mockResolvedValue(true),
    } as any;

    const mcpTool: Tool = {
      name: 'get-user-data',
      description: 'Get user data',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };

    const DynamicToolClass = createDynamicMCPTool('test-server', mcpTool, mockClient);

    expect(DynamicToolClass.toolNameFrontend).toBe('Get User Data');
  });

  it('should execute tool and return structured content', async () => {
    const mockClient = {
      callTool: vi.fn().mockResolvedValue({
        structuredContent: { result: 'success' },
      }),
      isServerOnline: vi.fn().mockResolvedValue(true),
    } as any;

    const mcpTool: Tool = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };

    const DynamicToolClass = createDynamicMCPTool('test-server', mcpTool, mockClient);
    const toolInstance = new DynamicToolClass();
    const result = await toolInstance.execute({ input: 'test' });

    expect(result).toEqual({ result: 'success' });
    expect(mockClient.callTool).toHaveBeenCalledWith('test-server', 'test-tool', {
      input: 'test',
    });
  });

  it('should extract text content when no structured content', async () => {
    const mockClient = {
      callTool: vi.fn().mockResolvedValue({
        content: [
          { type: 'text', text: 'Line 1' },
          { type: 'text', text: 'Line 2' },
        ],
      }),
      isServerOnline: vi.fn().mockResolvedValue(true),
    } as any;

    const mcpTool: Tool = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };

    const DynamicToolClass = createDynamicMCPTool('test-server', mcpTool, mockClient);
    const toolInstance = new DynamicToolClass();
    const result = await toolInstance.execute({});

    expect(result).toBe('Line 1\nLine 2');
  });

  it('should check if tool is online', async () => {
    const mockClient = {
      callTool: vi.fn(),
      isServerOnline: vi.fn().mockResolvedValue(true),
    } as any;

    const mcpTool: Tool = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };

    const DynamicToolClass = createDynamicMCPTool('test-server', mcpTool, mockClient);
    const isOnline = await DynamicToolClass.isOnline();

    expect(isOnline).toBe(true);
    expect(mockClient.isServerOnline).toHaveBeenCalledWith('test-server');
  });
});

describe('initializeMCPTools', () => {
  it('should return empty array for empty configuration', async () => {
    const config: SettingsMCP = {
      servers: {},
    };

    const tools = await initializeMCPTools(config);

    expect(tools).toEqual([]);
  });

  it('should handle initialization errors gracefully', async () => {
    const config: SettingsMCP = {
      servers: {
        'invalid-server': {
          command: 'non-existent-command',
          args: [],
        },
      },
    };

    // Should not throw, just return empty array
    const tools = await initializeMCPTools(config);

    expect(tools).toEqual([]);
  });
});
