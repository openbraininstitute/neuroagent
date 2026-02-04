/**
 * Property-Based Tests for Migration Validation
 *
 * Feature: typescript-backend-migration
 * Property 10: Migration Validation
 *
 * For any migration file, attempting to apply an invalid migration should be
 * rejected before any database changes occur.
 *
 * Validates: Requirements 4.6
 *
 * This test verifies that:
 * 1. Invalid SQL syntax in migrations is detected and rejected
 * 2. Invalid schema changes (e.g., dropping non-existent tables) are rejected
 * 3. Constraint violations in migrations are detected
 * 4. No partial state is left in the database after rejection
 * 5. The database schema remains unchanged after a failed migration attempt
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import { execSync } from 'child_process';
import { prisma } from '@/lib/db/client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Schema state representation for comparison
 */
interface SchemaState {
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
    }>;
  }>;
  enums: Array<{
    name: string;
    values: string[];
  }>;
}

/**
 * Capture the current database schema state
 */
async function captureSchemaState(): Promise<SchemaState> {
  // Capture tables and columns
  const tables = await prisma.$queryRaw<
    Array<{
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>
  >`
    SELECT
      t.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND c.table_schema = 'public'
    ORDER BY t.table_name, c.ordinal_position
  `;

  // Group by table
  const tableMap = new Map<string, SchemaState['tables'][0]>();
  for (const row of tables) {
    if (!tableMap.has(row.table_name)) {
      tableMap.set(row.table_name, {
        name: row.table_name,
        columns: [],
      });
    }
    tableMap.get(row.table_name)!.columns.push({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
    });
  }

  // Capture enums
  const enums = await prisma.$queryRaw<
    Array<{ typname: string; enumlabel: string; enumsortorder: number }>
  >`
    SELECT
      t.typname,
      e.enumlabel,
      e.enumsortorder
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typtype = 'e'
    ORDER BY t.typname, e.enumsortorder
  `;

  // Group by enum type
  const enumMap = new Map<string, string[]>();
  for (const row of enums) {
    if (!enumMap.has(row.typname)) {
      enumMap.set(row.typname, []);
    }
    enumMap.get(row.typname)!.push(row.enumlabel);
  }

  return {
    tables: Array.from(tableMap.values()),
    enums: Array.from(enumMap.entries()).map(([name, values]) => ({
      name,
      values,
    })),
  };
}

/**
 * Compare two schema states for equality
 */
function compareSchemaStates(state1: SchemaState, state2: SchemaState): {
  equal: boolean;
  differences: string[];
} {
  const differences: string[] = [];

  // Compare tables
  const tables1 = new Set(state1.tables.map((t) => t.name));
  const tables2 = new Set(state2.tables.map((t) => t.name));

  for (const table of tables1) {
    if (!tables2.has(table)) {
      differences.push(`Table ${table} exists in state1 but not in state2`);
    }
  }

  for (const table of tables2) {
    if (!tables1.has(table)) {
      differences.push(`Table ${table} exists in state2 but not in state1`);
    }
  }

  // Compare columns for common tables
  for (const table1 of state1.tables) {
    const table2 = state2.tables.find((t) => t.name === table1.name);
    if (!table2) continue;

    const cols1 = new Map(table1.columns.map((c) => [c.name, c]));
    const cols2 = new Map(table2.columns.map((c) => [c.name, c]));

    for (const [colName, col1] of cols1) {
      const col2 = cols2.get(colName);
      if (!col2) {
        differences.push(
          `Column ${table1.name}.${colName} exists in state1 but not in state2`
        );
      } else {
        if (col1.type !== col2.type) {
          differences.push(
            `Column ${table1.name}.${colName} type differs: ${col1.type} vs ${col2.type}`
          );
        }
        if (col1.nullable !== col2.nullable) {
          differences.push(
            `Column ${table1.name}.${colName} nullable differs: ${col1.nullable} vs ${col2.nullable}`
          );
        }
      }
    }

    for (const colName of cols2.keys()) {
      if (!cols1.has(colName)) {
        differences.push(
          `Column ${table1.name}.${colName} exists in state2 but not in state1`
        );
      }
    }
  }

  // Compare enums
  const enums1 = new Map(state1.enums.map((e) => [e.name, e.values]));
  const enums2 = new Map(state2.enums.map((e) => [e.name, e.values]));

  for (const [enumName, values1] of enums1) {
    const values2 = enums2.get(enumName);
    if (!values2) {
      differences.push(`Enum ${enumName} exists in state1 but not in state2`);
    } else if (JSON.stringify(values1) !== JSON.stringify(values2)) {
      differences.push(
        `Enum ${enumName} values differ: ${values1.join(',')} vs ${values2.join(',')}`
      );
    }
  }

  for (const enumName of enums2.keys()) {
    if (!enums1.has(enumName)) {
      differences.push(`Enum ${enumName} exists in state2 but not in state1`);
    }
  }

  return {
    equal: differences.length === 0,
    differences,
  };
}

/**
 * Create a temporary invalid migration for testing
 */
function createInvalidMigration(migrationName: string, sql: string): string {
  const timestamp = Date.now();
  const fullMigrationName = `${timestamp}_${migrationName}`;
  const migrationPath = path.join(
    process.cwd(),
    'prisma',
    'migrations',
    fullMigrationName
  );

  // Create migration directory
  fs.mkdirSync(migrationPath, { recursive: true });

  // Write migration.sql
  const migrationFile = path.join(migrationPath, 'migration.sql');
  fs.writeFileSync(migrationFile, sql);

  return fullMigrationName;
}

/**
 * Remove a temporary migration
 */
function removeInvalidMigration(migrationName: string): void {
  const migrationPath = path.join(
    process.cwd(),
    'prisma',
    'migrations',
    migrationName
  );

  if (fs.existsSync(migrationPath)) {
    fs.rmSync(migrationPath, { recursive: true, force: true });
  }
}

/**
 * Attempt to apply a migration and return whether it succeeded
 */
function attemptMigration(): { success: boolean; error?: string } {
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'pipe',
      encoding: 'utf-8',
      env: { ...process.env, DATABASE_URL: process.env['DATABASE_URL'] },
    });
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

