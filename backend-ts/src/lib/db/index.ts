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
} from '@prisma/client';

// Re-export Prisma enums (lowercase in generated client)
export {
  entity as Entity,
  task as Task,
  tokentype as TokenType,
  reasoninglevels as ReasoningLevels,
} from '@prisma/client';
