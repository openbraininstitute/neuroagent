/**
 * Database module exports
 * 
 * Re-exports Prisma client and types for convenient importing.
 */

export { prisma, default } from './client';

// Re-export Prisma types for convenience
export type {
  Thread,
  Message,
  ToolCall,
  ToolSelection,
  ComplexityEstimation,
  TokenConsumption,
  Entity,
  Task,
  TokenType,
  ReasoningLevels,
} from '@prisma/client';
