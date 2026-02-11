/**
 * Base Tool System for Neuroagent TypeScript Backend
 *
 * Translated from backend/src/neuroagent/tools/base_tool.py
 *
 * This module provides the abstract base class for all tools in the system,
 * along with interfaces and utilities for context variables and health checks.
 */

import { tool as vercelTool, type Tool } from 'ai';
import { type z } from 'zod';

/**
 * Base context variables interface
 *
 * Context variables are passed from the app to the tool (not from the LLM).
 * These contain runtime dependencies like HTTP clients, URLs, and configuration.
 *
 * Equivalent to Python's BaseMetadata class.
 */
export interface BaseContextVariables {
  // Base interface - subclasses define specific context variables
}

/**
 * EntityCore context variables
 *
 * Context variables specific to EntityCore tools.
 * Equivalent to Python's EntitycoreMetadata class.
 */
export interface EntitycoreContextVariables extends BaseContextVariables {
  /** HTTP client (ky instance) pre-configured with JWT token */
  httpClient: import('ky').KyInstance;

  /** EntityCore API base URL */
  entitycoreUrl: string;

  /** Virtual lab ID (optional) */
  vlabId?: string;

  /** Project ID (optional) */
  projectId?: string;

  /** Entity frontend URL */
  entityFrontendUrl: string;
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
 * Tool class interface for static properties
 *
 * This interface defines the static properties that all tool classes must have.
 * It's the TypeScript equivalent of Python's ClassVar pattern.
 *
 * Use this type when working with tool classes (not instances):
 * ```typescript
 * function processToolClass(ToolClass: ToolClass) {
 *   console.log(ToolClass.toolName);
 * }
 * ```
 */
export interface ToolClass {
  /** Unique identifier for the tool (used in backend) */
  readonly toolName: string;

  /** Display name for frontend (optional, defaults to toolName) */
  readonly toolNameFrontend?: string;

  /** Description of what the tool does (used for LLM context) */
  readonly toolDescription: string;

  /** Frontend-friendly description (optional, defaults to toolDescription) */
  readonly toolDescriptionFrontend?: string;

  /** Example utterances that might trigger this tool */
  readonly toolUtterances?: string[];

  /** Static method to check if tool is operational (optional) */
  isOnline?(contextVariables: BaseContextVariables): Promise<boolean>;

