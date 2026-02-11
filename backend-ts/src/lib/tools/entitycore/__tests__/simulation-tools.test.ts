/**
 * Tests for Simulation Tools
 *
 * Tests the SimulationGetOneTool implementation.
 */

import { describe, it, expect } from 'vitest';
import { SimulationGetOneTool } from '../simulation-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('Simulation Tools', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('SimulationGetOneTool', () => {
    it('should have correct metadata', () => {
      expect(SimulationGetOneTool.toolName).toBe('entitycore-simulation-getone');
      expect(SimulationGetOneTool.toolNameFrontend).toBe('Get One Simulation');
      expect(SimulationGetOneTool.toolDescription).toContain('specific simulation');
      expect(SimulationGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(SimulationGetOneTool.toolUtterances.length).toBeGreaterThan(0);
    });

    it('should instantiate with context variables', () => {
      const tool = new SimulationGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(SimulationGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have valid input schema', () => {
      const tool = new SimulationGetOneTool(mockContextVariables);

      // Test valid UUID
      const validInput = {
        simulation_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new SimulationGetOneTool(mockContextVariables);

      // Test invalid UUID
      const invalidInput = {
        simulation_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require simulation_id parameter', () => {
      const tool = new SimulationGetOneTool(mockContextVariables);

      // Test missing simulation_id
      const invalidInput = {};

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should convert to Vercel tool format', () => {
      const tool = new SimulationGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });
  });

  describe('Tool Registration', () => {
    it('should have consistent naming pattern', () => {
      expect(SimulationGetOneTool.toolName).toMatch(/^entitycore-simulation-/);
    });

    it('should have entitycore prefix', () => {
      expect(SimulationGetOneTool.toolName).toMatch(/^entitycore-/);
    });
  });
});
