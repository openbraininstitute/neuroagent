/**
 * Property-Based Tests for MCP Tool Discovery
 *
 * Feature: typescript-backend-migration
 * Property 24: MCP Tool Discovery
 *
 * For any configured MCP server, the backend should successfully discover
 * and register all tools provided by that server.
 *
 * Validates: Requirements 11.5
 *
 * This test verifies that:
 * 1. All tools from configured MCP servers are discovered
 * 2. Each discovered tool has valid metadata (name, description)
 * 3. Each discovered tool can be converted to a BaseTool instance
 * 4. Tool metadata overrides are correctly applied
 * 5. Tools are properly registered and accessible
 * 6. Multiple servers can be discovered simultaneously
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import { MCPClient, createDynamicMCPTool, initializeMCPTools } from '@/lib/mcp/client';
import { SettingsMCP, MCPServerConfig } from '@/lib/config/settings';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn(),
}));

describe('MCP Tool Discovery Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Property 24: MCP Tool Discovery', () => {
    /**
     * **Validates: Requirements 11.5**
     *
     * Test that all tools from a configured MCP server are discovered
     */
    it('should discover all tools from a single MCP server', async () => {
      // Create mock tools
      const mockTools: Tool[] = [
        {
          name: 'tool1',
          description: 'First test tool',
          inputSchema: {
            type: 'object',
            properties: {
              input: { type: 'string' },
            },
          },
        },
        {
          name: 'tool2',
          description: 'Second test tool',
          inputSchema: {
            type: 'object',
            properties: {
              value: { type: 'number' },
            },
          },
        },
        {
          name: 'tool3',
          description: 'Third test tool',
          inputSchema: {
            type: 'object',
            properties: {
              flag: { type: 'boolean' },
            },
          },
        },
      ];

      // Mock the Client
      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue({ tools: mockTools }),
        ping: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        callTool: vi.fn(),
      };

      (Client as any).mockImplementation(() => mockClient);

      const config: SettingsMCP = {
        servers: {
          'test-server': {
            command: 'test-command',
            args: ['--test'],
          },
        },
      };

      const mcpClient = new MCPClient(config);
      await mcpClient.connect();

      const discoveredTools = mcpClient.getAllTools();

      // Property: All tools should be discovered
      expect(discoveredTools).toHaveLength(mockTools.length);

      // Property: Each discovered tool should match the original
      for (let i = 0; i < mockTools.length; i++) {
        expect(discoveredTools[i].serverName).toBe('test-server');
        expect(discoveredTools[i].tool.name).toBe(mockTools[i].name);
        expect(discoveredTools[i].tool.description).toBe(mockTools[i].description);
      }

      await mcpClient.disconnect();
    });

    /**
     * Property test: Any number of tools should be discoverable
     */
    test.prop([fc.integer({ min: 0, max: 20 })])(
      'should discover any number of tools from a server',
      async (toolCount) => {
        // Generate mock tools
        const mockTools: Tool[] = Array.from({ length: toolCount }, (_, i) => ({
          name: `tool_${i}`,
          description: `Tool number ${i}`,
          inputSchema: {
            type: 'object',
            properties: {
              input: { type: 'string' },
            },
          },
        }));

        const mockClient = {
          connect: vi.fn().mockResolvedValue(undefined),
          listTools: vi.fn().mockResolvedValue({ tools: mockTools }),
          ping: vi.fn().mockResolvedValue(undefined),
          close: vi.fn().mockResolvedValue(undefined),
          callTool: vi.fn(),
        };

        (Client as any).mockImplementation(() => mockClient);

        const config: SettingsMCP = {
          servers: {
            'test-server': {
              command: 'test-command',
              args: [],
            },
          },
        };

        const mcpClient = new MCPClient(config);
        await mcpClient.connect();

        const discoveredTools = mcpClient.getAllTools();

        // Property: Number of discovered tools equals number of provided tools
        expect(discoveredTools).toHaveLength(toolCount);

        // Property: All tool names are unique and match
        const discoveredNames = discoveredTools.map((t) => t.tool.name);
        const expectedNames = mockTools.map((t) => t.name);
        expect(discoveredNames).toEqual(expectedNames);

        await mcpClient.disconnect();
      }
    );

    /**
     * Property test: Tools with various names should be discovered correctly
     */
    test.prop([
      fc.array(
        fc.record({
          name: fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          description: fc.string({ minLength: 1, maxLength: 200 }),
        }),
        { minLength: 1, maxLength: 10 }
      ),
    ])('should discover tools with various names and descriptions', async (toolSpecs) => {
      const mockTools: Tool[] = toolSpecs.map((spec) => ({
        name: spec.name,
        description: spec.description,
        inputSchema: {
          type: 'object',
          properties: {},
        },
      }));

      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue({ tools: mockTools }),
        ping: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        callTool: vi.fn(),
      };

      (Client as any).mockImplementation(() => mockClient);

      const config: SettingsMCP = {
        servers: {
          'test-server': {
            command: 'test-command',
            args: [],
          },
        },
      };

      const mcpClient = new MCPClient(config);
      await mcpClient.connect();

      const discoveredTools = mcpClient.getAllTools();

      // Property: All tools are discovered with correct metadata
      expect(discoveredTools).toHaveLength(mockTools.length);

      for (let i = 0; i < mockTools.length; i++) {
        expect(discoveredTools[i].tool.name).toBe(mockTools[i].name);
        expect(discoveredTools[i].tool.description).toBe(mockTools[i].description);
      }

      await mcpClient.disconnect();
    });

    /**
     * Property test: Multiple servers should all have their tools discovered
     */
    test.prop([fc.integer({ min: 1, max: 5 }), fc.integer({ min: 1, max: 5 })])(
      'should discover tools from multiple servers',
      async (serverCount, toolsPerServer) => {
        const mockClients: any[] = [];

        // Create mock clients for each server
        for (let i = 0; i < serverCount; i++) {
          const mockTools: Tool[] = Array.from({ length: toolsPerServer }, (_, j) => ({
            name: `server${i}_tool${j}`,
            description: `Tool ${j} from server ${i}`,
            inputSchema: {
              type: 'object',
              properties: {},
            },
          }));

          const mockClient = {
            connect: vi.fn().mockResolvedValue(undefined),
            listTools: vi.fn().mockResolvedValue({ tools: mockTools }),
            ping: vi.fn().mockResolvedValue(undefined),
            close: vi.fn().mockResolvedValue(undefined),
            callTool: vi.fn(),
          };

          mockClients.push(mockClient);
        }

        let clientIndex = 0;
        (Client as any).mockImplementation(() => mockClients[clientIndex++]);

        // Create config with multiple servers
        const servers: Record<string, MCPServerConfig> = {};
        for (let i = 0; i < serverCount; i++) {
          servers[`server${i}`] = {
            command: `command${i}`,
            args: [],
          };
        }

        const config: SettingsMCP = { servers };

        const mcpClient = new MCPClient(config);
        await mcpClient.connect();

        const discoveredTools = mcpClient.getAllTools();

        // Property: Total tools equals servers * tools per server
        expect(discoveredTools).toHaveLength(serverCount * toolsPerServer);

        // Property: Each server's tools are present
        for (let i = 0; i < serverCount; i++) {
          const serverTools = discoveredTools.filter((t) => t.serverName === `server${i}`);
          expect(serverTools).toHaveLength(toolsPerServer);

          // Verify tool names
          for (let j = 0; j < toolsPerServer; j++) {
            const expectedName = `server${i}_tool${j}`;
            expect(serverTools.some((t) => t.tool.name === expectedName)).toBe(true);
          }
        }

        await mcpClient.disconnect();
      }
    );

    /**
     * Test that tool metadata overrides are correctly applied
     */
    it('should apply tool metadata overrides from configuration', async () => {
      const mockTools: Tool[] = [
        {
          name: 'original-tool-name',
          description: 'Original description',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ];

      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue({ tools: mockTools }),
        ping: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        callTool: vi.fn(),
      };

      (Client as any).mockImplementation(() => mockClient);

      const config: SettingsMCP = {
        servers: {
          'test-server': {
            command: 'test-command',
            args: [],
            toolMetadata: {
              'original-tool-name': {
                name: 'overridden-tool-name',
                description: 'Overridden description',
              },
            },
          },
        },
      };

      const mcpClient = new MCPClient(config);
      await mcpClient.connect();

      const discoveredTools = mcpClient.getAllTools();

      // Property: Tool metadata should be overridden
      expect(discoveredTools).toHaveLength(1);
      expect(discoveredTools[0].tool.name).toBe('overridden-tool-name');
      expect(discoveredTools[0].tool.description).toBe('Overridden description');

      await mcpClient.disconnect();
    });

    /**
     * Test that discovered tools can be converted to BaseTool instances
     */
    it('should convert discovered tools to BaseTool instances', async () => {
      const mockTools: Tool[] = [
        {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
            },
          },
        },
      ];

      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue({ tools: mockTools }),
        ping: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        callTool: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Tool result' }],
        }),
      };

      (Client as any).mockImplementation(() => mockClient);

      const config: SettingsMCP = {
        servers: {
          'test-server': {
            command: 'test-command',
            args: [],
          },
        },
      };

      const mcpClient = new MCPClient(config);
      await mcpClient.connect();

      const discoveredTools = mcpClient.getAllTools();

      // Property: Each discovered tool can be converted to BaseTool
      for (const { serverName, tool } of discoveredTools) {
        const baseTool = createDynamicMCPTool(serverName, tool, mcpClient);

        expect(baseTool).toBeDefined();
        expect(baseTool.metadata).toBeDefined();
        expect(baseTool.metadata.name).toBe(tool.name);
        expect(baseTool.metadata.description).toBe(tool.description);
        expect(baseTool.inputSchema).toBeDefined();
        expect(typeof baseTool.execute).toBe('function');
        expect(typeof baseTool.isOnline).toBe('function');
      }

      await mcpClient.disconnect();
    });

    /**
     * Property test: Discovered tools should be executable
     */
    test.prop([
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        description: fc.string({ minLength: 1, maxLength: 100 }),
        result: fc.string(),
      }),
    ])('should create executable tools from discovered tools', async (toolSpec) => {
      const mockTool: Tool = {
        name: toolSpec.name,
        description: toolSpec.description,
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
        },
      };

      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue({ tools: [mockTool] }),
        ping: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        callTool: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: toolSpec.result }],
        }),
        isServerOnline: vi.fn().mockResolvedValue(true),
      };

      (Client as any).mockImplementation(() => mockClient);

      const config: SettingsMCP = {
        servers: {
          'test-server': {
            command: 'test-command',
            args: [],
          },
        },
      };

      const mcpClient = new MCPClient(config);
      await mcpClient.connect();

      const discoveredTools = mcpClient.getAllTools();
      expect(discoveredTools).toHaveLength(1);

      const baseTool = createDynamicMCPTool(
        discoveredTools[0].serverName,
        discoveredTools[0].tool,
        mcpClient
      );

      // Property: Tool should be executable and return expected result
      const result = await baseTool.execute({ input: 'test' });
      expect(result).toBe(toolSpec.result);

      // Property: Tool should report online status
      const isOnline = await baseTool.isOnline();
      expect(isOnline).toBe(true);

      await mcpClient.disconnect();
    });

    /**
     * Test that initializeMCPTools discovers and creates all tools
     */
    it('should initialize all tools from all configured servers', async () => {
      const mockTools1: Tool[] = [
        {
          name: 'server1-tool1',
          description: 'Tool 1 from server 1',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'server1-tool2',
          description: 'Tool 2 from server 1',
          inputSchema: { type: 'object', properties: {} },
        },
      ];

      const mockTools2: Tool[] = [
        {
          name: 'server2-tool1',
          description: 'Tool 1 from server 2',
          inputSchema: { type: 'object', properties: {} },
        },
      ];

      const mockClient1 = {
        connect: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue({ tools: mockTools1 }),
        ping: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        callTool: vi.fn(),
        isServerOnline: vi.fn().mockResolvedValue(true),
      };

      const mockClient2 = {
        connect: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue({ tools: mockTools2 }),
        ping: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        callTool: vi.fn(),
        isServerOnline: vi.fn().mockResolvedValue(true),
      };

      let clientIndex = 0;
      (Client as any).mockImplementation(() => [mockClient1, mockClient2][clientIndex++]);

      const config: SettingsMCP = {
        servers: {
          server1: {
            command: 'command1',
            args: [],
          },
          server2: {
            command: 'command2',
            args: [],
          },
        },
      };

      const tools = await initializeMCPTools(config);

      // Property: All tools from all servers should be initialized
      expect(tools).toHaveLength(3);

      // Property: Each tool should be a valid BaseTool instance
      for (const tool of tools) {
        expect(tool).toBeDefined();
        expect(tool.metadata).toBeDefined();
        expect(tool.metadata.name).toBeDefined();
        expect(tool.metadata.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.execute).toBe('function');
        expect(typeof tool.isOnline).toBe('function');
      }

      // Property: Tool names should match discovered tools
      const toolNames = tools.map((t) => t.metadata.name);
      expect(toolNames).toContain('server1-tool1');
      expect(toolNames).toContain('server1-tool2');
      expect(toolNames).toContain('server2-tool1');
    });

    /**
     * Test that tool discovery handles empty servers gracefully
     */
    it('should handle servers with no tools', async () => {
      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue({ tools: [] }),
        ping: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        callTool: vi.fn(),
      };

      (Client as any).mockImplementation(() => mockClient);

      const config: SettingsMCP = {
        servers: {
          'empty-server': {
            command: 'test-command',
            args: [],
          },
        },
      };

      const mcpClient = new MCPClient(config);
      await mcpClient.connect();

      const discoveredTools = mcpClient.getAllTools();

      // Property: Empty server should result in no tools
      expect(discoveredTools).toHaveLength(0);

      await mcpClient.disconnect();
    });

    /**
     * Test that tool discovery handles connection failures gracefully
     */
    it('should handle server connection failures gracefully', async () => {
      const mockClient = {
        connect: vi.fn().mockRejectedValue(new Error('Connection failed')),
        listTools: vi.fn(),
        ping: vi.fn(),
        close: vi.fn(),
        callTool: vi.fn(),
      };

      (Client as any).mockImplementation(() => mockClient);

      const config: SettingsMCP = {
        servers: {
          'failing-server': {
            command: 'invalid-command',
            args: [],
          },
        },
      };

      const mcpClient = new MCPClient(config);

      // Property: Connection failures should not throw
      await expect(mcpClient.connect()).resolves.not.toThrow();

      const discoveredTools = mcpClient.getAllTools();

      // Property: Failed connections should result in no tools
      expect(discoveredTools).toHaveLength(0);
    });

    /**
     * Property test: Tool discovery should preserve tool input schemas
     */
    test.prop([
      fc.array(
        fc.record({
          name: fc
            .string({ minLength: 1, maxLength: 30 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          properties: fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }),
            fc.constantFrom(
              { type: 'string' },
              { type: 'number' },
              { type: 'boolean' },
              { type: 'array', items: { type: 'string' } }
            )
          ),
        }),
        { minLength: 1, maxLength: 5 }
      ),
    ])('should preserve tool input schemas during discovery', async (toolSpecs) => {
      const mockTools: Tool[] = toolSpecs.map((spec) => ({
        name: spec.name,
        description: `Tool ${spec.name}`,
        inputSchema: {
          type: 'object',
          properties: spec.properties,
        },
      }));

      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue({ tools: mockTools }),
        ping: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        callTool: vi.fn(),
        isServerOnline: vi.fn().mockResolvedValue(true),
      };

      (Client as any).mockImplementation(() => mockClient);

      const config: SettingsMCP = {
        servers: {
          'test-server': {
            command: 'test-command',
            args: [],
          },
        },
      };

      const mcpClient = new MCPClient(config);
      await mcpClient.connect();

      const discoveredTools = mcpClient.getAllTools();

      // Property: Input schemas should be preserved
      expect(discoveredTools).toHaveLength(mockTools.length);

      for (let i = 0; i < mockTools.length; i++) {
        expect(discoveredTools[i].tool.inputSchema).toEqual(mockTools[i].inputSchema);
      }

      await mcpClient.disconnect();
    });

    /**
     * Test that tool name mapping works correctly with overrides
     */
    it('should maintain tool name mapping for overridden names', async () => {
      const mockTools: Tool[] = [
        {
          name: 'original_name',
          description: 'Test tool',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ];

      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue({ tools: mockTools }),
        ping: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        callTool: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'result' }],
        }),
        isServerOnline: vi.fn().mockResolvedValue(true),
      };

      (Client as any).mockImplementation(() => mockClient);

      const config: SettingsMCP = {
        servers: {
          'test-server': {
            command: 'test-command',
            args: [],
            toolMetadata: {
              original_name: {
                name: 'new_name',
                description: 'New description',
              },
            },
          },
        },
      };

      const mcpClient = new MCPClient(config);
      await mcpClient.connect();

      // Property: Tool should be callable with new name
      const result = await mcpClient.callTool('test-server', 'new_name', {});

      // Property: Call should succeed and use original name internally
      expect(mockClient.callTool).toHaveBeenCalledWith({
        name: 'original_name',
        arguments: {},
      });

      await mcpClient.disconnect();
    });
  });
});
