/**
 * Tests for Simulation Campaign GetOne Tool
 *
 * Tests the SimulationCampaignGetOneTool implementation.
 */

import { describe, it, expect } from 'vitest';
import { SimulationCampaignGetOneTool } from '../simulation-campaign-getone';
import type { EntitycoreContextVariables } from '../../base-tool';

describe('SimulationCampaignGetOneTool', () => {
  const mockContextVariables: EntitycoreContextVariables = {
    httpClient: null as any,
    entitycoreUrl: 'https://api.example.com',
    vlabId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    entityFrontendUrl: 'https://frontend.example.com',
  };

  describe('Tool Metadata', () => {
    it('should have correct tool name', () => {
      expect(SimulationCampaignGetOneTool.toolName).toBe('entitycore-simulationcampaign-getone');
    });

    it('should have correct frontend name', () => {
      expect(SimulationCampaignGetOneTool.toolNameFrontend).toBe('Get One Simulation Campaign');
    });

    it('should have description containing key information', () => {
      expect(SimulationCampaignGetOneTool.toolDescription).toContain('simulation-campaign');
      expect(SimulationCampaignGetOneTool.toolDescription).toContain('knowledge graph');
    });

    it('should have frontend description', () => {
      expect(SimulationCampaignGetOneTool.toolDescriptionFrontend).toContain('simulation-campaign');
    });

    it('should have utterances array', () => {
      expect(SimulationCampaignGetOneTool.toolUtterances).toBeInstanceOf(Array);
      expect(SimulationCampaignGetOneTool.toolUtterances.length).toBeGreaterThan(0);
    });
  });

  describe('Tool Instantiation', () => {
    it('should instantiate with context variables', () => {
      const tool = new SimulationCampaignGetOneTool(mockContextVariables);
      expect(tool).toBeInstanceOf(SimulationCampaignGetOneTool);
      expect(tool.contextVariables).toEqual(mockContextVariables);
    });

    it('should have input schema', () => {
      const tool = new SimulationCampaignGetOneTool(mockContextVariables);
      expect(tool.inputSchema).toBeDefined();
    });
  });

  describe('Input Schema Validation', () => {
    it('should accept valid UUID for simulation_campaign_id', () => {
      const tool = new SimulationCampaignGetOneTool(mockContextVariables);

      const validInput = {
        simulation_campaign_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const tool = new SimulationCampaignGetOneTool(mockContextVariables);

      const invalidInput = {
        simulation_campaign_id: 'not-a-uuid',
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject non-string values', () => {
      const tool = new SimulationCampaignGetOneTool(mockContextVariables);

      const invalidInput = {
        simulation_campaign_id: 12345,
      };

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require simulation_campaign_id parameter', () => {
      const tool = new SimulationCampaignGetOneTool(mockContextVariables);

      const invalidInput = {};

      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Vercel Tool Conversion', () => {
    it('should convert to Vercel tool format', () => {
      const tool = new SimulationCampaignGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool).toHaveProperty('description');
      expect(vercelTool).toHaveProperty('parameters');
      expect(vercelTool).toHaveProperty('execute');
      expect(typeof vercelTool.execute).toBe('function');
    });

    it('should have valid parameters schema', () => {
      const tool = new SimulationCampaignGetOneTool(mockContextVariables);
      const vercelTool = tool.toVercelTool();

      expect(vercelTool.parameters).toBeDefined();
      // The parameters is a Zod schema, not a plain object
      expect(vercelTool.parameters).toHaveProperty('_def');
    });
  });

  describe('Tool Registration', () => {
    it('should have consistent naming pattern', () => {
      expect(SimulationCampaignGetOneTool.toolName).toMatch(/^entitycore-simulationcampaign-/);
    });

    it('should have entitycore prefix', () => {
      expect(SimulationCampaignGetOneTool.toolName).toMatch(/^entitycore-/);
    });

    it('should have getone suffix', () => {
      expect(SimulationCampaignGetOneTool.toolName).toMatch(/-getone$/);
    });
  });

  describe('Static Methods', () => {
    it('should have isOnline static method', () => {
      expect(typeof SimulationCampaignGetOneTool.isOnline).toBe('function');
    });
  });
});
