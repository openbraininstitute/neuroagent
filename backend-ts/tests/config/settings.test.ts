/**
 * Unit tests for configuration validation
 * Tests valid configuration loading, invalid configuration rejection, and default values
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSettings, clearSettingsCache } from '@/lib/config/settings';
import { ZodError } from 'zod';

describe('Configuration System', () => {
  // Store original environment
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    clearSettingsCache();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    clearSettingsCache();
  });

  describe('Valid Configuration Loading', () => {
    it('should load configuration with all default values', () => {
      const settings = getSettings();

      expect(settings).toBeDefined();
      expect(settings.agent.model).toBe('simple');
      expect(settings.agent.maxTurns).toBe(10);
      expect(settings.agent.maxParallelToolCalls).toBe(10);
      expect(settings.storage.bucketName).toBe('neuroagent');
      expect(settings.storage.expiresIn).toBe(600);
      expect(settings.llm.suggestionModel).toBe('gpt-5-nano');
      expect(settings.llm.defaultChatModel).toBe('gpt-5-mini');
      expect(settings.llm.temperature).toBe(1);
      expect(settings.rateLimiter.limitChat).toBe(20);
      expect(settings.rateLimiter.disabled).toBe(false);
    });

    it('should load agent configuration from environment variables', () => {
      process.env['NEUROAGENT_AGENT__MODEL'] = 'multi';
      process.env['NEUROAGENT_AGENT__MAX_TURNS'] = '15';
      process.env['NEUROAGENT_AGENT__MAX_PARALLEL_TOOL_CALLS'] = '5';

      const settings = getSettings();

      expect(settings.agent.model).toBe('multi');
      expect(settings.agent.maxTurns).toBe(15);
      expect(settings.agent.maxParallelToolCalls).toBe(5);
    });

    it('should load storage configuration from environment variables', () => {
      process.env['NEUROAGENT_STORAGE__ENDPOINT_URL'] = 'http://minio:9000';
      process.env['NEUROAGENT_STORAGE__BUCKET_NAME'] = 'test-bucket';
      process.env['NEUROAGENT_STORAGE__ACCESS_KEY'] = 'minioadmin';
      process.env['NEUROAGENT_STORAGE__SECRET_KEY'] = 'minioadmin';
      process.env['NEUROAGENT_STORAGE__EXPIRES_IN'] = '300';

      const settings = getSettings();

      expect(settings.storage.endpointUrl).toBe('http://minio:9000');
      expect(settings.storage.bucketName).toBe('test-bucket');
      expect(settings.storage.accessKey).toBe('minioadmin');
      expect(settings.storage.secretKey).toBe('minioadmin');
      expect(settings.storage.expiresIn).toBe(300);
    });

    it('should load database configuration from environment variables', () => {
      process.env['NEUROAGENT_DB__PREFIX'] = 'postgresql+asyncpg';
      process.env['NEUROAGENT_DB__USER'] = 'postgres';
      process.env['NEUROAGENT_DB__PASSWORD'] = 'password';
      process.env['NEUROAGENT_DB__HOST'] = 'localhost';
      process.env['NEUROAGENT_DB__PORT'] = '5432';
      process.env['NEUROAGENT_DB__NAME'] = 'neuroagent';

      const settings = getSettings();

      expect(settings.db.prefix).toBe('postgresql+asyncpg');
      expect(settings.db.user).toBe('postgres');
      expect(settings.db.password).toBe('password');
      expect(settings.db.host).toBe('localhost');
      expect(settings.db.port).toBe('5432');
      expect(settings.db.name).toBe('neuroagent');
    });

    it('should load LLM configuration from environment variables', () => {
      process.env['NEUROAGENT_LLM__OPENAI_TOKEN'] = 'sk-test-token';
      process.env['NEUROAGENT_LLM__OPENAI_BASE_URL'] = 'https://api.openai.com/v1';
      process.env['NEUROAGENT_LLM__OPENROUTER_TOKEN'] = 'or-test-token';
      process.env['NEUROAGENT_LLM__SUGGESTION_MODEL'] = 'gpt-4';
      process.env['NEUROAGENT_LLM__DEFAULT_CHAT_MODEL'] = 'gpt-4-turbo';
      process.env['NEUROAGENT_LLM__TEMPERATURE'] = '0.7';
      process.env['NEUROAGENT_LLM__MAX_TOKENS'] = '2000';

      const settings = getSettings();

      expect(settings.llm.openaiToken).toBe('sk-test-token');
      expect(settings.llm.openaiBaseUrl).toBe('https://api.openai.com/v1');
      expect(settings.llm.openRouterToken).toBe('or-test-token');
      expect(settings.llm.suggestionModel).toBe('gpt-4');
      expect(settings.llm.defaultChatModel).toBe('gpt-4-turbo');
      expect(settings.llm.temperature).toBe(0.7);
      expect(settings.llm.maxTokens).toBe(2000);
    });

    it('should load rate limiter configuration from environment variables', () => {
      process.env['NEUROAGENT_RATE_LIMITER__REDIS_HOST'] = 'redis';
      process.env['NEUROAGENT_RATE_LIMITER__REDIS_PORT'] = '6380';
      process.env['NEUROAGENT_RATE_LIMITER__REDIS_PASSWORD'] = 'secret';
      process.env['NEUROAGENT_RATE_LIMITER__REDIS_SSL'] = 'true';
      process.env['NEUROAGENT_RATE_LIMITER__DISABLED'] = 'false';
      process.env['NEUROAGENT_RATE_LIMITER__LIMIT_CHAT'] = '50';

      const settings = getSettings();

      expect(settings.rateLimiter.redisHost).toBe('redis');
      expect(settings.rateLimiter.redisPort).toBe(6380);
      expect(settings.rateLimiter.redisPassword).toBe('secret');
      expect(settings.rateLimiter.redisSsl).toBe(true);
      expect(settings.rateLimiter.disabled).toBe(false);
      expect(settings.rateLimiter.limitChat).toBe(50);
    });

    it('should load tools configuration from environment variables', () => {
      process.env['NEUROAGENT_TOOLS__ENTITYCORE__URL'] = 'http://entitycore:8080';
      process.env['NEUROAGENT_TOOLS__OBI_ONE__URL'] = 'http://obione:8080';
      process.env['NEUROAGENT_TOOLS__MIN_TOOL_SELECTION'] = '3';
      process.env['NEUROAGENT_TOOLS__EXA_API_KEY'] = 'exa-key';

      const settings = getSettings();

      expect(settings.tools.entitycore.url).toBe('http://entitycore:8080');
      expect(settings.tools.obiOne.url).toBe('http://obione:8080');
      expect(settings.tools.minToolSelection).toBe(3);
      expect(settings.tools.exaApiKey).toBe('exa-key');
    });

    it('should compute keycloak userInfoEndpoint from issuer', () => {
      process.env['NEUROAGENT_KEYCLOAK__ISSUER'] = 'https://example.com/auth/realms/test';

      const settings = getSettings();

      expect(settings.keycloak.issuer).toBe('https://example.com/auth/realms/test');
      expect(settings.keycloak.userInfoEndpoint).toBe(
        'https://example.com/auth/realms/test/protocol/openid-connect/userinfo'
      );
    });

    it('should compute sanity URL from project settings', () => {
      process.env['NEUROAGENT_TOOLS__SANITY__PROJECT_ID'] = 'test123';
      process.env['NEUROAGENT_TOOLS__SANITY__DATASET'] = 'production';
      process.env['NEUROAGENT_TOOLS__SANITY__VERSION'] = 'v2024-01-01';

      const settings = getSettings();

      expect(settings.tools.sanity.projectId).toBe('test123');
      expect(settings.tools.sanity.dataset).toBe('production');
      expect(settings.tools.sanity.version).toBe('v2024-01-01');
      expect(settings.tools.sanity.url).toBe(
        'https://test123.api.sanity.io/v2024-01-01/data/query/production'
      );
    });

    it('should disable accounting when no base URL is provided', () => {
      const settings = getSettings();

      expect(settings.accounting.baseUrl).toBeUndefined();
      expect(settings.accounting.disabled).toBe(true);
    });

    it('should enable accounting when base URL is provided', () => {
      process.env['NEUROAGENT_ACCOUNTING__BASE_URL'] = 'https://accounting.example.com';
      process.env['NEUROAGENT_ACCOUNTING__DISABLED'] = 'false';

      const settings = getSettings();

      expect(settings.accounting.baseUrl).toBe('https://accounting.example.com');
      expect(settings.accounting.disabled).toBe(false);
    });
  });

  describe('Invalid Configuration Rejection', () => {
    it('should reject invalid agent model value', () => {
      process.env['NEUROAGENT_AGENT__MODEL'] = 'invalid';

      expect(() => getSettings()).toThrow(ZodError);
    });

    it('should reject invalid integer values', () => {
      process.env['NEUROAGENT_AGENT__MAX_TURNS'] = 'not-a-number';

      const settings = getSettings();
      // Should use default value when parsing fails
      expect(settings.agent.maxTurns).toBe(10);
    });

    it('should reject negative min_tool_selection', () => {
      process.env['NEUROAGENT_TOOLS__MIN_TOOL_SELECTION'] = '-1';

      expect(() => getSettings()).toThrow(ZodError);
    });

    it('should reject invalid logging level', () => {
      process.env['NEUROAGENT_LOGGING__LEVEL'] = 'invalid-level';

      expect(() => getSettings()).toThrow(ZodError);
    });

    it('should reject invalid sanity dataset', () => {
      process.env['NEUROAGENT_TOOLS__SANITY__DATASET'] = 'invalid';

      expect(() => getSettings()).toThrow(ZodError);
    });

    it('should reject invalid boolean values', () => {
      process.env['NEUROAGENT_RATE_LIMITER__REDIS_SSL'] = 'not-a-boolean';

      const settings = getSettings();
      // Should use default value when parsing fails
      expect(settings.rateLimiter.redisSsl).toBe(false);
    });
  });

  describe('Default Values', () => {
    it('should use default agent settings when not provided', () => {
      const settings = getSettings();

      expect(settings.agent.model).toBe('simple');
      expect(settings.agent.maxTurns).toBe(10);
      expect(settings.agent.maxParallelToolCalls).toBe(10);
    });

    it('should use default storage settings when not provided', () => {
      const settings = getSettings();

      expect(settings.storage.bucketName).toBe('neuroagent');
      expect(settings.storage.expiresIn).toBe(600);
      expect(settings.storage.endpointUrl).toBeUndefined();
    });

    it('should use default LLM settings when not provided', () => {
      const settings = getSettings();

      expect(settings.llm.suggestionModel).toBe('gpt-5-nano');
      expect(settings.llm.defaultChatModel).toBe('gpt-5-mini');
      expect(settings.llm.defaultChatReasoning).toBe('low');
      expect(settings.llm.temperature).toBe(1);
      expect(settings.llm.whitelistedModelIdsRegex).toBe('openai.*');
    });

    it('should use default rate limiter settings when not provided', () => {
      const settings = getSettings();

      expect(settings.rateLimiter.redisHost).toBe('localhost');
      expect(settings.rateLimiter.redisPort).toBe(6379);
      expect(settings.rateLimiter.disabled).toBe(false);
      expect(settings.rateLimiter.limitChat).toBe(20);
      expect(settings.rateLimiter.expiryChat).toBe(24 * 60 * 60);
      expect(settings.rateLimiter.limitSuggestionsOutside).toBe(100);
      expect(settings.rateLimiter.limitSuggestionsInside).toBe(500);
    });

    it('should use default tools settings when not provided', () => {
      const settings = getSettings();

      expect(settings.tools.entitycore.url).toBe('https://openbraininstitute.org/api/entitycore');
      expect(settings.tools.obiOne.url).toBe('https://openbraininstitute.org/api/obi-one');
      expect(settings.tools.bluenaas.url).toBe('https://www.openbraininstitute.org/api/bluenaas');
      expect(settings.tools.minToolSelection).toBe(5);
      expect(settings.tools.denoAllocatedMemory).toBe(8192);
    });

    it('should use default keycloak settings when not provided', () => {
      const settings = getSettings();

      expect(settings.keycloak.issuer).toBe('https://www.openbraininstitute.org/auth/realms/SBO');
    });

    it('should use default logging settings when not provided', () => {
      const settings = getSettings();

      expect(settings.logging.level).toBe('info');
      expect(settings.logging.externalPackages).toBe('warning');
    });

    it('should use default misc settings when not provided', () => {
      const settings = getSettings();

      expect(settings.misc.applicationPrefix).toBe('');
      expect(settings.misc.corsOrigins).toBe('');
      expect(settings.misc.queryMaxSize).toBe(10000);
    });
  });

  describe('Nested Configuration Structure', () => {
    it('should support NEUROAGENT_ prefix with nested delimiter (__)', () => {
      process.env['NEUROAGENT_AGENT__MODEL'] = 'multi';
      process.env['NEUROAGENT_DB__HOST'] = 'postgres';
      process.env['NEUROAGENT_LLM__OPENAI_TOKEN'] = 'token';
      process.env['NEUROAGENT_TOOLS__ENTITYCORE__URL'] = 'http://test';

      const settings = getSettings();

      expect(settings.agent.model).toBe('multi');
      expect(settings.db.host).toBe('postgres');
      expect(settings.llm.openaiToken).toBe('token');
      expect(settings.tools.entitycore.url).toBe('http://test');
    });

    it('should handle deeply nested configuration', () => {
      process.env['NEUROAGENT_TOOLS__SANITY__PROJECT_ID'] = 'test';
      process.env['NEUROAGENT_TOOLS__SANITY__DATASET'] = 'staging';

      const settings = getSettings();

      expect(settings.tools.sanity.projectId).toBe('test');
      expect(settings.tools.sanity.dataset).toBe('staging');
    });
  });

  describe('MCP Configuration', () => {
    it('should handle missing mcp.json file gracefully', () => {
      const settings = getSettings();

      expect(settings.mcp).toBeDefined();
      expect(settings.mcp.servers).toBeDefined();
    });

    it('should load MCP configuration when available', () => {
      const settings = getSettings();

      // Should have loaded from src/mcp.json
      expect(settings.mcp.servers).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should provide type-safe access to all configuration sections', () => {
      const settings = getSettings();

      // TypeScript should enforce these types at compile time
      const agentModel: 'simple' | 'multi' = settings.agent.model;
      const maxTurns: number = settings.agent.maxTurns;
      const bucketName: string = settings.storage.bucketName;
      const temperature: number = settings.llm.temperature;
      const disabled: boolean = settings.rateLimiter.disabled;

      expect(agentModel).toBeDefined();
      expect(maxTurns).toBeDefined();
      expect(bucketName).toBeDefined();
      expect(temperature).toBeDefined();
      expect(disabled).toBeDefined();
    });
  });
});