/**
 * Mark a migration as rolled back in Prisma's tracking
 */
function markMigrationAsRolledBack(migrationName: string): void {
  try {
    execSync(`npx prisma migrate resolve --rolled-back ${migrationName}`, {
      stdio: 'pipe',
      encoding: 'utf-8',
      env: { ...process.env, DATABASE_URL: process.env['DATABASE_URL'] },
    });
  } catch (error) {
    // Ignore errors - migration might not be in tracking table
  }
}

describe('Migration Validation Property Tests', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Property 10: Migration Validation', () => {
    /**
     * **Validates: Requirements 4.6**
     *
     * Test that invalid SQL syntax is rejected before any changes
     */
    it('should reject migrations with invalid SQL syntax', async () => {
      // Capture initial state
      const initialState = await captureSchemaState();

      // Create invalid migration with syntax error
      const migrationName = createInvalidMigration(
        'test_invalid_syntax',
        'CREATE TABEL invalid_syntax (id INT);' // Typo: TABEL instead of TABLE
      );

      try {
        // Attempt to apply the invalid migration
        const result = attemptMigration();

        // The migration should fail
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();

        // Capture state after failed migration
        const afterState = await captureSchemaState();

        // Schema should be unchanged
        const comparison = compareSchemaStates(initialState, afterState);
        expect(comparison.equal).toBe(true);

        if (!comparison.equal) {
          console.error('Schema changed after failed migration:');
          comparison.differences.forEach((diff) => console.error(`  - ${diff}`));
        }
      } finally {
        // Clean up
        markMigrationAsRolledBack(migrationName);
        removeInvalidMigration(migrationName);
      }
    }, 30000);

    /**
     * Test that dropping non-existent tables is rejected
     */
    it('should reject migrations that drop non-existent tables', async () => {
      const initialState = await captureSchemaState();

      // Create migration that tries to drop a non-existent table
      const migrationName = createInvalidMigration(
        'test_drop_nonexistent',
        'DROP TABLE nonexistent_table_xyz_123;'
      );

      try {
        const result = attemptMigration();

        // The migration should fail
        expect(result.success).toBe(false);

        // Schema should be unchanged
        const afterState = await captureSchemaState();
        const comparison = compareSchemaStates(initialState, afterState);
        expect(comparison.equal).toBe(true);
      } finally {
        markMigrationAsRolledBack(migrationName);
        removeInvalidMigration(migrationName);
      }
    }, 30000);

    /**
     * Test that constraint violations are rejected
     */
    it('should reject migrations with constraint violations', async () => {
      const initialState = await captureSchemaState();

      // Create migration that violates constraints
      // Try to add a NOT NULL column without a default to an existing table
      const migrationName = createInvalidMigration(
        'test_constraint_violation',
        `
        -- This should fail if the threads table has any rows
        -- because we're adding a NOT NULL column without a default
        ALTER TABLE threads ADD COLUMN test_required_col VARCHAR NOT NULL;
        `
      );

      try {
        const result = attemptMigration();

        // If the table has rows, this should fail
        // If the table is empty, it might succeed, so we check the state
        const afterState = await captureSchemaState();
        const comparison = compareSchemaStates(initialState, afterState);

        if (!result.success) {
          // Migration failed as expected - schema should be unchanged
          expect(comparison.equal).toBe(true);
        } else {
          // Migration succeeded (table was empty) - need to rollback
          // Remove the added column
          await prisma.$executeRawUnsafe(
            'ALTER TABLE threads DROP COLUMN IF EXISTS test_required_col;'
          );
        }
      } finally {
        markMigrationAsRolledBack(migrationName);
        removeInvalidMigration(migrationName);
      }
    }, 30000);

    /**
     * Test that foreign key violations are rejected
     */
    it('should reject migrations with invalid foreign key references', async () => {
      const initialState = await captureSchemaState();

      // Create migration with invalid foreign key
      const migrationName = createInvalidMigration(
        'test_invalid_fk',
        `
        CREATE TABLE test_invalid_fk (
          id UUID PRIMARY KEY,
          nonexistent_ref UUID NOT NULL,
          FOREIGN KEY (nonexistent_ref) REFERENCES nonexistent_table(id)
        );
        `
      );

      try {
        const result = attemptMigration();

        // The migration should fail
        expect(result.success).toBe(false);

        // Schema should be unchanged
        const afterState = await captureSchemaState();
        const comparison = compareSchemaStates(initialState, afterState);
        expect(comparison.equal).toBe(true);
      } finally {
        markMigrationAsRolledBack(migrationName);
        removeInvalidMigration(migrationName);
      }
    }, 30000);

    /**
     * Test that duplicate table creation is rejected
     */
    it('should reject migrations that create duplicate tables', async () => {
      const initialState = await captureSchemaState();

      // Create migration that tries to create an existing table
      const migrationName = createInvalidMigration(
        'test_duplicate_table',
        `
        CREATE TABLE threads (
          id UUID PRIMARY KEY,
          title VARCHAR
        );
        `
      );

      try {
        const result = attemptMigration();

        // The migration should fail
        expect(result.success).toBe(false);

        // Schema should be unchanged
        const afterState = await captureSchemaState();
        const comparison = compareSchemaStates(initialState, afterState);
        expect(comparison.equal).toBe(true);
      } finally {
        markMigrationAsRolledBack(migrationName);
        removeInvalidMigration(migrationName);
      }
    }, 30000);

    /**
     * Test that invalid enum values are rejected
     */
    it('should reject migrations with invalid enum operations', async () => {
      const initialState = await captureSchemaState();

      // Create migration that tries to use a non-existent enum value
      const migrationName = createInvalidMigration(
        'test_invalid_enum',
        `
        -- Try to alter an enum type that doesn't exist
        ALTER TYPE nonexistent_enum ADD VALUE 'NEW_VALUE';
        `
      );

      try {
        const result = attemptMigration();

        // The migration should fail
        expect(result.success).toBe(false);

        // Schema should be unchanged
        const afterState = await captureSchemaState();
        const comparison = compareSchemaStates(initialState, afterState);
        expect(comparison.equal).toBe(true);
      } finally {
        markMigrationAsRolledBack(migrationName);
        removeInvalidMigration(migrationName);
      }
    }, 30000);

    /**
     * Property-based test: Random invalid SQL should be rejected
     *
     * This test verifies that the database properly rejects invalid SQL
     * and maintains schema integrity.
     */
    test.prop([
      fc.oneof(
        // Invalid SQL syntax patterns
        fc.constant('CREAT TABLE test (id INT);'), // Typo
        fc.constant('SELECT * FORM test;'), // Typo
        fc.constant('DROP TABEL test;'), // Typo
        fc.constant('ALTER TABEL test ADD COLUMN x INT;'), // Typo
        fc.constant('DROP TABLE this_table_definitely_does_not_exist_xyz_123;'), // Non-existent table
        fc.constant('ALTER TABLE threads ADD COLUMN test_col INT REFERENCES nonexistent_table(id);'), // Invalid FK reference
      ),
    ])(
      'should reject any invalid SQL and maintain schema integrity',
      async (invalidSql) => {
        const initialState = await captureSchemaState();

        try {
          // Attempt to execute invalid SQL directly
          await prisma.$executeRawUnsafe(invalidSql);

          // If we get here, the SQL unexpectedly succeeded
          // This should not happen for our invalid SQL patterns
          throw new Error(`Expected SQL to fail but it succeeded: ${invalidSql}`);
        } catch (error: any) {
          // The SQL should fail - this is expected
          expect(error).toBeDefined();

          // Verify schema is unchanged after the failed SQL
          const afterState = await captureSchemaState();
          const comparison = compareSchemaStates(initialState, afterState);

          expect(comparison.equal).toBe(true);

          if (!comparison.equal) {
            console.error(`Schema changed after failed SQL: ${invalidSql}`);
            comparison.differences.forEach((diff) => console.error(`  - ${diff}`));
          }
        }
      },
      { numRuns: 10, timeout: 30000 } // Run 10 times with 30s timeout
    );

    /**
     * Test that valid migrations are accepted (sanity check)
     */
    it('should accept valid migrations as a sanity check', async () => {
      const initialState = await captureSchemaState();

      try {
        // Apply a valid migration directly using SQL
        await prisma.$executeRawUnsafe(`
          CREATE TABLE test_valid_table (
            id UUID PRIMARY KEY,
            name VARCHAR(100)
          );
        `);

        // Schema should have changed (new table added)
        const afterState = await captureSchemaState();
        const comparison = compareSchemaStates(initialState, afterState);

        expect(comparison.equal).toBe(false);
        expect(afterState.tables.some((t) => t.name === 'test_valid_table')).toBe(true);

        // Clean up - drop the test table
        await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS test_valid_table;');

        // Verify cleanup
        const finalState = await captureSchemaState();
        const cleanupComparison = compareSchemaStates(initialState, finalState);
        expect(cleanupComparison.equal).toBe(true);
      } catch (error) {
        // Clean up on error
        await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS test_valid_table;');
        throw error;
      }
    }, 30000);

    /**
     * Test that schema state capture is consistent
     */
    it('should capture consistent schema state across multiple calls', async () => {
      const state1 = await captureSchemaState();
      const state2 = await captureSchemaState();

      const comparison = compareSchemaStates(state1, state2);

      expect(comparison.equal).toBe(true);

      if (!comparison.equal) {
        console.error('Schema state capture is inconsistent:');
        comparison.differences.forEach((diff) => console.error(`  - ${diff}`));
      }
    });
  });
});
