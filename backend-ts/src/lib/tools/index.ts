/**
 * Tools Module
 *
 * Central export point for all tools in the Neuroagent TypeScript backend.
 *
 * This module provides:
 * - Base tool classes and interfaces
 * - Concrete tool implementations (Web Search, Literature Search, EntityCore, OBIOne)
 *
 * Usage:
 * ```typescript
 * import { WebSearchTool, BrainRegionGetAllTool } from '@/lib/tools';
 *
 * // Instantiate tools with configuration
 * const webSearch = new WebSearchTool(exaApiKey);
 * const result = await webSearch.execute({ query: 'neuroscience', num_results: 5 });
 * 
 * // Convert to Vercel AI SDK format
 * const vercelTool = webSearch.toVercelTool();
 * ```
 */

// Base tool system
export * from './base-tool';

// Search tools
export * from './web-search';
export * from './literature-search';

// EntityCore tools
export * from './entitycore';

// OBIOne tools
export * from './obione';

/**
 * Tool factory function
 *
 * Creates and registers all available tools based on configuration.
 * This is the main entry point for initializing the tool system.
 *
 * @param config - Configuration object with API keys and URLs
 * @returns Array of registered tool instances
 */
export interface ToolConfig {
  // Search tools
  exaApiKey?: string;

  // EntityCore tools
  entitycoreUrl?: string;
  entityFrontendUrl?: string;
  vlabId?: string;
  projectId?: string;
  jwtToken?: string;  // JWT token for authenticated requests

  // OBIOne tools
  obiOneUrl?: string;

  // MCP tools
  mcpConfig?: any; // SettingsMCP type
}

/**
 * Initialize and register all available tools
 *
 * @param config - Tool configuration
 * @returns Array of initialized tool instances
 */
export async function initializeTools(config: ToolConfig) {
  const { toolRegistry } = await import('./base-tool');

  // IMPORTANT: Always create fresh tool instances for each request
  // Tools contain user-specific context (JWT tokens, vlab/project IDs)
  // and must not be shared across requests
  
  const tools: any[] = [];

  // Initialize search tools
  if (config.exaApiKey) {
    const { WebSearchTool } = await import('./web-search');
    const { LiteratureSearchTool } = await import('./literature-search');

    const webSearch = new WebSearchTool(config.exaApiKey);
    const literatureSearch = new LiteratureSearchTool(config.exaApiKey);

    tools.push(webSearch, literatureSearch);
  }

  // Initialize EntityCore tools
  if (config.entitycoreUrl && config.entityFrontendUrl) {
    const { BrainRegionGetAllTool, CellMorphologyGetAllTool } = await import('./entitycore');

    const entityCoreMetadata = {
      entitycoreUrl: config.entitycoreUrl,
      entityFrontendUrl: config.entityFrontendUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
      jwtToken: config.jwtToken,  // Pass JWT token
    };

    const brainRegionGetAll = new BrainRegionGetAllTool(entityCoreMetadata);
    const cellMorphologyGetAll = new CellMorphologyGetAllTool(entityCoreMetadata);

    tools.push(brainRegionGetAll, cellMorphologyGetAll);
  }

  // Initialize OBIOne tools
  if (config.obiOneUrl) {
    const { CircuitMetricsGetOneTool } = await import('./obione');

    const obiOneMetadata = {
      obiOneUrl: config.obiOneUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
      jwtToken: config.jwtToken,  // Pass JWT token
    };

    const circuitMetrics = new CircuitMetricsGetOneTool(obiOneMetadata);

    tools.push(circuitMetrics);
  }

  // Initialize MCP tools
  if (config.mcpConfig) {
    const { initializeMCPTools } = await import('../mcp');

    try {
      const mcpTools = await initializeMCPTools(config.mcpConfig);
      tools.push(...mcpTools);
    } catch (error) {
      console.error('Failed to initialize MCP tools:', error);
    }
  }

  return tools;
}
