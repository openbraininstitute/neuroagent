/**
 * Dangerous Tool - Example HIL Tool
 *
 * This is a test tool that requires Human-in-the-Loop (HIL) validation
 * before execution. It demonstrates the HIL validation flow where:
 * 1. LLM requests to use this tool
 * 2. Execution is paused and user is prompted for validation
 * 3. User must explicitly approve before the tool executes
 *
 * This pattern is useful for tools that:
 * - Perform destructive operations
 * - Access sensitive data
 * - Make external API calls with side effects
 * - Execute code or commands
 */

import { z } from 'zod';

import { BaseTool, type BaseContextVariables } from '../base-tool';

/**
 * Input schema for the dangerous tool
 */
const DangerousToolInputSchema = z.object({
  action: z.string().describe('The dangerous action to perform'),
  target: z.string().describe('The target of the action'),
  confirm: z.boolean().optional().describe('Confirmation flag (optional)'),
});

/**
 * Dangerous Tool - Requires HIL validation
 *
 * This tool demonstrates the Human-in-the-Loop validation pattern.
 * When the LLM tries to use this tool, execution will pause and
 * the user will be prompted to validate the inputs before proceeding.
 */
export class DangerousTool extends BaseTool<typeof DangerousToolInputSchema, BaseContextVariables> {
  // Static metadata (ClassVar pattern)
  static readonly toolName = 'dangerous_tool';
  static readonly toolDescription =
    'Performs a dangerous operation that requires explicit user validation before execution. Use this tool when you need to demonstrate HIL validation flow.';
  static readonly toolUtterances = ['dangerous', 'risky', 'destructive', 'requires validation'];
  static readonly toolHil = true; // This tool requires HIL validation

  // Instance properties
  contextVariables: BaseContextVariables;

  constructor(contextVariables: BaseContextVariables) {
    super();
    this.contextVariables = contextVariables;
  }

  inputSchema = DangerousToolInputSchema;

  /**
   * Execute the dangerous operation
   *
   * This method will only be called after the user has explicitly
   * validated the inputs through the HIL validation flow.
   *
   * @param input - Validated input parameters
   * @returns Result of the dangerous operation
   */
  async execute(input: z.infer<typeof DangerousToolInputSchema>): Promise<string> {
    console.log('[DangerousTool] Executing dangerous operation:', input);

    // Simulate a dangerous operation
    const result = {
      status: 'completed',
      action: input.action,
      target: input.target,
      timestamp: new Date().toISOString(),
      message: `Successfully performed "${input.action}" on "${input.target}" after user validation.`,
    };

    console.log('[DangerousTool] Operation completed:', result);

    return JSON.stringify(result, null, 2);
  }

  /**
   * Check if the tool is operational
   *
   * @returns Always true for this test tool
   */
  override async isOnline(): Promise<boolean> {
    return true;
  }
}
