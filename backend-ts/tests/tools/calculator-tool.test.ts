/**
 * Unit tests for Calculator Tool
 *
 * Tests calculator tool execution with known inputs and error handling.
 * Validates: Requirements 13.4
 */

import { describe, it, expect } from 'vitest';
import { CalculatorTool } from '@/lib/tools/calculator-tool';

describe('CalculatorTool', () => {
  describe('Tool Metadata', () => {
    it('should have correct static metadata', () => {
      expect(CalculatorTool.toolName).toBe('calculator');
      expect(CalculatorTool.toolNameFrontend).toBe('Calculator');
      expect(CalculatorTool.toolDescription).toBeTruthy();
      expect(CalculatorTool.toolUtterances).toContain('calculate');
      expect(CalculatorTool.toolHil).toBe(false);
    });

    it('should expose metadata through instance methods', () => {
      const tool = new CalculatorTool();

      expect(tool.getName()).toBe('calculator');
      expect(tool.getFrontendName()).toBe('Calculator');
      expect(tool.getDescription()).toBeTruthy();
      expect(tool.getUtterances()).toContain('calculate');
      expect(tool.requiresHIL()).toBe(false);
    });
  });

  describe('Addition', () => {
    it('should add two positive numbers', async () => {
      const tool = new CalculatorTool();
      const result = await tool.execute({
        operation: 'add',
        a: 5,
        b: 3,
      });

      expect(result).toMatchObject({
        operation: 'add',
        operands: { a: 5, b: 3 },
        result: 8,
        expression: '5 + 3 = 8',
      });
    });

    it('should add negative numbers', async () => {
      const tool = new CalculatorTool();
      const result = await tool.execute({
        operation: 'add',
        a: -5,
        b: -3,
      });

      expect(result).toMatchObject({
        result: -8,
      });
    });

    it('should add zero', async () => {
      const tool = new CalculatorTool();
      const result = await tool.execute({
        operation: 'add',
        a: 10,
        b: 0,
      });

      expect(result).toMatchObject({
        result: 10,
      });
    });

    it('should add decimal numbers', async () => {
      const tool = new CalculatorTool();
      const result = await tool.execute({
        operation: 'add',
        a: 1.5,
        b: 2.3,
      });

      expect(result).toMatchObject({
        result: 3.8,
      });
    });
  });

  describe('Subtraction', () => {
    it('should subtract two positive numbers', async () => {
      const tool = new CalculatorTool();
      const result = await tool.execute({
        operation: 'subtract',
        a: 10,
        b: 3,
      });

      expect(result).toMatchObject({
        operation: 'subtract',
        operands: { a: 10, b: 3 },
        result: 7,
        expression: '10 - 3 = 7',
      });
    });

    it('should handle negative results', async () => {
      const tool = new CalculatorTool();
      const result = await tool.execute({
        operation: 'subtract',
        a: 3,
        b: 10,
      });

      expect(result).toMatchObject({
        result: -7,
      });
    });
  });

  describe('Multiplication', () => {
    it('should multiply two positive numbers', async () => {
      const tool = new CalculatorTool();
      const result = await tool.execute({
        operation: 'multiply',
        a: 4,
        b: 5,
      });

      expect(result).toMatchObject({
        operation: 'multiply',
        operands: { a: 4, b: 5 },
        result: 20,
        expression: '4 × 5 = 20',
      });
    });

    it('should multiply by zero', async () => {
      const tool = new CalculatorTool();
      const result = await tool.execute({
        operation: 'multiply',
        a: 100,
        b: 0,
      });

      expect(result).toMatchObject({
        result: 0,
      });
    });

    it('should multiply negative numbers', async () => {
      const tool = new CalculatorTool();
      const result = await tool.execute({
        operation: 'multiply',
        a: -3,
        b: 4,
      });

      expect(result).toMatchObject({
        result: -12,
      });
    });
  });

  describe('Division', () => {
    it('should divide two positive numbers', async () => {
      const tool = new CalculatorTool();
      const result = await tool.execute({
        operation: 'divide',
        a: 20,
        b: 4,
      });

      expect(result).toMatchObject({
        operation: 'divide',
        operands: { a: 20, b: 4 },
        result: 5,
        expression: '20 ÷ 4 = 5',
      });
    });

    it('should handle decimal division', async () => {
      const tool = new CalculatorTool();
      const result = await tool.execute({
        operation: 'divide',
        a: 10,
        b: 3,
      });

      expect(result).toMatchObject({
        result: expect.closeTo(3.333, 2),
      });
    });

    it('should throw error on division by zero', async () => {
      const tool = new CalculatorTool();

      await expect(
        tool.execute({
          operation: 'divide',
          a: 10,
          b: 0,
        })
      ).rejects.toThrow('Division by zero is not allowed');
    });
  });

  describe('Max Value Constraint', () => {
    it('should enforce max value constraint', async () => {
      const tool = new CalculatorTool({ maxValue: 100 });

      await expect(
        tool.execute({
          operation: 'multiply',
          a: 50,
          b: 3,
        })
      ).rejects.toThrow('exceeds maximum allowed value');
    });

    it('should allow results within max value', async () => {
      const tool = new CalculatorTool({ maxValue: 1000 });

      const result = await tool.execute({
        operation: 'multiply',
        a: 10,
        b: 5,
      });

      expect(result).toMatchObject({
        result: 50,
      });
    });

    it('should check absolute value against max', async () => {
      const tool = new CalculatorTool({ maxValue: 100 });

      await expect(
        tool.execute({
          operation: 'subtract',
          a: 10,
          b: 200,
        })
      ).rejects.toThrow('exceeds maximum allowed value');
    });
  });

  describe('Input Validation', () => {
    it('should validate operation enum', () => {
      const tool = new CalculatorTool();

      expect(() =>
        tool.inputSchema.parse({
          operation: 'invalid',
          a: 1,
          b: 2,
        })
      ).toThrow();
    });

    it('should require numeric operands', () => {
      const tool = new CalculatorTool();

      expect(() =>
        tool.inputSchema.parse({
          operation: 'add',
          a: 'not a number',
          b: 2,
        })
      ).toThrow();
    });

    it('should require all fields', () => {
      const tool = new CalculatorTool();

      expect(() =>
        tool.inputSchema.parse({
          operation: 'add',
          a: 1,
        })
      ).toThrow();
    });
  });

  describe('Vercel AI SDK Integration', () => {
    it('should convert to Vercel tool format', () => {
      const tool = new CalculatorTool();
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toBeDefined();
      expect(vercelTool.description).toBe(tool.getDescription());
      expect(vercelTool.parameters).toBe(tool.inputSchema);
      expect(typeof vercelTool.execute).toBe('function');
    });

    it('should execute through Vercel tool wrapper', async () => {
      const tool = new CalculatorTool();
      const vercelTool = tool.toVercelTool();

      const result = await vercelTool.execute!(
        {
          operation: 'add',
          a: 2,
          b: 3,
        },
        {}
      );

      expect(result).toMatchObject({
        result: 5,
      });
    });
  });

  describe('Health Check', () => {
    it('should always be online', async () => {
      const tool = new CalculatorTool();
      expect(await tool.isOnline()).toBe(true);
    });
  });
});
