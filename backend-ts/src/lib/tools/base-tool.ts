/**
 * Base Tool System for Neuroagent TypeScript Backend
 * 
 * This module provides the abstract base class for all tools in the system,
 * along with interfaces and utilities for tool metadata and health checks.
 */

import { z } from 'zod';
import { tool as vercelTool, Tool } from 'ai';

/**
 * Tool metadata interface
 * 
 * Defines the metadata that every tool must provide for registration,
 * discovery, and frontend display.
 */
export interface ToolMetadata {
  /** Unique identifier for the tool (used in backend) */
  name: string;
  
  /** Display name for frontend (optional, defaults to name) */
  nameFrontend?: string;
  
  /** Description of what the tool does (used for LLM context) */
  description: string;
  
  /** Frontend-friendly description (optional, defaults to description) */
  descriptionFrontend?: string;
  
  /** Example utterances that might trigger this tool */
  utterances?: string[];
  
  /** Whether this tool requires Human-in-the-Loop validation */
  hil?: boolean;
}

/**
 * Tool health check interface
 * 
 * Defines the contract for checking if a tool is operational.
 */
export interface ToolHealthCheck {
  /** Check if the tool is currently operational */
  isOnline(): Promise<boolean>;
}

/**
 * Abstract base class for all tools
 * 
 * All tools in the system must extend this class and implement:
 * - metadata: Tool identification and description
 * - inputSchema: Zod schema for input validation
 * - execute: The actual tool logic
 * 
 * The class provides automatic conversion to Vercel AI SDK format
 * and health check capabilities.
 * 
 * @template TInput - Zod schema type for tool input validation
 */
export abstract class BaseTool<TInput extends z.ZodType>
  implements ToolHealthCheck
{
  /**
   * Tool metadata
   * Must be implemented by subclasses to provide tool information
   */
  abstract metadata: ToolMetadata;

  /**
   * Input validation schema
   * Must be implemented by subclasses using Zod
   */
  abstract inputSchema: TInput;

  /**
   * Execute the tool with validated input
   * 
   * @param input - Validated input matching the inputSchema
   * @returns Tool execution result (can be any JSON-serializable value)
   */
  abstract execute(input: z.infer<TInput>): Promise<unknown>;

  /**
   * Convert this tool to Vercel AI SDK format
   * 
   * This method generates a Tool compatible with Vercel AI SDK's
   * streamText function, automatically handling input validation and
   * execution. The tool() function ensures schema compatibility across
   * all providers (OpenAI, Anthropic, Google, etc.).
   * 
   * @returns Tool object for use with Vercel AI SDK
   */
  toVercelTool(): Tool {
    return vercelTool({
      description: this.metadata.description,
      parameters: this.inputSchema,
      execute: async (input: z.infer<TInput>) => {
        return await this.execute(input);
      },
    });
  }

  /**
   * Check if the tool is currently operational
   * 
   * Default implementation returns true. Subclasses should override
   * this method if they need to check external service availability.
   * 
   * @returns Promise resolving to true if tool is operational
   */
  async isOnline(): Promise<boolean> {
    return true;
  }

  /**
   * Get the frontend display name
   * 
   * @returns Frontend display name or fallback to backend name
   */
  getFrontendName(): string {
    return this.metadata.nameFrontend || this.metadata.name;
  }

  /**
   * Get the frontend description
   * 
   * @returns Frontend description or fallback to backend description
   */
  getFrontendDescription(): string {
    return this.metadata.descriptionFrontend || this.metadata.description;
  }

  /**
   * Check if this tool requires Human-in-the-Loop validation
   * 
   * @returns True if HIL validation is required
   */
  requiresHIL(): boolean {
    return this.metadata.hil === true;
  }

  /**
   * Get tool utterances for matching user intent
   * 
   * @returns Array of example utterances or empty array
   */
  getUtterances(): string[] {
    return this.metadata.utterances || [];
  }
}

/**
 * Tool registry for managing available tools
 * 
 * Provides centralized registration and lookup of tools.
 */
export class ToolRegistry {
  private tools: Map<string, BaseTool<any>> = new Map();

  /**
   * Register a tool in the registry
   * 
   * @param tool - Tool instance to register
   * @throws Error if a tool with the same name is already registered
   */
  register(tool: BaseTool<any>): void {
    if (this.tools.has(tool.metadata.name)) {
      throw new Error(
        `Tool with name "${tool.metadata.name}" is already registered`
      );
    }
    this.tools.set(tool.metadata.name, tool);
  }

  /**
   * Get a tool by name
   * 
   * @param name - Tool name to lookup
   * @returns Tool instance or undefined if not found
   */
  get(name: string): BaseTool<any> | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   * 
   * @returns Array of all registered tool instances
   */
  getAll(): BaseTool<any>[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get all tools as Vercel AI SDK format
   * 
   * @returns Record mapping tool names to Tool objects
   */
  getAllAsVercelTools(): Record<string, Tool> {
    const vercelTools: Record<string, Tool> = {};
    const tools = Array.from(this.tools.values());
    for (const tool of tools) {
      vercelTools[tool.metadata.name] = tool.toVercelTool();
    }
    return vercelTools;
  }

  /**
   * Get metadata for all registered tools
   * 
   * @returns Array of tool metadata objects
   */
  getAllMetadata(): ToolMetadata[] {
    return Array.from(this.tools.values()).map((tool) => tool.metadata);
  }

  /**
   * Check health status of all tools
   * 
   * @returns Promise resolving to map of tool names to health status
   */
  async checkAllHealth(): Promise<Map<string, boolean>> {
    const healthMap = new Map<string, boolean>();
    
    await Promise.all(
      Array.from(this.tools.entries()).map(async ([name, tool]) => {
        try {
          const isOnline = await tool.isOnline();
          healthMap.set(name, isOnline);
        } catch (error) {
          console.error(`Health check failed for tool "${name}":`, error);
          healthMap.set(name, false);
        }
      })
    );

    return healthMap;
  }

  /**
   * Clear all registered tools
   * Useful for testing
   */
  clear(): void {
    this.tools.clear();
  }
}

/**
 * Global tool registry instance
 */
export const toolRegistry = new ToolRegistry();
