/**
 * Agents Module
 *
 * Central export point for agent routine functionality.
 *
 * This module provides:
 * - AgentsRoutine class for orchestrating LLM interactions
 * - Agent configuration types
 * - Message conversion utilities
 * - System prompt assembly from MDC rule files
 *
 * Usage:
 * ```typescript
 * import { AgentsRoutine, getSystemPrompt } from '@/lib/agents';
 *
 * const routine = new AgentsRoutine(openaiApiKey, openrouterApiKey);
 * const systemPrompt = await getSystemPrompt();
 * const response = await routine.streamChat(agentConfig, threadId);
 * ```
 */

export * from './routine';
export * from './types';
export * from './system-prompt';
