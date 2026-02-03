/**
 * Tools Module
 *
 * Central export point for all tools in the Neuroagent TypeScript backend.
 *
 * This module provides:
 * - Base tool classes and interfaces
 * - Example tool implementations for demonstration
 *
 * Usage:
 * ```typescript
 * import { ExampleTool, CalculatorTool } from '@/lib/tools';
 *
 * // Get available tool classes
 * const toolClasses = await getAvailableToolClasses(config);
 *
 * // When LLM calls a tool, instantiate it
 * const tool = await createToolInstance(ToolClass, config);
 * const result = await tool.execute(input);
 * ```
 */

// Base tool system
export * from './base-tool';

// Example tools
export * from './example-tool';
export * from './calculator-tool';

// Test tools for filtering
export * from './test';

/**
 * Tool configuration interface
 *
 * Defines the configuration needed to determine which tools are available
 * and to instantiate them with proper context.
 */
export interface ToolConfig {
  // Example tool config
  exampleApiUrl?: string;
  exampleApiKey?: string;

  // Calculator tool config
  calculatorMaxValue?: number;

  // Add more tool configs as needed
}

/**
 * Register all available tool classes for metadata access
 *
 * IMPORTANT: This function does NOT instantiate any tools!
 * It only stores CLASS REFERENCES (the class types themselves) in the registry.
 *
 * This allows accessing static properties (toolName, toolDescription, etc.)
 * without creating instances, matching Python's ClassVar pattern where
 * tool_list is list[type[BaseTool]] and you access tool.name directly.
 *
 * Example:
 * ```typescript
 * await registerToolClasses();
 * const ToolClass = toolRegistry.getClass('calculator');
 * console.log(ToolClass.toolName);  // Access static property - no instance!
 * ```
 *
 * Call this once at application startup or on-demand when needed.
 */
export async function registerToolClasses() {
  const { toolRegistry } = await import('./base-tool');

  try {
    // Import tool classes (NOT instances - just the class definitions)
    const { ExampleTool } = await import('./example-tool');
    const { CalculatorTool } = await import('./calculator-tool');

    // Import test tools
    const { WeatherTool } = await import('./test/WeatherTool');
    const { TranslatorTool } = await import('./test/TranslatorTool');
    const { TimeTool } = await import('./test/TimeTool');
    const { CurrencyTool } = await import('./test/CurrencyTool');

    // Store class references in registry (NO INSTANTIATION - just storing the class types)
    // This is like Python's: tool_list = [ExampleTool, CalculatorTool, ...]
    const toolClasses = [
      { name: 'ExampleTool', cls: ExampleTool },
      { name: 'CalculatorTool', cls: CalculatorTool },
      { name: 'WeatherTool', cls: WeatherTool },
      { name: 'TranslatorTool', cls: TranslatorTool },
      { name: 'TimeTool', cls: TimeTool },
      { name: 'CurrencyTool', cls: CurrencyTool },
    ];

    for (const { name, cls: ToolCls } of toolClasses) {
      try {
        // Skip if undefined (import failed)
        if (!ToolCls) {
          console.warn(`[registerToolClasses] Skipping undefined tool class: ${name}`);
          continue;
        }

        // registerClass() only stores the class reference, doesn't call new ToolClass()
        toolRegistry.registerClass(ToolCls as any);
      } catch (error) {
        // Ignore if already registered
        if (!(error instanceof Error && error.message.includes('already registered'))) {
          console.error(`[registerToolClasses] Error registering ${name}:`, error);
          throw error;
        }
      }
    }
  } catch (error) {
    console.error('[registerToolClasses] Fatal error during registration:', error);
    throw error;
  }
}

/**
 * Get available tool classes based on configuration
 *
 * Returns a list of tool CLASSES (not instances) that are available
 * based on the provided configuration (API keys, URLs, etc.).
 *
 * This matches Python's pattern where tools is list[type[BaseTool]].
 * Tools will be instantiated individually when the LLM calls them.
 *
 * @param config - Configuration to determine which tools are available
 * @returns Array of tool classes that can be used
 */
export async function getAvailableToolClasses(config: ToolConfig): Promise<any[]> {
  const availableClasses: any[] = [];

  // Example tool is available if API URL is configured
  if (config.exampleApiUrl) {
    const { ExampleTool } = await import('./example-tool');
    availableClasses.push(ExampleTool);
  }

  // Calculator tool is always available (no external dependencies)
  const { CalculatorTool } = await import('./calculator-tool');
  availableClasses.push(CalculatorTool);

  // Test tools are always available (for testing filtering)
  const { WeatherTool } = await import('./test/WeatherTool');
  const { TranslatorTool } = await import('./test/TranslatorTool');
  const { TimeTool } = await import('./test/TimeTool');
  const { CurrencyTool } = await import('./test/CurrencyTool');

  availableClasses.push(WeatherTool);
  availableClasses.push(TranslatorTool);
  availableClasses.push(TimeTool);
  availableClasses.push(CurrencyTool);

  return availableClasses;
}

/**
 * Create a tool instance on-demand when LLM calls it
 *
 * This is called individually for each tool that the LLM decides to use.
 * DO NOT call this for all tools at once - only instantiate the specific
 * tool that needs to be executed.
 *
 * @param ToolCls - The tool class to instantiate
 * @param config - User-specific context for the tool
 * @returns Tool instance ready for execution
 */
export async function createToolInstance(
  ToolCls: any,
  config: ToolConfig
): Promise<any> {
  const toolName = ToolCls.toolName;

  // Instantiate based on tool name
  if (toolName === 'example_tool') {
    if (!config.exampleApiUrl) {
      throw new Error('Example tool requires exampleApiUrl');
    }

    const { ExampleTool } = await import('./example-tool');
    return new ExampleTool({
      apiUrl: config.exampleApiUrl,
      apiKey: config.exampleApiKey,
    });
  }

  if (toolName === 'calculator') {
    const { CalculatorTool } = await import('./calculator-tool');
    return new CalculatorTool({
      maxValue: config.calculatorMaxValue,
    });
  }

  throw new Error(`Unknown tool: ${toolName}`);
}

/**
 * Initialize and return available tool classes
 *
 * Returns tool CLASSES (not instances) that match the configuration.
 * This follows the ClassVar pattern where we work with types until
 * the LLM selects specific tools to execute.
 *
 * Usage:
 * ```typescript
 * const toolClasses = await initializeTools(config);
 *
 * // Access static metadata without instantiation
 * toolClasses.forEach(ToolClass => {
 *   console.log(ToolClass.toolName);
 *   console.log(ToolClass.toolHil);
 * });
 *
 * // Later, when LLM calls a tool, instantiate it
 * const instance = new ToolClass(contextVariables);
 * await instance.execute(input);
 * ```
 *
 * @param config - Configuration to determine available tools
 * @returns Array of tool classes (NOT instances)
 */
export async function initializeTools(config?: any): Promise<any[]> {
  // Register tool classes if not already done
  await registerToolClasses();

  const { toolRegistry } = await import('./base-tool');

  // Return all registered tool classes
  // These are CLASS REFERENCES, not instances
  return toolRegistry.getAllClasses();
}
