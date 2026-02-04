/**
 * Calculator Tool Implementation
 *
 * A simple calculator tool demonstrating the BaseTool pattern.
 * This tool performs basic arithmetic operations.
 */

import { z } from 'zod';

import { BaseTool, type BaseContextVariables } from './base-tool';

/**
 * Context variables for the calculator tool
 *
 * This tool doesn't need any external dependencies,
 * but we still define the interface for consistency.
 */
interface CalculatorToolContextVariables extends BaseContextVariables {
  /** Maximum allowed result value (for safety) */
  maxValue?: number;
}

/**
 * Input schema for the calculator tool
 */
const CalculatorToolInputSchema = z.object({
  operation: z
    .enum(['add', 'subtract', 'multiply', 'divide'])
    .describe('The arithmetic operation to perform'),
  a: z.number().describe('First operand'),
  b: z.number().describe('Second operand'),
});

/**
 * Calculator tool for basic arithmetic operations
 *
 * This is a simple example showing:
 * - Static properties for tool metadata
 * - Minimal context variables
 * - Synchronous execution (wrapped in async)
 */
export class CalculatorTool extends BaseTool<
  typeof CalculatorToolInputSchema,
  CalculatorToolContextVariables
> {
  // Static properties (tool metadata) - equivalent to Python ClassVar
  static readonly toolName = 'calculator';
  static readonly toolNameFrontend = 'Calculator';
  static readonly toolDescription =
    'Performs basic arithmetic operations: addition, subtraction, multiplication, and division';
  static readonly toolDescriptionFrontend =
    'Use this tool to perform calculations with two numbers';
  static readonly toolUtterances = [
    'calculate',
    'add',
    'subtract',
    'multiply',
    'divide',
    'what is 5 plus 3',
    'compute',
  ];
  static readonly toolHil = false;

  /**
   * Context variables (runtime dependencies)
   */
  override contextVariables: CalculatorToolContextVariables;

  /**
   * Input validation schema
   */
  override inputSchema = CalculatorToolInputSchema;

  /**
   * Constructor
   *
   * @param contextVariables - Runtime dependencies (minimal for this tool)
   */
  constructor(contextVariables: CalculatorToolContextVariables = {}) {
    super();
    this.contextVariables = contextVariables;
  }

  /**
   * Execute the calculation
   *
   * @param input - Validated input with operation and operands
   * @returns Calculation result
   */
  async execute(input: z.infer<typeof CalculatorToolInputSchema>): Promise<unknown> {
    const { operation, a, b } = input;

    let result: number;

    switch (operation) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        if (b === 0) {
          throw new Error('Division by zero is not allowed');
        }
        result = a / b;
        break;
    }

    // Check against max value if configured
    const maxValue = this.contextVariables.maxValue;
    if (maxValue !== undefined && Math.abs(result) > maxValue) {
      throw new Error(`Result ${result} exceeds maximum allowed value ${maxValue}`);
    }

    return {
      operation,
      operands: { a, b },
      result,
      expression: this.formatExpression(operation, a, b, result),
    };
  }

  /**
   * Format the calculation as a human-readable expression
   */
  private formatExpression(operation: string, a: number, b: number, result: number): string {
    const operators = {
      add: '+',
      subtract: '-',
      multiply: '×',
      divide: '÷',
    };

    const op = operators[operation as keyof typeof operators];
    return `${a} ${op} ${b} = ${result}`;
  }

  /**
   * Health check - always online since no external dependencies
   */
  override async isOnline(): Promise<boolean> {
    return true;
  }
}
