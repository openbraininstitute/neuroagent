/**
 * Agents Module
 * 
 * Central export point for agent routine functionality.
 * 
 * This module provides:
 * - AgentsRoutine class for orchestrating LLM interactions
 * - Agent configuration types
 * - Message conversion utilities
 * 
 * Usage:
 * ```typescript
 * import { AgentsRoutine } from '@/lib/agents';
 * 
 * const routine = new AgentsRoutine(openaiApiKey, openrouterApiKey);
 * const response = await routine.streamChat(agentConfig, threadId);
 * ```
 */

export * from './routine';
export * from './types';