  /** Constructor signature */
  new (contextVariables: any): BaseTool<any, any>;
}

/**
 * Abstract base class for all tools
 *
 * All tools in the system must extend this class and implement:
 * - Static properties: toolName, toolDescription, toolUtterances, etc. (tool metadata)
 * - contextVariables: Runtime dependencies passed from app to tool
 * - inputSchema: Zod schema for input validation
 * - execute: The actual tool logic
 *
 * The class provides automatic conversion to Vercel AI SDK format
 * and health check capabilities.
 *
 * Note: Subclasses should define static readonly properties for metadata.
 * We use prefixed names (toolName, toolDescription, etc.) to avoid conflicts
 * with built-in class properties like 'name' and 'constructor'.
 *
 * TypeScript doesn't support abstract static properties, so we rely on
 * convention and runtime checks. Use the ToolClass interface when working
 * with tool classes (not instances).
 *
 * @template TInput - Zod schema type for tool input validation
 * @template TContext - Context variables type (runtime dependencies)
 */
export abstract class BaseTool<
  TInput extends z.ZodType,
  TContext extends BaseContextVariables = BaseContextVariables,
> implements ToolHealthCheck {
  /**
   * Context variables (runtime dependencies)
   *
   * These are passed from the app to the tool, not from the LLM.
   * Contains things like HTTP clients, API URLs, authentication tokens, etc.
   *
   * Equivalent to Python's `metadata` field.
   */
  abstract contextVariables: TContext;

  /**
   * Input validation schema
   *
   * Defines the parameters that the LLM can provide to the tool.
   * Must be implemented by subclasses using Zod.
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
   * execution.
   *
   * @returns Tool object for use with Vercel AI SDK
   */
  toVercelTool(): Tool {
    return vercelTool({
      description: this.getDescription(),
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
   * Get the tool name from static property
   *
   * @returns Tool name
   */
  getName(): string {
    const ToolClass = this.constructor as any;
    return ToolClass.toolName || 'unknown_tool';
  }

  /**
   * Get the frontend display name from static property
   *
   * @returns Frontend display name or fallback to backend name
   */
  getFrontendName(): string {
    const ToolClass = this.constructor as any;
    return ToolClass.toolNameFrontend || this.getName();
  }

  /**
   * Get the backend description from static property
   *
   * @returns Backend description
   */
  getDescription(): string {
    const ToolClass = this.constructor as any;
    return ToolClass.toolDescription || 'No description available';
  }

  /**
   * Get the frontend description from static property
   *
   * @returns Frontend description or fallback to backend description
   */
  getFrontendDescription(): string {
    const ToolClass = this.constructor as any;
    return ToolClass.toolDescriptionFrontend || this.getDescription();
  }

  /**
   * Get tool utterances for matching user intent
   *
   * @returns Array of example utterances or empty array
   */
  getUtterances(): string[] {
    const ToolClass = this.constructor as any;
    return ToolClass.toolUtterances || [];
  }
}

/**
 * Tool metadata for registry and frontend display
 *
 * This is extracted from the tool's static properties.
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
}

/**
 * Tool registry for managing available tools
 *
 * Stores tool CLASS references (not instances) for metadata access.
 * Tools are instantiated on-demand when needed for execution.
 *
 * This matches Python's pattern where tool_list is list[type[BaseTool]]
 * and you access tool.name, tool.description directly from the class.
 */
export class ToolRegistry {
  private toolClasses: Map<string, ToolClass> = new Map();

  /**
   * Register a tool class in the registry
   *
   * IMPORTANT: This does NOT instantiate the tool!
   * It only stores a reference to the class type itself.
   *
   * This allows accessing static properties without instantiation,
   * matching Python's ClassVar pattern.
   *
   * Example:
   * ```typescript
   * // Register the class (no instantiation)
   * toolRegistry.registerClass(WebSearchTool);
   *
   * // Access static properties
   * const ToolClass = toolRegistry.getClass('web-search');
   * console.log(ToolClass.toolName);  // Static property access
   *
   * // Instantiate only when needed for execution
   * const instance = new ToolClass(contextVariables);
   * await instance.execute(input);
   * ```
   *
   * @param ToolClass - Tool class to register (NOT an instance!)
   * @throws Error if a tool with the same name is already registered
   */
  registerClass(ToolClass: ToolClass): void {
    const toolName = ToolClass.toolName;
    if (this.toolClasses.has(toolName)) {
      throw new Error(`Tool with name "${toolName}" is already registered`);
    }
    // Store the class reference (NOT an instance - just the class type)
    this.toolClasses.set(toolName, ToolClass);
  }

  /**
   * Get a tool class by name (for metadata access or instantiation)
   *
   * @param name - Tool name to lookup
   * @returns Tool class or undefined if not found
   */
  getClass(name: string): ToolClass | undefined {
    return this.toolClasses.get(name);
  }

  /**
   * Get all registered tool classes
   *
   * @returns Array of all registered tool classes
   */
  getAllClasses(): ToolClass[] {
    return Array.from(this.toolClasses.values());
  }

  /**
   * Get metadata for all registered tools
   *
   * This works directly with tool classes, no instantiation needed.
   * Matches Python's pattern of accessing ClassVar properties.
   *
   * @returns Array of tool metadata objects
   */
  getAllMetadata(): ToolMetadata[] {
    return Array.from(this.toolClasses.values()).map((ToolClass) => ({
      name: ToolClass.toolName,
      nameFrontend: ToolClass.toolNameFrontend,
      description: ToolClass.toolDescription,
      descriptionFrontend: ToolClass.toolDescriptionFrontend,
      utterances: ToolClass.toolUtterances,
    }));
  }

  /**
   * Check health status of all tools
   *
   * Uses static isOnline method if available on the tool class.
   *
   * @param contextVariables - Context variables for health checks
   * @returns Promise resolving to map of tool names to health status
   */
  async checkAllHealth(contextVariables?: BaseContextVariables): Promise<Map<string, boolean>> {
    const healthMap = new Map<string, boolean>();

    await Promise.all(
      Array.from(this.toolClasses.entries()).map(async ([name, ToolClass]) => {
        try {
          if (ToolClass.isOnline && contextVariables) {
            const isOnline = await ToolClass.isOnline(contextVariables);
            healthMap.set(name, isOnline);
          } else {
            // Default to true if no health check available
            healthMap.set(name, true);
          }
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
    this.toolClasses.clear();
  }
}

/**
 * Global tool registry instance
 */
export const toolRegistry = new ToolRegistry();
