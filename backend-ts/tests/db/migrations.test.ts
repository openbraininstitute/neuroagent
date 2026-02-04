/**
 * Database Migration Tests
 *
 * Tests for database migration application and schema verification.
 * These tests verify that migrations can be applied successfully and
 * that the database schema matches expectations.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/db/client';

describe('Database Migrations', () => {
  beforeAll(async () => {
    // Ensure database connection is established
    await prisma.$connect();
  });

  it('should have all required tables', async () => {
    // Query information_schema to verify tables exist
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const tableNames = tables.map((t) => t.table_name);

    // Verify all expected tables exist
    expect(tableNames).toContain('threads');
    expect(tableNames).toContain('messages');
    expect(tableNames).toContain('tool_calls');
    expect(tableNames).toContain('tool_selection');
    expect(tableNames).toContain('complexity_estimation');
    expect(tableNames).toContain('token_consumption');
    expect(tableNames).toContain('alembic_version');
    expect(tableNames).toContain('_prisma_migrations');
  });

  it('should have all required enums', async () => {
    // Query pg_type to verify enums exist
    const enums = await prisma.$queryRaw<Array<{ typname: string }>>`
      SELECT typname
      FROM pg_type
      WHERE typtype = 'e'
      ORDER BY typname
    `;

    const enumNames = enums.map((e) => e.typname);

    // Verify all expected enums exist
    expect(enumNames).toContain('entity');
    expect(enumNames).toContain('task');
    expect(enumNames).toContain('tokentype');
    expect(enumNames).toContain('reasoninglevels');
  });

  it('should have correct enum values for entity', async () => {
    const values = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'entity')
      ORDER BY enumsortorder
    `;

    const enumValues = values.map((v) => v.enumlabel);

    expect(enumValues).toEqual(['USER', 'AI_TOOL', 'TOOL', 'AI_MESSAGE']);
  });

  it('should have correct enum values for task', async () => {
    const values = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'task')
      ORDER BY enumsortorder
    `;

    const enumValues = values.map((v) => v.enumlabel);

    expect(enumValues).toEqual(['CHAT_COMPLETION', 'TOOL_SELECTION', 'CALL_WITHIN_TOOL']);
  });

  it('should have correct enum values for tokentype', async () => {
    const values = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tokentype')
      ORDER BY enumsortorder
    `;

    const enumValues = values.map((v) => v.enumlabel);

    expect(enumValues).toEqual(['INPUT_NONCACHED', 'INPUT_CACHED', 'COMPLETION']);
  });

  it('should have correct enum values for reasoninglevels', async () => {
    const values = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'reasoninglevels')
      ORDER BY enumsortorder
    `;

    const enumValues = values.map((v) => v.enumlabel);

    expect(enumValues).toEqual(['NONE', 'MINIMAL', 'LOW', 'MEDIUM', 'HIGH']);
  });

  it('should have foreign key constraints', async () => {
    // Query information_schema for foreign keys
    const foreignKeys = await prisma.$queryRaw<
      Array<{ table_name: string; constraint_name: string }>
    >`
      SELECT
        tc.table_name,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name
    `;

    const fkNames = foreignKeys.map((fk) => fk.constraint_name);

    // Verify expected foreign keys exist
    expect(fkNames).toContain('messages_thread_id_fkey');
    expect(fkNames).toContain('tool_calls_message_id_fkey');
    expect(fkNames).toContain('tool_selection_message_id_fkey');
    expect(fkNames).toContain('complexity_estimation_message_id_fkey');
    expect(fkNames).toContain('token_consumption_message_id_fkey');
  });

  it('should have cascade delete on foreign keys', async () => {
    // Query pg_constraint for cascade rules
    // confdeltype: 'a' = NO ACTION, 'r' = RESTRICT, 'c' = CASCADE, 'n' = SET NULL, 'd' = SET DEFAULT
    const cascadeRules = await prisma.$queryRaw<Array<{ conname: string; confdeltype: string }>>`
      SELECT
        conname,
        confdeltype
      FROM pg_constraint
      WHERE contype = 'f'
      AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY conname
    `;

    // Find constraints that should have cascade delete
    const messageThreadFk = cascadeRules.find((r) => r.conname === 'messages_thread_id_fkey');
    const toolCallsFk = cascadeRules.find((r) => r.conname === 'tool_calls_message_id_fkey');
    const toolSelectionFk = cascadeRules.find(
      (r) => r.conname === 'tool_selection_message_id_fkey'
    );
    const complexityFk = cascadeRules.find(
      (r) => r.conname === 'complexity_estimation_message_id_fkey'
    );
    const tokenFk = cascadeRules.find((r) => r.conname === 'token_consumption_message_id_fkey');

    // Verify cascade delete is configured (confdeltype = 'c')
    expect(messageThreadFk).toBeDefined();
    expect(messageThreadFk?.confdeltype).toBe('c');
    expect(toolCallsFk).toBeDefined();
    expect(toolCallsFk?.confdeltype).toBe('c');
    expect(toolSelectionFk).toBeDefined();
    expect(toolSelectionFk?.confdeltype).toBe('c');
    expect(complexityFk).toBeDefined();
    expect(complexityFk?.confdeltype).toBe('c');
    expect(tokenFk).toBeDefined();
    expect(tokenFk?.confdeltype).toBe('c');
  });

  it('should have GIN index on messages.search_vector', async () => {
    // Query pg_indexes for the search_vector index
    const indexes = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'messages'
      AND indexname = 'ix_messages_search_vector'
    `;

    expect(indexes).toHaveLength(1);
    expect(indexes[0]!.indexdef).toContain('USING gin');
    expect(indexes[0]!.indexdef).toContain('search_vector');
  });

  it('should have trigger for search_vector updates', async () => {
    // Query pg_trigger for the search_vector trigger
    const triggers = await prisma.$queryRaw<Array<{ tgname: string }>>`
      SELECT tgname
      FROM pg_trigger
      WHERE tgrelid = 'messages'::regclass
      AND tgname = 'messages_search_vector_trigger'
    `;

    expect(triggers).toHaveLength(1);
    expect(triggers[0]!.tgname).toBe('messages_search_vector_trigger');
  });

  it('should have correct column types for threads table', async () => {
    const columns = await prisma.$queryRaw<
      Array<{ column_name: string; data_type: string; is_nullable: string }>
    >`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'threads'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;

    const columnMap = Object.fromEntries(
      columns.map((c) => [c.column_name, { type: c.data_type, nullable: c.is_nullable }])
    );

    expect(columnMap['thread_id']).toEqual({ type: 'uuid', nullable: 'NO' });
    expect(columnMap['vlab_id']).toEqual({ type: 'uuid', nullable: 'YES' });
    expect(columnMap['project_id']).toEqual({ type: 'uuid', nullable: 'YES' });
    expect(columnMap['title']).toEqual({ type: 'character varying', nullable: 'NO' });
    expect(columnMap['creation_date']).toEqual({
      type: 'timestamp with time zone',
      nullable: 'NO',
    });
    expect(columnMap['update_date']).toEqual({
      type: 'timestamp with time zone',
      nullable: 'NO',
    });
    expect(columnMap['user_id']).toEqual({ type: 'uuid', nullable: 'NO' });
  });

  it('should have correct column types for messages table', async () => {
    const columns = await prisma.$queryRaw<
      Array<{ column_name: string; data_type: string; is_nullable: string }>
    >`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'messages'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;

    const columnMap = Object.fromEntries(
      columns.map((c) => [c.column_name, { type: c.data_type, nullable: c.is_nullable }])
    );

    expect(columnMap['message_id']).toEqual({ type: 'uuid', nullable: 'NO' });
    expect(columnMap['creation_date']).toEqual({
      type: 'timestamp with time zone',
      nullable: 'NO',
    });
    expect(columnMap['entity']).toEqual({ type: 'USER-DEFINED', nullable: 'NO' });
    expect(columnMap['content']).toEqual({
      type: 'character varying',
      nullable: 'NO',
    });
    expect(columnMap['is_complete']).toEqual({ type: 'boolean', nullable: 'NO' });
    expect(columnMap['thread_id']).toEqual({ type: 'uuid', nullable: 'NO' });
    expect(columnMap['search_vector']).toEqual({
      type: 'tsvector',
      nullable: 'YES',
    });
  });
});
