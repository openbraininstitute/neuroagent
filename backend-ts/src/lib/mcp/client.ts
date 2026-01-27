/**
 * MCP (Model Context Protocol) Client Implementation
 *
 * This module provides functionality to:
 * - Parse mcp.json configuration
 * - Spawn and manage MCP server processes
 * - Communicate via stdio protocol
 * - Dynamically generate tool definitions from MCP capabilities
 *
 * Based on @modelcontextprotocol/sdk
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { BaseTool, ToolMetadata } from '../tools/base-tool';
import { MCPServerConfig, SettingsMCP } from '../config/settings';

const SERVER_TOOL_SEPARATOR = '|||';

/**
 * MCP Client for managing connections to MCP servers
 */
export class MCPClient {
  private config: SettingsMCP;
  private clients: Map<string, Client> = new Map();
  private tools: Map<string, Tool[]> = new Map();
  private toolNameMapping: Map<string, string> = new Map();

  constructor(config: SettingsMCP) {
    this.config = config;
  }

  /**
   * Initialize and connect to all configured MCP servers
   */
  async connect(): Promise<void> {
    if (!this.config.servers || Object.keys(this.config.servers).length === 0) {
      console.log('No MCP servers configured');
      return;
    }

    const connectionPromises = Object.entries(this.config.servers).map(
      async ([serverName, serverConfig]) => {
        try {
          await this.connectToServer(serverName, serverConfig);
        } catch (error) {
          console.error(`Failed to connect to MCP server ${serverName}:`, error);
        }
      }
    );

    await Promise.all(connectionPromises);
  }

  /**
   * Connect to a single MCP server
   */
  private async connectToServer(
    serverName: string,
    serverConfig: MCPServerConfig
  ): Promise<void> {
    console.log(`Connecting to MCP server: ${serverName}`);

    // Create client
    const client = new Client({
      name: `neuroagent-${serverName}`,
      version: '1.0.0',
    });

    // Create stdio transport
    const transport = new StdioClientTransport({
      command: serverConfig.command,
      args: serverConfig.args || [],
      env: serverConfig.env
        ? Object.fromEntries(
            Object.entries({
              ...process.env,
              ...serverConfig.env,
            }).filter(([_, v]) => v !== undefined) as [string, string][]
          )
        : undefined,
    });

    // Connect to server
    await client.connect(transport);

    // Store client
    this.clients.set(serverName, client);

    // List and store tools
    const toolsList = await client.listTools();
    this.tools.set(serverName, toolsList.tools);

    // Apply tool metadata overrides if configured
    if (serverConfig.toolMetadata) {
      this.applyToolMetadataOverrides(serverName, serverConfig.toolMetadata);
    }

    console.log(
      `Connected to ${serverName}, discovered ${toolsList.tools.length} tools:`,
      toolsList.tools.map((t) => t.name).join(', ')
    );
  }

  /**
   * Apply tool metadata overrides from configuration
   */
  private applyToolMetadataOverrides(
    serverName: string,
    toolMetadata: Record<string, any>
  ): void {
    const serverTools = this.tools.get(serverName);
    if (!serverTools) return;

    for (const [originalToolName, metadata] of Object.entries(toolMetadata)) {
      const tool = serverTools.find((t) => t.name === originalToolName);

      if (!tool) {
        console.warn(
          `Tool ${originalToolName} not found in server ${serverName}. ` +
            `Available tools: ${serverTools.map((t) => t.name).join(', ')}`
        );
        continue;
      }

      // Store mapping from new name to original name
      const newName = metadata.name || tool.name;
      if (newName !== tool.name) {
        this.toolNameMapping.set(
          `${serverName}${SERVER_TOOL_SEPARATOR}${newName}`,
          tool.name
        );
      }

      // Override tool properties
      if (metadata.name) tool.name = metadata.name;
      if (metadata.description) tool.description = metadata.description;
    }
  }

