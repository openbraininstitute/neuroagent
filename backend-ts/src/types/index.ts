/**
 * Core type definitions for Neuroagent TypeScript backend
 */

// Entity types matching database enums
export enum Entity {
  USER = 'USER',
  AI_TOOL = 'AI_TOOL',
  TOOL = 'TOOL',
  AI_MESSAGE = 'AI_MESSAGE',
}

// Task types for token consumption tracking
export enum Task {
  CHAT_COMPLETION = 'CHAT_COMPLETION',
  TOOL_SELECTION = 'TOOL_SELECTION',
  CALL_WITHIN_TOOL = 'CALL_WITHIN_TOOL',
}

// Token types for consumption tracking
export enum TokenType {
  INPUT_NONCACHED = 'INPUT_NONCACHED',
  INPUT_CACHED = 'INPUT_CACHED',
  COMPLETION = 'COMPLETION',
}

// Reasoning levels for model selection
export enum ReasoningLevels {
  NONE = 'NONE',
  MINIMAL = 'MINIMAL',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

// User information from JWT
export interface UserInfo {
  sub: string;
  email?: string;
  groups: string[];
}

// Error response format
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode?: number;
  details?: unknown;
}

// Rate limit result
export interface RateLimitResult {
  limited: boolean;
  headers: Record<string, string>;
}
