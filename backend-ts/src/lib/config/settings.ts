/**
 * Configuration management system using Zod for type-safe environment variable validation.
 * Matches the Python Settings structure with nested configuration.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { z } from 'zod';

// ============================================================================
// Zod Schemas for Configuration Validation
// ============================================================================

/**
 * Agent configuration schema
 */
const SettingsAgentSchema = z.object({
  model: z.enum(['simple', 'multi']).default('simple'),
  maxTurns: z.number().int().default(10),
  maxParallelToolCalls: z.number().int().default(10),
});

/**
 * Storage configuration schema (MinIO/S3)
 */
const SettingsStorageSchema = z.object({
  endpointUrl: z.string().optional(),
  bucketName: z.string().default('neuroagent'),
  accessKey: z.string().optional(),
  secretKey: z.string().optional(),
  expiresIn: z.number().int().default(600),
});

/**
 * Database configuration schema
 */
const SettingsDBSchema = z.object({
  prefix: z.string().optional(),
  user: z.string().optional(),
  password: z.string().optional(),
  host: z.string().optional(),
  port: z.string().optional(),
  name: z.string().optional(),
});

/**
 * Keycloak authentication configuration schema
 */
const SettingsKeycloakSchema = z
  .object({
    issuer: z.string().default('https://www.openbraininstitute.org/auth/realms/SBO'),
  })
  .transform((data) => ({
    ...data,
    userInfoEndpoint: `${data.issuer}/protocol/openid-connect/userinfo`,
  }));

/**
 * Thumbnail Generation service configuration schema
 */
const SettingsThumbnailGenerationSchema = z.object({
  url: z.string().default('https://openbraininstitute.org/api/thumbnail-generation'),
});

/**
 * OBI-One service configuration schema
 */
const SettingsObiOneSchema = z.object({
  url: z.string().default('https://openbraininstitute.org/api/obi-one'),
});

/**
 * BlueNaaS service configuration schema
 */
const SettingsBlueNaaSSchema = z.object({
  url: z.string().default('https://www.openbraininstitute.org/api/bluenaas'),
});

/**
 * EntityCore service configuration schema
 */
const SettingsEntityCoreSchema = z.object({
  url: z.string().default('https://openbraininstitute.org/api/entitycore'),
});

/**
 * Sanity CMS configuration schema
 */
const SettingsSanitySchema = z
  .object({
    projectId: z.string().default('fgi7eh1v'),
    dataset: z.enum(['staging', 'production']).default('staging'),
    version: z.string().default('v2025-02-19'),
  })
  .transform((data) => ({
    ...data,
    url: `https://${data.projectId}.api.sanity.io/${data.version}/data/query/${data.dataset}`,
  }));

/**
 * Tools configuration schema
 */
const SettingsToolsSchema = z.object({
  obiOne: SettingsObiOneSchema.default({}),
  bluenaas: SettingsBlueNaaSSchema.default({}),
  entitycore: SettingsEntityCoreSchema.default({}),
  sanity: SettingsSanitySchema.default({}),
  thumbnailGeneration: SettingsThumbnailGenerationSchema.default({}),
  frontendBaseUrl: z.string().default('https://openbraininstitute.org'),
  minToolSelection: z.number().int().min(0).default(5),
  whitelistedToolRegex: z.string().optional(),
  denoAllocatedMemory: z.number().int().default(8192),
  exaApiKey: z.string().optional(),
});

/**
 * LLM configuration schema
 */
const SettingsLLMSchema = z.object({
  openaiToken: z.string().optional(),
  openaiBaseUrl: z.string().optional(),
  openRouterToken: z.string().optional(),
  suggestionModel: z.string().default('gpt-5-nano'),
  defaultChatModel: z.string().default('gpt-5-mini'),
  defaultChatReasoning: z.string().default('low'),
  temperature: z.number().default(1),
  maxTokens: z.number().int().optional(),
  whitelistedModelIdsRegex: z.string().default('openai.*'),
});

/**
 * Logging configuration schema
 */
const SettingsLoggingSchema = z.object({
  level: z.enum(['debug', 'info', 'warning', 'error', 'critical']).default('info'),
  externalPackages: z.enum(['debug', 'info', 'warning', 'error', 'critical']).default('warning'),
});

/**
 * Miscellaneous configuration schema
 */
