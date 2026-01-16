/**
 * Database Client Tests
 * 
 * Tests for the Prisma client singleton pattern and basic functionality.
 */

import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/db/client';

describe('Prisma Client', () => {
  it('should export a PrismaClient instance', () => {
    expect(prisma).toBeDefined();
    expect(typeof prisma).toBe('object');
    expect(prisma.$connect).toBeDefined();
    expect(prisma.$disconnect).toBeDefined();
  });

  it('should be a singleton (same instance on multiple imports)', async () => {
    // Dynamic import to test singleton behavior
    const { prisma: prisma1 } = await import('@/lib/db/client');
    const { prisma: prisma2 } = await import('@/lib/db/client');
    
    expect(prisma1).toBe(prisma2);
  });

  it('should have all expected models', () => {
    expect(prisma.thread).toBeDefined();
    expect(prisma.message).toBeDefined();
    expect(prisma.toolCall).toBeDefined();
    expect(prisma.toolSelection).toBeDefined();
    expect(prisma.complexityEstimation).toBeDefined();
    expect(prisma.tokenConsumption).toBeDefined();
    expect(prisma.alembicVersion).toBeDefined();
  });
});
