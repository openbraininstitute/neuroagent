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
import { type Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { type MCPServerConfig, type SettingsMCP } from '../config/settings';
import { BaseTool, type ToolMetadata } from '../tools/base-tool';

const SERVER_TOOL_SEPARATOR = '|||';

/**
 * MCP Client for managing connections to MCP servers
 */
export class MCPClient {
  private config: SettingsMCP;
  private clients: Map<string, Client> = new Map();
  private tools: Map<string, Tool[]> = new Map();
  private toolNameMapping: Map<string, string> = new Map();
  private originalToolNames: Map<string, string> = new Map(); // Maps new name -> original name

  constructor(config: SettingsMCP) {
    this.config = config;
  }

  /**
   * Initialize and connect to all configured MCP servers
   */
  async connect(): Promise<void> {
    if (!this.config.servers || Object.keys(this.config.servers).length === 0) {
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
  private async connectToServer(serverName: string, serverConfig: MCPServerConfig): Promise<void> {
    // Log connection (matches Python backend logger.info)
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

    // Log successful connection (matches Python backend logger.info)
    console.log(
      `Connected to ${serverName}, discovered ${toolsList.tools.length} tools:`,
      toolsList.tools.map((t) => t.name).join(', ')
    );
  }

  /**
   * Apply tool metadata overrides from configuration
   */
  private applyToolMetadataOverrides(serverName: string, toolMetadata: Record<string, any>): void {
    const serverTools = this.tools.get(serverName);
    if (!serverTools) {
      return;
    }

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
        this.toolNameMapping.set(`${serverName}${SERVER_TOOL_SEPARATOR}${newName}`, tool.name);
        // Also store reverse mapping for metadata lookup
        this.originalToolNames.set(newName, originalToolName);
      }

      // Override tool properties
      if (metadata.name) {
        tool.name = metadata.name;
      }
      if (metadata.description) {
        tool.description = metadata.description;
      }
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
    if (!client) {
      return false;
    }

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
 * Convert MCP tool's JSON Schema to Zod schema
 *
 * MCP tools provide their input schema as JSON Schema.
 * We need to convert it to Zod so the Vercel AI SDK can validate inputs.
 */
function convertJSONSchemaToZod(jsonSchema: any): z.ZodType {
  // If no schema provided, accept any object
  if (!jsonSchema || !jsonSchema.properties) {
    return z.object({}).passthrough();
  }

  const shape: Record<string, z.ZodType> = {};

  for (const [key, propSchema] of Object.entries(jsonSchema.properties as Record<string, any>)) {
    let zodType: z.ZodType;

    // Convert based on JSON Schema type
    switch (propSchema.type) {
      case 'string':
        zodType = z.string();
        if (propSchema.description) {
          zodType = zodType.describe(propSchema.description);
        }
        break;
      case 'number':
      case 'integer':
        zodType = z.number();
        if (propSchema.description) {
          zodType = zodType.describe(propSchema.description);
        }
        break;
      case 'boolean':
        zodType = z.boolean();
        if (propSchema.description) {
          zodType = zodType.describe(propSchema.description);
        }
        break;
      case 'array':
        zodType = z.array(z.any());
        if (propSchema.description) {
          zodType = zodType.describe(propSchema.description);
        }
        break;
      case 'object':
        zodType = z.object({}).passthrough();
        if (propSchema.description) {
          zodType = zodType.describe(propSchema.description);
        }
        break;
      default:
        zodType = z.any();
        if (propSchema.description) {
          zodType = zodType.describe(propSchema.description);
        }
    }

    // Check if field is required
    const required = jsonSchema.required?.includes(key) ?? false;
    if (!required) {
      zodType = zodType.optional();
    }

    shape[key] = zodType;
  }

  return z.object(shape);
}

/**
 * Create a dynamic BaseTool class for an MCP tool
 *
 * Returns a CLASS (not an instance) that can be registered in the tool registry
 * just like regular tools. This allows MCP tools to be treated identically to
 * regular tools throughout the system.
 */
export function createDynamicMCPToolClass(
  serverName: string,
  tool: Tool,
  mcpClient: MCPClient,
  toolMetadata?: {
    name?: string;
    nameFrontend?: string;
    description?: string;
    descriptionFrontend?: string;
    utterances?: string[];
  }
): any {
  // Convert MCP tool's JSON Schema to Zod schema
  const inputSchema = convertJSONSchemaToZod(tool.inputSchema);

  // Create a dynamic tool class with static properties (like regular tools)
  class MCPDynamicTool extends BaseTool<typeof inputSchema> {
    // Static properties (ClassVar equivalent) - accessed without instantiation
    static readonly toolName = tool.name; // Already renamed by applyToolMetadataOverrides
    static readonly toolNameFrontend =
      toolMetadata?.nameFrontend ||
      tool.name
        .split(/[-/_=+*]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    static readonly toolDescription = toolMetadata?.description || tool.description || '';
    static readonly toolDescriptionFrontend =
      toolMetadata?.descriptionFrontend || tool.description || '';
    static readonly toolUtterances = toolMetadata?.utterances || [];

    // Static method for health check
    static async isOnline(): Promise<boolean> {
      return mcpClient.isServerOnline(serverName);
    }

    // Instance properties
    inputSchema = inputSchema;
    contextVariables = {}; // MCP tools don't need context variables

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

  // Return the CLASS itself, not an instance
  return MCPDynamicTool;
}

/**
 * Global MCP tools cache
 *
 * In Next.js, we need to use globalThis to persist the cache across
 * hot module reloads in development mode.
 */
interface MCPToolsCache {
  classes: Array<any> | null;
  configKey: string | null;
}

const CACHE_KEY = '__neuroagent_mcp_tools_cache__';

function getMCPCache(): MCPToolsCache {
  if (!(globalThis as any)[CACHE_KEY]) {
    (globalThis as any)[CACHE_KEY] = {
      classes: null,
      configKey: null,
    };
  }
  return (globalThis as any)[CACHE_KEY];
}

/**
 * Initialize MCP client and generate dynamic tool classes
 *
 * Returns an array of tool CLASSES (not instances), just like regular tools.
 * This allows MCP tools to be registered and used identically to regular tools.
 *
 * Results are cached globally to avoid reconnecting to MCP servers on every request.
 */
export async function initializeMCPTools(config: SettingsMCP): Promise<Array<any>> {
  const cache = getMCPCache();

  // Create a cache key from the config
  const configKey = JSON.stringify(config);

  // Return cached tools if config hasn't changed
  if (cache.classes && cache.configKey === configKey) {
    console.log(`[MCP] Using cached ${cache.classes.length} tool classes`);
    return cache.classes;
  }

  console.log('[MCP] Initializing MCP tools...');
  const mcpClient = new MCPClient(config);

  try {
    await mcpClient.connect();
  } catch (error) {
    console.error('[MCP] Failed to initialize MCP client:', error);
    return [];
  }

  const allTools = mcpClient.getAllTools();
  const dynamicToolClasses: Array<any> = [];

  for (const { serverName, tool } of allTools) {
    // Get tool metadata overrides if configured
    // Note: tool.name may have been changed by applyToolMetadataOverrides
    // We need to look up metadata using the original tool name
    const serverConfig = config.servers?.[serverName];

    // Try to find metadata using the current tool name first (in case it wasn't renamed)
    let toolMetadata = serverConfig?.toolMetadata?.[tool.name];

    // If not found, check if this tool was renamed and look up by original name
    if (!toolMetadata && serverConfig?.toolMetadata) {
      // Find the original tool name by checking all metadata entries
      for (const [originalName, metadata] of Object.entries(serverConfig.toolMetadata)) {
        if (metadata.name === tool.name) {
          toolMetadata = metadata;
          break;
        }
      }
    }

    const ToolClass = createDynamicMCPToolClass(serverName, tool, mcpClient, toolMetadata);
    dynamicToolClasses.push(ToolClass);
  }

  console.log(`[MCP] Initialized ${dynamicToolClasses.length} tool classes`);

  // Cache the results globally
  cache.classes = dynamicToolClasses;
  cache.configKey = configKey;

  return dynamicToolClasses;
}

/**
 * Clear the MCP tools cache
 * Useful for testing or when configuration changes
 */
export function clearMCPToolsCache(): void {
  const cache = getMCPCache();
  cache.classes = null;
  cache.configKey = null;
  console.log('[MCP] Cache cleared');
}