const SettingsMiscSchema = z.object({
  applicationPrefix: z.string().default(''),
  corsOrigins: z.string().default(''),
  queryMaxSize: z.number().int().default(10000),
});

/**
 * Rate limiter configuration schema
 */
const SettingsRateLimiterSchema = z.object({
  redisHost: z.string().default('localhost'),
  redisPort: z.number().int().default(6379),
  redisPassword: z.string().optional(),
  redisSsl: z.boolean().default(false),
  disabled: z.boolean().default(false),
  limitChat: z.number().int().default(20),
  expiryChat: z
    .number()
    .int()
    .default(24 * 60 * 60),
  limitSuggestionsOutside: z.number().int().default(100),
  limitSuggestionsInside: z.number().int().default(500),
  expirySuggestions: z
    .number()
    .int()
    .default(24 * 60 * 60),
  limitTitle: z.number().int().default(10),
  expiryTitle: z
    .number()
    .int()
    .default(24 * 60 * 60),
});

/**
 * Accounting configuration schema
 */
const SettingsAccountingSchema = z
  .object({
    baseUrl: z.string().optional(),
    disabled: z.boolean().default(false),
  })
  .transform((data) => {
    // Disable accounting if no base URL is provided
    if (!data.baseUrl) {
      return { ...data, disabled: true };
    }
    return data;
  });

/**
 * MCP tool metadata schema
 */
const MCPToolMetadataSchema = z.object({
  name: z.string().optional(),
  nameFrontend: z.string().optional(),
  description: z.string().optional(),
  descriptionFrontend: z.string().optional(),
  utterances: z.array(z.string()).optional(),
});

/**
 * MCP server configuration schema
 */
const MCPServerConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  toolMetadata: z.record(MCPToolMetadataSchema).optional(),
});

/**
 * MCP configuration schema
 */
const SettingsMCPSchema = z.object({
  servers: z.record(MCPServerConfigSchema).optional(),
  secrets: z.record(z.string()).optional(),
});

/**
 * Main settings schema
 */
const SettingsSchema = z.object({
  tools: SettingsToolsSchema.default({}),
  agent: SettingsAgentSchema.default({}),
  db: SettingsDBSchema.default({}),
  llm: SettingsLLMSchema.default({}),
  logging: SettingsLoggingSchema.default({}),
  keycloak: SettingsKeycloakSchema.default({}),
  misc: SettingsMiscSchema.default({}),
  storage: SettingsStorageSchema.default({}),
  rateLimiter: SettingsRateLimiterSchema.default({}),
  accounting: SettingsAccountingSchema.default({}),
  mcp: SettingsMCPSchema.default({}),
});

// ============================================================================
// Type Exports
// ============================================================================

export type Settings = z.infer<typeof SettingsSchema>;
export type SettingsAgent = z.infer<typeof SettingsAgentSchema>;
export type SettingsStorage = z.infer<typeof SettingsStorageSchema>;
export type SettingsDB = z.infer<typeof SettingsDBSchema>;
export type SettingsKeycloak = z.infer<typeof SettingsKeycloakSchema>;
export type SettingsTools = z.infer<typeof SettingsToolsSchema>;
export type SettingsLLM = z.infer<typeof SettingsLLMSchema>;
export type SettingsLogging = z.infer<typeof SettingsLoggingSchema>;
export type SettingsMisc = z.infer<typeof SettingsMiscSchema>;
export type SettingsRateLimiter = z.infer<typeof SettingsRateLimiterSchema>;
export type SettingsAccounting = z.infer<typeof SettingsAccountingSchema>;
export type SettingsMCP = z.infer<typeof SettingsMCPSchema>;
export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;
export type MCPToolMetadata = z.infer<typeof MCPToolMetadataSchema>;

// ============================================================================
// Environment Variable Parsing Utilities
// ============================================================================

/**
 * Parse environment variable with NEUROAGENT_ prefix and nested delimiter (__).
 * Example: NEUROAGENT_AGENT__MAX_TURNS -> agent.maxTurns
 */
function parseEnvVar(key: string, prefix: string = 'NEUROAGENT_'): string | undefined {
  return process.env[`${prefix}${key}`];
}

/**
 * Parse integer environment variable
 */
