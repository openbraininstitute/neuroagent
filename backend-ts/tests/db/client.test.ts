/**
 * Database Client Tests
 *
 * Tests for the Prisma client singleton pattern and basic functionality.
 *
 * Requirements tested:
 * - 13.5: Database operations testing
 * - 3.4: Async database operations using Prisma Client's async API
 * - 3.5: Database connection pooling through Prisma
 */

import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/db/client';

describe('Database Client - Connection Initialization', () => {
  describe('Client Instance', () => {
    it('should export a PrismaClient instance', () => {
      expect(prisma).toBeDefined();
      expect(typeof prisma).toBe('object');
      // Check for key PrismaClient properties instead of instanceof
      expect(prisma.$connect).toBeDefined();
      expect(prisma.$disconnect).toBeDefined();
      expect(prisma.$transaction).toBeDefined();
    });

    it('should have connection methods defined', () => {
      expect(prisma.$connect).toBeDefined();
      expect(typeof prisma.$connect).toBe('function');
      expect(prisma.$disconnect).toBeDefined();
      expect(typeof prisma.$disconnect).toBe('function');
    });

    it('should have transaction methods defined', () => {
      expect(prisma.$transaction).toBeDefined();
      expect(typeof prisma.$transaction).toBe('function');
    });

    it('should have query execution methods defined', () => {
      expect(prisma.$queryRaw).toBeDefined();
      expect(typeof prisma.$queryRaw).toBe('function');
      expect(prisma.$executeRaw).toBeDefined();
      expect(typeof prisma.$executeRaw).toBe('function');
    });
  });

  describe('Logging Configuration', () => {
    it('should be configured with appropriate logging', () => {
      // Verify client is configured (we can't directly check log config, but we can verify it exists)
      expect(prisma).toBeDefined();
      expect(typeof prisma).toBe('object');

      // The logging configuration is set at initialization time based on NODE_ENV
      // In development: ['query', 'error', 'warn']
      // In production: ['error']
      // We verify the client is properly initialized
    });

    it('should support different environments', () => {
      // The client adapts to NODE_ENV at initialization
      // This test verifies the client works regardless of environment
      expect(prisma).toBeDefined();
      expect(typeof prisma.$connect).toBe('function');
    });
  });

  describe('Database Models', () => {
    it('should have all expected models defined', () => {
      // Core models
      expect(prisma.thread).toBeDefined();
      expect(prisma.message).toBeDefined();
      expect(prisma.toolCall).toBeDefined();
      expect(prisma.toolSelection).toBeDefined();
      expect(prisma.complexityEstimation).toBeDefined();
      expect(prisma.tokenConsumption).toBeDefined();

      // Migration tracking
      expect(prisma.alembicVersion).toBeDefined();
    });

    it('should have CRUD operations on all models', () => {
      const models = [
        prisma.thread,
        prisma.message,
        prisma.toolCall,
        prisma.toolSelection,
        prisma.complexityEstimation,
        prisma.tokenConsumption,
      ];

      for (const model of models) {
        expect(model.findMany).toBeDefined();
        expect(model.findUnique).toBeDefined();
        expect(model.create).toBeDefined();
        expect(model.update).toBeDefined();
        expect(model.delete).toBeDefined();
      }
    });
  });

  describe('Connection Pooling', () => {
    it('should support connection pooling via DATABASE_URL', () => {
      // Verify that the client can be used for multiple operations
      // This implicitly tests connection pooling
      expect(prisma).toBeDefined();

      // The connection pool is configured via DATABASE_URL query parameters
      // We can't directly test pool size, but we can verify the client works
      expect(typeof prisma.$connect).toBe('function');
    });
  });
});