  /**
   * Get all tools from all connected servers
   */
  getAllTools(): Array<{ serverName: string; tool: Tool }> {
    const allTools: Array<{ serverName: string; tool: Tool }> = [];

    for (const [serverName, tools] of this.tools.entries()) {
      for (const tool of tools) {
        allTools.push({ serverName, tool });
      }
    }

    return allTools;
  }

  /**
   * Call a tool on a specific server
   */
  async callTool(
    serverName: string,
    toolName: string,
    arguments_: Record<string, any>
  ): Promise<any> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP server ${serverName} not connected`);
    }

    // Get original tool name if it was overridden
    const originalToolName =
      this.toolNameMapping.get(`${serverName}${SERVER_TOOL_SEPARATOR}${toolName}`) || toolName;

    const result = await client.callTool({
      name: originalToolName,
      arguments: arguments_,
    });

    return result;
  }

  /**
   * Check if a server is online
   */
  async isServerOnline(serverName: string): Promise<boolean> {
    const client = this.clients.get(serverName);
    if (!client) return false;

    try {
      await client.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Disconnect from all servers
   */
  async disconnect(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.entries()).map(
      async ([serverName, client]) => {
        try {
          await client.close();
          console.log(`Disconnected from MCP server: ${serverName}`);
        } catch (error) {
          console.error(`Error disconnecting from ${serverName}:`, error);
        }
      }
    );

    await Promise.all(disconnectPromises);

    this.clients.clear();
    this.tools.clear();
    this.toolNameMapping.clear();
  }
}

/**
 * Create a dynamic BaseTool subclass for an MCP tool
 */
export function createDynamicMCPTool(
  serverName: string,
  tool: Tool,
  mcpClient: MCPClient,
  toolMetadata?: {
    nameFrontend?: string;
    descriptionFrontend?: string;
    utterances?: string[];
  }
): BaseTool<any> {
  // Create a Zod schema that accepts any object (we'll rely on MCP server validation)
  const inputSchema = z.object({}).passthrough();

  // Create an instance of a dynamic tool class
  class MCPDynamicTool extends BaseTool<typeof inputSchema> {
    metadata: ToolMetadata = {
      name: tool.name,
      nameFrontend:
        toolMetadata?.nameFrontend ||
        tool.name
          .split(/[-/_=+*]/)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
      description: tool.description || '',
      descriptionFrontend: toolMetadata?.descriptionFrontend || tool.description || '',
      utterances: toolMetadata?.utterances || [],
    };

    inputSchema = inputSchema;

    override async execute(input: any): Promise<any> {
      const result = await mcpClient.callTool(serverName, tool.name, input);

      // Return the structured content if available, otherwise the text content
      if (result.structuredContent) {
        return result.structuredContent;
      }

      // Extract text from content array
      if (result.content && Array.isArray(result.content)) {
        const textContent = result.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n');
        return textContent;
      }

      return result;
    }

    override async isOnline(): Promise<boolean> {
      return mcpClient.isServerOnline(serverName);
    }
  }

  return new MCPDynamicTool();
}

/**
 * Initialize MCP client and generate dynamic tools
 */
export async function initializeMCPTools(config: SettingsMCP): Promise<Array<BaseTool<any>>> {
  const mcpClient = new MCPClient(config);

  try {
    await mcpClient.connect();
  } catch (error) {
    console.error('Failed to initialize MCP client:', error);
    return [];
  }

  const allTools = mcpClient.getAllTools();
  const dynamicTools: Array<BaseTool<any>> = [];

  for (const { serverName, tool } of allTools) {
    // Get tool metadata overrides if configured
    const serverConfig = config.servers?.[serverName];
    const toolMetadata = serverConfig?.toolMetadata?.[tool.name];

    const dynamicTool = createDynamicMCPTool(serverName, tool, mcpClient, toolMetadata);
    dynamicTools.push(dynamicTool);
  }

  console.log(`Initialized ${dynamicTools.length} MCP tools`);

  return dynamicTools;
}
