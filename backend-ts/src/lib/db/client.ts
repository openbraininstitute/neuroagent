/**
 * Prisma Client Singleton
 *
 * This module provides a singleton instance of the Prisma Client to prevent
 * multiple instances from being created during development hot-reloading.
 *
 * Features:
 * - Singleton pattern to reuse client across hot-reloads
 * - Connection pooling configured via DATABASE_URL
 * - Development logging for queries, errors, and warnings
 * - Production logging for errors only
 */

import { PrismaClient } from '@prisma/client';

// Extend global type to include prisma property
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Create Prisma Client with appropriate logging configuration
 *
 * Development: Logs queries, errors, and warnings for debugging
 * Production: Logs errors only to reduce noise
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Connection pooling is configured via DATABASE_URL query parameters
    // Example: postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20
  });

// Prevent multiple instances in development (hot-reload)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