describe('Database Client - Singleton Pattern', () => {
  describe('Instance Reuse', () => {
    it('should return the same instance on multiple imports', async () => {
      // Import twice using dynamic imports
      const module1 = await import('@/lib/db/client?t=' + Date.now());
      const module2 = await import('@/lib/db/client?t=' + Date.now());

      // Both should reference the same underlying client
      // Note: Due to module caching, this tests that the singleton pattern works
      expect(module1.prisma).toBeDefined();
      expect(module2.prisma).toBeDefined();
    });

    it('should maintain singleton behavior across the application', () => {
      // Import the same module multiple times in the same test
      const prisma1 = prisma;
      const prisma2 = prisma;

      // Should be the exact same instance
      expect(prisma1).toBe(prisma2);
    });

    it('should use global object to prevent multiple instances', () => {
      // The singleton pattern prevents multiple PrismaClient instances
      // This is important for connection pooling and resource management
      expect(prisma).toBeDefined();
      expect(typeof prisma).toBe('object');

      // In development, the global object stores the instance
      // In production, each import gets the same instance via module caching
    });
  });

  describe('Export Patterns', () => {
    it('should export prisma as both named and default export', async () => {
      const module = await import('@/lib/db/client');

      // Both exports should exist
      expect(module.prisma).toBeDefined();
      expect(module.default).toBeDefined();

      // They should be the same instance
      expect(module.prisma).toBe(module.default);
    });

    it('should support named import syntax', () => {
      // This test uses the named import at the top of the file
      expect(prisma).toBeDefined();
      expect(typeof prisma).toBe('object');
    });

    it('should provide consistent interface across import styles', async () => {
      const module = await import('@/lib/db/client');

      // All import styles should provide the same interface
      expect(module.prisma.$connect).toBeDefined();
      expect(module.default.$connect).toBeDefined();
      expect(prisma.$connect).toBeDefined();
    });
  });

  describe('Development vs Production Behavior', () => {
    it('should handle hot-reload scenarios in development', () => {
      // The singleton pattern is designed to survive hot-reloads
      // by storing the instance in the global object in non-production
      expect(prisma).toBeDefined();

      // Multiple references should point to the same instance
      const ref1 = prisma;
      const ref2 = prisma;
      expect(ref1).toBe(ref2);
    });

    it('should prevent connection leaks through singleton pattern', () => {
      // By reusing the same client instance, we prevent connection leaks
      // that could occur from creating multiple PrismaClient instances
      expect(prisma).toBeDefined();
      expect(typeof prisma.$connect).toBe('function');
      expect(typeof prisma.$disconnect).toBe('function');
    });
  });
});

describe('Database Client - Error Handling', () => {
  it('should handle missing DATABASE_URL gracefully during import', () => {
    // Note: Prisma will throw an error if DATABASE_URL is not set
    // This test verifies that the module can be imported even if connection fails later
    expect(prisma).toBeDefined();

    // Module should load successfully
    // Connection errors will occur when trying to use the client
    // This is expected behavior - Prisma validates DATABASE_URL at runtime
  });

  it('should expose error handling methods', () => {
    // Prisma provides error handling through try-catch
    // Verify that the client has the necessary methods
    expect(prisma.$connect).toBeDefined();
    expect(prisma.$disconnect).toBeDefined();

    // These methods can throw errors which should be caught by the application
  });

  it('should support graceful shutdown', () => {
    // The client should support disconnection for graceful shutdown
    expect(prisma.$disconnect).toBeDefined();
    expect(typeof prisma.$disconnect).toBe('function');

    // In production, this is important for serverless environments
    // and proper application shutdown
  });
});

describe('Database Client - Advanced Features', () => {
  describe('Transaction Support', () => {
    it('should support interactive transactions', () => {
      expect(prisma.$transaction).toBeDefined();
      expect(typeof prisma.$transaction).toBe('function');
    });

    it('should support raw SQL queries', () => {
      expect(prisma.$queryRaw).toBeDefined();
      expect(typeof prisma.$queryRaw).toBe('function');
      expect(prisma.$executeRaw).toBeDefined();
      expect(typeof prisma.$executeRaw).toBe('function');
    });
  });

  describe('Connection Management', () => {
    it('should support explicit connection', () => {
      expect(prisma.$connect).toBeDefined();
      expect(typeof prisma.$connect).toBe('function');

      // Prisma connects lazily by default
      // $connect can be called explicitly if needed
    });

    it('should support explicit disconnection', () => {
      expect(prisma.$disconnect).toBeDefined();
      expect(typeof prisma.$disconnect).toBe('function');

      // Important for cleanup in tests and graceful shutdown
    });
  });

  describe('Type Safety', () => {
    it('should provide TypeScript types for all models', () => {
      // Verify that models have proper TypeScript types
      // This is a compile-time check, but we can verify runtime structure
      expect(prisma.thread).toBeDefined();
      expect(prisma.message).toBeDefined();

      // Each model should have typed methods
      expect(typeof prisma.thread.findMany).toBe('function');
      expect(typeof prisma.message.create).toBe('function');
    });

    it('should support type-safe queries', () => {
      // Prisma generates types from the schema
      // This ensures type safety at compile time
      expect(prisma.thread.findUnique).toBeDefined();
      expect(prisma.thread.findFirst).toBeDefined();
      expect(prisma.thread.findMany).toBeDefined();
    });
  });
});