function parseEnvInt(key: string, defaultValue?: number): number | undefined {
  const value = parseEnvVar(key);
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse float environment variable
 */
function parseEnvFloat(key: string, defaultValue?: number): number | undefined {
  const value = parseEnvVar(key);
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse boolean environment variable
 */
function parseEnvBool(key: string, defaultValue?: boolean): boolean | undefined {
  const value = parseEnvVar(key);
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

// ============================================================================
// MCP Configuration Loading
// ============================================================================

/**
 * Load and parse MCP configuration from mcp.json file.
 * Replaces secret placeholders with actual values from environment.
 */
function loadMCPConfig(secrets?: Record<string, string>): SettingsMCP {
  try {
    // Read mcp.json file
    const mcpJsonPath = join(process.cwd(), 'src', 'mcp.json');
    let mcpContent = readFileSync(mcpJsonPath, 'utf-8');

    // Replace secret placeholders with actual values
    if (secrets) {
      for (const [key, value] of Object.entries(secrets)) {
        const placeholder = `NEUROAGENT_MCP__SECRETS__${key.toUpperCase()}`;
        mcpContent = mcpContent.replace(new RegExp(placeholder, 'g'), value || '');
      }
    }

    // Parse JSON
    const mcpServers = JSON.parse(mcpContent) as Record<string, unknown>;

    // Filter out servers with unresolved secrets
    const filteredServers: Record<string, unknown> = {};
    for (const [serverName, config] of Object.entries(mcpServers)) {
      const serverConfig = config as { env?: Record<string, string> };
      if (
        serverConfig.env &&
        Object.values(serverConfig.env).some((v) => v.includes('NEUROAGENT_MCP__SECRETS__'))
      ) {
        console.warn(
          `MCP server ${serverName} deactivated because some of its secrets were not provided.`
        );
        continue;
      }
      filteredServers[serverName] = config;
    }

    return { servers: filteredServers as Record<string, MCPServerConfig> };
  } catch {
    // If mcp.json doesn't exist or can't be parsed, return empty config
    console.warn('MCP configuration file not found or invalid, using empty config');
    return { servers: {} };
  }
}

// ============================================================================
// Settings Loader
// ============================================================================

/**
 * Load and validate all settings from environment variables.
 * Throws ZodError if validation fails.
 */
export function getSettings(): Settings {
  // Parse MCP secrets first
  const mcpSecrets: Record<string, string> = {};
  const secretPrefix = 'NEUROAGENT_MCP__SECRETS__';
  for (const key of Object.keys(process.env)) {
    if (key.startsWith(secretPrefix)) {
      const secretKey = key.substring(secretPrefix.length).toLowerCase();
      mcpSecrets[secretKey] = process.env[key] || '';
    }
  }

  // Load MCP configuration
  const mcpConfig = loadMCPConfig(mcpSecrets);

  // Build settings object from environment variables
  const settings = {
    agent: {
      model: parseEnvVar('AGENT__MODEL') as 'simple' | 'multi' | undefined,
      maxTurns: parseEnvInt('AGENT__MAX_TURNS'),
      maxParallelToolCalls: parseEnvInt('AGENT__MAX_PARALLEL_TOOL_CALLS'),
    },
    storage: {
      endpointUrl: parseEnvVar('STORAGE__ENDPOINT_URL'),
      bucketName: parseEnvVar('STORAGE__BUCKET_NAME'),
      accessKey: parseEnvVar('STORAGE__ACCESS_KEY'),
      secretKey: parseEnvVar('STORAGE__SECRET_KEY'),
      expiresIn: parseEnvInt('STORAGE__EXPIRES_IN'),
    },
    db: {
      prefix: parseEnvVar('DB__PREFIX'),
      user: parseEnvVar('DB__USER'),
      password: parseEnvVar('DB__PASSWORD'),
      host: parseEnvVar('DB__HOST'),
      port: parseEnvVar('DB__PORT'),
      name: parseEnvVar('DB__NAME'),
    },
    keycloak: {
      issuer: parseEnvVar('KEYCLOAK__ISSUER'),
    },
    tools: {
      obiOne: {
        url: parseEnvVar('TOOLS__OBI_ONE__URL'),
      },
      bluenaas: {
        url: parseEnvVar('TOOLS__BLUENAAS__URL'),
      },
      entitycore: {
        url: parseEnvVar('TOOLS__ENTITYCORE__URL'),
      },
      sanity: {
        projectId: parseEnvVar('TOOLS__SANITY__PROJECT_ID'),
        dataset: parseEnvVar('TOOLS__SANITY__DATASET') as 'staging' | 'production' | undefined,
        version: parseEnvVar('TOOLS__SANITY__VERSION'),
      },
      thumbnailGeneration: {
        url: parseEnvVar('TOOLS__THUMBNAIL_GENERATION__URL'),
      },
      frontendBaseUrl: parseEnvVar('TOOLS__FRONTEND_BASE_URL'),
      minToolSelection: parseEnvInt('TOOLS__MIN_TOOL_SELECTION'),
      whitelistedToolRegex: parseEnvVar('TOOLS__WHITELISTED_TOOL_REGEX'),
      denoAllocatedMemory: parseEnvInt('TOOLS__DENO_ALLOCATED_MEMORY'),
      exaApiKey: parseEnvVar('TOOLS__EXA_API_KEY'),
    },
    llm: {
      openaiToken: parseEnvVar('LLM__OPENAI_TOKEN'),
      openaiBaseUrl: parseEnvVar('LLM__OPENAI_BASE_URL'),
      openRouterToken: parseEnvVar('LLM__OPENROUTER_TOKEN'),
      suggestionModel: parseEnvVar('LLM__SUGGESTION_MODEL'),
      defaultChatModel: parseEnvVar('LLM__DEFAULT_CHAT_MODEL'),
      defaultChatReasoning: parseEnvVar('LLM__DEFAULT_CHAT_REASONING'),
      temperature: parseEnvFloat('LLM__TEMPERATURE'),
      maxTokens: parseEnvInt('LLM__MAX_TOKENS'),
      whitelistedModelIdsRegex: parseEnvVar('LLM__WHITELISTED_MODEL_IDS_REGEX'),
    },
    logging: {
      level: parseEnvVar('LOGGING__LEVEL') as
        | 'debug'
        | 'info'
        | 'warning'
        | 'error'
        | 'critical'
        | undefined,
      externalPackages: parseEnvVar('LOGGING__EXTERNAL_PACKAGES') as
        | 'debug'
        | 'info'
        | 'warning'
        | 'error'
        | 'critical'
        | undefined,
    },
    misc: {
      applicationPrefix: parseEnvVar('MISC__APPLICATION_PREFIX'),
      corsOrigins: parseEnvVar('MISC__CORS_ORIGINS'),
      queryMaxSize: parseEnvInt('MISC__QUERY_MAX_SIZE'),
    },
    rateLimiter: {
      redisHost: parseEnvVar('RATE_LIMITER__REDIS_HOST'),
      redisPort: parseEnvInt('RATE_LIMITER__REDIS_PORT'),
      redisPassword: parseEnvVar('RATE_LIMITER__REDIS_PASSWORD'),
      redisSsl: parseEnvBool('RATE_LIMITER__REDIS_SSL'),
      disabled: parseEnvBool('RATE_LIMITER__DISABLED'),
      limitChat: parseEnvInt('RATE_LIMITER__LIMIT_CHAT'),
      expiryChat: parseEnvInt('RATE_LIMITER__EXPIRY_CHAT'),
      limitSuggestionsOutside: parseEnvInt('RATE_LIMITER__LIMIT_SUGGESTIONS_OUTSIDE'),
      limitSuggestionsInside: parseEnvInt('RATE_LIMITER__LIMIT_SUGGESTIONS_INSIDE'),
      expirySuggestions: parseEnvInt('RATE_LIMITER__EXPIRY_SUGGESTIONS'),
      limitTitle: parseEnvInt('RATE_LIMITER__LIMIT_TITLE'),
      expiryTitle: parseEnvInt('RATE_LIMITER__EXPIRY_TITLE'),
    },
    accounting: {
      baseUrl: parseEnvVar('ACCOUNTING__BASE_URL'),
      disabled: parseEnvBool('ACCOUNTING__DISABLED'),
    },
    mcp: mcpConfig,
  };

  // Validate and return settings
  return SettingsSchema.parse(settings);
}

/**
 * Cached settings instance (singleton pattern)
 */
let cachedSettings: Settings | null = null;

/**
 * Get settings with caching. Settings are loaded once and cached.
 * Use this in production. For testing, use getSettings() directly.
 */
export function getCachedSettings(): Settings {
  if (!cachedSettings) {
    cachedSettings = getSettings();
  }
  return cachedSettings;
}

/**
 * Clear cached settings (useful for testing)
 */
export function clearSettingsCache(): void {
  cachedSettings = null;
}
