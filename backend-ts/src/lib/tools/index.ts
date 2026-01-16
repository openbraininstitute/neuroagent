/**
 * Tools Module
 * 
 * Central export point for all tools in the Neuroagent TypeScript backend.
 * 
 * This module provides:
 * - Base tool classes and interfaces
 * - Tool registry for managing available tools
 * - Concrete tool implementations (Web Search, Literature Search, EntityCore, OBIOne)
 * 
 * Usage:
 * ```typescript
 * import { toolRegistry, WebSearchTool, BrainRegionGetAllTool } from '@/lib/tools';
 * 
 * // Register tools
 * const webSearch = new WebSearchTool(exaApiKey);
 * toolRegistry.register(webSearch);
 * 
 * // Get all tools as Vercel AI SDK format
 * const vercelTools = toolRegistry.getAllAsVercelTools();
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
  
  // OBIOne tools
  obiOneUrl?: string;
}

/**
 * Initialize and register all available tools
 * 
 * @param config - Tool configuration
 * @returns Array of initialized tool instances
 */
export async function initializeTools(config: ToolConfig) {
  const { toolRegistry } = await import('./base-tool');
  
  // If tools are already registered, return them
  const existingTools = toolRegistry.getAll();
  if (existingTools.length > 0) {
    return existingTools;
  }
  
  const tools: any[] = [];

  // Initialize search tools
  if (config.exaApiKey) {
    const { WebSearchTool } = await import('./web-search');
    const { LiteratureSearchTool } = await import('./literature-search');
    
    const webSearch = new WebSearchTool(config.exaApiKey);
    const literatureSearch = new LiteratureSearchTool(config.exaApiKey);
    
    toolRegistry.register(webSearch);
    toolRegistry.register(literatureSearch);
    
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
    };
    
    const brainRegionGetAll = new BrainRegionGetAllTool(entityCoreMetadata);
    const cellMorphologyGetAll = new CellMorphologyGetAllTool(entityCoreMetadata);
    
    toolRegistry.register(brainRegionGetAll);
    toolRegistry.register(cellMorphologyGetAll);
    
    tools.push(brainRegionGetAll, cellMorphologyGetAll);
  }

  // Initialize OBIOne tools
  if (config.obiOneUrl) {
    const { CircuitMetricsGetOneTool } = await import('./obione');
    
    const obiOneMetadata = {
      obiOneUrl: config.obiOneUrl,
      vlabId: config.vlabId,
      projectId: config.projectId,
    };
    
    const circuitMetrics = new CircuitMetricsGetOneTool(obiOneMetadata);
    
    toolRegistry.register(circuitMetrics);
    
    tools.push(circuitMetrics);
  }

  return tools;
}
