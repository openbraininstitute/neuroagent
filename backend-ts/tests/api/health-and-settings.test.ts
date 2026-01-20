/**
 * Tests for Health Check and Settings API Routes
 *
 * Tests the /healthz, /, and /settings endpoints.
 * Matches Python backend format.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock settings - must be defined before imports that use it
vi.mock('@/lib/config/settings', () => ({
  getCachedSettings: vi.fn().mockReturnValue({
    agent: {
      model: 'simple',
      maxTurns: 10,
      maxParallelToolCalls: 10,
    },
    storage: {
      bucketName: 'neuroagent',
      expiresIn: 600,
    },
    db: {
      host: 'localhost',
      port: '5432',
      name: 'neuroagent',
    },
    keycloak: {
      issuer: 'https://www.openbraininstitute.org/auth/realms/SBO',
      userInfoEndpoint:
        'https://www.openbraininstitute.org/auth/realms/SBO/protocol/openid-connect/userinfo',
    },
    tools: {
      obiOne: {
        url: 'https://openbraininstitute.org/api/obi-one',
      },
      bluenaas: {
        url: 'https://www.openbraininstitute.org/api/bluenaas',
      },
      entitycore: {
        url: 'https://openbraininstitute.org/api/entitycore',
      },
      sanity: {
        projectId: 'fgi7eh1v',
        dataset: 'staging',
        version: 'v2025-02-19',
        url: 'https://fgi7eh1v.api.sanity.io/v2025-02-19/data/query/staging',
      },
      thumbnailGeneration: {
        url: 'https://openbraininstitute.org/api/thumbnail-generation',
      },
      frontendBaseUrl: 'https://openbraininstitute.org',
      minToolSelection: 5,
      denoAllocatedMemory: 8192,
    },
    llm: {
      suggestionModel: 'gpt-5-nano',
      defaultChatModel: 'gpt-5-mini',
      defaultChatReasoning: 'low',
      temperature: 1,
      whitelistedModelIdsRegex: 'openai.*',
    },
    logging: {
      level: 'info',
      externalPackages: 'warning',
    },
    misc: {
      applicationPrefix: '',
      corsOrigins: '',
      queryMaxSize: 10000,
    },
    rateLimiter: {
      redisHost: 'localhost',
      redisPort: 6379,
      redisSsl: false,
      disabled: false,
      limitChat: 20,
      expiryChat: 86400,
      limitSuggestionsOutside: 100,
      limitSuggestionsInside: 500,
      expirySuggestions: 86400,
      limitTitle: 10,
      expiryTitle: 86400,
    },
    accounting: {
      disabled: true,
    },
    mcp: {
      servers: {},
    },
  }),
  getSettings: vi.fn().mockReturnValue({
    agent: {
      model: 'simple',
      maxTurns: 10,
      maxParallelToolCalls: 10,
    },
    storage: {
      bucketName: 'neuroagent',
      expiresIn: 600,
    },
    db: {
      host: 'localhost',
      port: '5432',
      name: 'neuroagent',
    },
    keycloak: {
      issuer: 'https://www.openbraininstitute.org/auth/realms/SBO',
      userInfoEndpoint:
        'https://www.openbraininstitute.org/auth/realms/SBO/protocol/openid-connect/userinfo',
    },
    tools: {
      obiOne: {
        url: 'https://openbraininstitute.org/api/obi-one',
      },
      bluenaas: {
        url: 'https://www.openbraininstitute.org/api/bluenaas',
      },
      entitycore: {
        url: 'https://openbraininstitute.org/api/entitycore',
      },
      sanity: {
        projectId: 'fgi7eh1v',
        dataset: 'staging',
        version: 'v2025-02-19',
        url: 'https://fgi7eh1v.api.sanity.io/v2025-02-19/data/query/staging',
      },
      thumbnailGeneration: {
        url: 'https://openbraininstitute.org/api/thumbnail-generation',
      },
      frontendBaseUrl: 'https://openbraininstitute.org',
      minToolSelection: 5,
      denoAllocatedMemory: 8192,
    },
    llm: {
      suggestionModel: 'gpt-5-nano',
      defaultChatModel: 'gpt-5-mini',
      defaultChatReasoning: 'low',
      temperature: 1,
      whitelistedModelIdsRegex: 'openai.*',
    },
    logging: {
      level: 'info',
      externalPackages: 'warning',
    },
    misc: {
      applicationPrefix: '',
      corsOrigins: '',
      queryMaxSize: 10000,
    },
    rateLimiter: {
      redisHost: 'localhost',
      redisPort: 6379,
      redisSsl: false,
      disabled: false,
      limitChat: 20,
      expiryChat: 86400,
      limitSuggestionsOutside: 100,
      limitSuggestionsInside: 500,
      expirySuggestions: 86400,
      limitTitle: 10,
      expiryTitle: 86400,
    },
    accounting: {
      disabled: true,
    },
    mcp: {
      servers: {},
    },
  }),
}));

import { GET as healthzGET } from '@/app/api/healthz/route';
import { GET as readyzGET } from '@/app/api/route';
import { GET as settingsGET } from '@/app/api/settings/route';

describe('GET /healthz', () => {
  it('should return 200 status', async () => {
    const response = await healthzGET();

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe('200');
  });

  it('should return text/plain content type', async () => {
    const response = await healthzGET();

    expect(response.headers.get('Content-Type')).toBe('text/plain');
  });
});

describe('GET / (readyz)', () => {
  it('should return status ok', async () => {
    const response = await readyzGET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: 'ok' });
  });

  it('should return JSON response', async () => {
    const response = await readyzGET();

    const body = await response.json();
    expect(typeof body).toBe('object');
    expect(body.status).toBe('ok');
  });
});

describe('GET /settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return complete settings', async () => {
    const response = await settingsGET();

    expect(response.status).toBe(200);
    const body = await response.json();

    // Verify the structure matches what we expect
    expect(body).toHaveProperty('agent');
    expect(body).toHaveProperty('storage');
    expect(body).toHaveProperty('db');
  });

  it('should return settings with all required sections', async () => {
    const response = await settingsGET();

    const body = await response.json();
    expect(body).toHaveProperty('agent');
    expect(body).toHaveProperty('storage');
    expect(body).toHaveProperty('db');
    expect(body).toHaveProperty('keycloak');
    expect(body).toHaveProperty('tools');
    expect(body).toHaveProperty('llm');
    expect(body).toHaveProperty('logging');
    expect(body).toHaveProperty('misc');
    expect(body).toHaveProperty('rateLimiter');
    expect(body).toHaveProperty('accounting');
    expect(body).toHaveProperty('mcp');
  });

  it('should handle settings loading errors', async () => {
    // Mock getCachedSettings to throw an error
    const { getCachedSettings } = await import('@/lib/config/settings');
    vi.mocked(getCachedSettings).mockImplementationOnce(() => {
      throw new Error('Configuration error');
    });

    const response = await settingsGET();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toBe('Configuration Error');
  });
});
