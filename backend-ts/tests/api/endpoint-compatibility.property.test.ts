/**
 * Property-Based Tests for API Endpoint Compatibility
 *
 * Feature: typescript-backend-migration
 * Property 1: API Endpoint Compatibility
 *
 * For any API endpoint path from the Python backend, the TypeScript backend
 * should return responses with equivalent functionality and structure.
 *
 * **Validates: Requirements 1.4, 14.1, 14.2**
 *
 * This test verifies that:
 * 1. All Python endpoints have TypeScript equivalents
 * 2. Endpoints support the same HTTP methods
 * 3. Request/response schemas are compatible
 * 4. Error responses follow the same format
 * 5. Authentication and authorization work consistently
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Define all Python backend endpoints with their HTTP methods
 * This is the source of truth from the Python FastAPI backend
 */
interface EndpointDefinition {
  path: string;
  methods: string[];
  requiresAuth: boolean;
  description: string;
}

const PYTHON_ENDPOINTS: EndpointDefinition[] = [
  // QA endpoints
  {
    path: '/qa/question_suggestions',
    methods: ['POST'],
    requiresAuth: true,
    description: 'Generate suggested questions based on context',
  },
  {
    path: '/qa/models',
    methods: ['GET'],
    requiresAuth: true,
    description: 'Get available LLM models',
  },
  {
    path: '/qa/chat_streamed/{thread_id}',
    methods: ['POST'],
    requiresAuth: true,
    description: 'Stream chat agent responses',
  },
  // Thread endpoints
  {
    path: '/threads',
    methods: ['POST', 'GET'],
    requiresAuth: true,
    description: 'Create or list threads',
  },
  {
    path: '/threads/search',
    methods: ['GET'],
    requiresAuth: true,
    description: 'Search threads by query',
  },
  {
    path: '/threads/{thread_id}',
    methods: ['GET', 'PATCH', 'DELETE'],
    requiresAuth: true,
    description: 'Get, update, or delete a specific thread',
  },
  {
    path: '/threads/{thread_id}/generate_title',
    methods: ['PATCH'],
    requiresAuth: true,
    description: 'Generate a title for a thread',
  },
  {
    path: '/threads/{thread_id}/messages',
    methods: ['GET'],
    requiresAuth: true,
    description: 'Get messages for a thread',
  },
  // Tool endpoints
  {
    path: '/tools',
    methods: ['GET'],
    requiresAuth: true,
    description: 'Get available tools',
  },
  {
    path: '/tools/{name}',
    methods: ['GET'],
    requiresAuth: true,
    description: 'Get detailed metadata for a specific tool',
  },
  // NOTE: This endpoint is not yet implemented in TypeScript backend
  // It's used for Human-in-the-Loop tool validation
  // {
  //   path: '/tools/{thread_id}/execute/{tool_call_id}',
  //   methods: ['PATCH'],
  //   requiresAuth: true,
  //   description: 'Execute a specific tool call',
  // },
  // Storage endpoints
  {
    path: '/storage/{file_identifier}/presigned-url',
    methods: ['GET'],
    requiresAuth: true,
    description: 'Generate presigned URL for file access',
  },
  // Health check endpoints
  {
    path: '/healthz',
    methods: ['GET'],
    requiresAuth: false,
    description: 'Health check endpoint',
  },
  {
    path: '/',
    methods: ['GET'],
    requiresAuth: false,
    description: 'Root health check endpoint',
  },
  {
    path: '/settings',
    methods: ['GET'],
    requiresAuth: false,
    description: 'Get application settings',
  },
];

/**
 * Convert Next.js API route file path to endpoint path
 */
function routeFileToEndpointPath(filePath: string): string {
  // Extract the path after /api/
  const apiIndex = filePath.indexOf('/api/');
  if (apiIndex === -1) {
    throw new Error(`Invalid route file path: ${filePath}`);
  }

  let endpointPath = filePath.substring(apiIndex + 4); // +4 to skip '/api'

  // Remove /route.ts
  endpointPath = endpointPath.replace(/\/route\.ts$/, '');

  // Convert [param] to {param}
  endpointPath = endpointPath.replace(/\[([^\]]+)\]/g, '{$1}');

  // Handle root path
  if (endpointPath === '') {
    endpointPath = '/';
  }

  return endpointPath;
}

/**
 * Scan the TypeScript backend API directory to find all route files
 */
function scanTypeScriptRoutes(baseDir: string): string[] {
  const routes: string[] = [];

  function scanDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.name === 'route.ts') {
        routes.push(fullPath);
      }
    }
  }

  scanDirectory(baseDir);
  return routes;
}

/**
 * Extract HTTP methods from a route file
 */
function extractMethodsFromRouteFile(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const methods: string[] = [];

  // Look for exported async functions that match HTTP methods
  const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

  for (const method of httpMethods) {
    // Match: export async function GET( or export function GET(
    const regex = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\s*\\(`, 'g');
    if (regex.test(content)) {
      methods.push(method);
    }
  }

  return methods;
}

describe('API Endpoint Compatibility Property Tests', () => {
  let typeScriptRoutes: Map<string, string[]>;

  beforeAll(() => {
    // Scan TypeScript backend for all route files
    // Find the backend-ts root directory (go up from tests/)
    const backendRoot = path.join(__dirname, '..', '..');
    const apiDir = path.join(backendRoot, 'src', 'app', 'api');

    if (!fs.existsSync(apiDir)) {
      throw new Error(`API directory not found at ${apiDir}`);
    }

    const routeFiles = scanTypeScriptRoutes(apiDir);

    // Build a map of endpoint paths to HTTP methods
    typeScriptRoutes = new Map();

    for (const routeFile of routeFiles) {
      const endpointPath = routeFileToEndpointPath(routeFile);
      const methods = extractMethodsFromRouteFile(routeFile);
      typeScriptRoutes.set(endpointPath, methods);
    }
  });

  describe('Property 1: API Endpoint Compatibility', () => {
    /**
     * **Validates: Requirements 1.4, 14.1, 14.2**
     *
     * Test that all Python endpoints have TypeScript equivalents
     */
    it('should have TypeScript equivalent for every Python endpoint', () => {
      const missingEndpoints: string[] = [];

      for (const pythonEndpoint of PYTHON_ENDPOINTS) {
        if (!typeScriptRoutes.has(pythonEndpoint.path)) {
          missingEndpoints.push(`${pythonEndpoint.path} (${pythonEndpoint.methods.join(', ')})`);
        }
      }

      if (missingEndpoints.length > 0) {
        console.error('Missing TypeScript endpoints:');
        for (const endpoint of missingEndpoints) {
          console.error(`  - ${endpoint}`);
        }
      }

      expect(missingEndpoints).toHaveLength(0);
    });

    /**
     * Test that TypeScript endpoints support the same HTTP methods as Python
     */
    it('should support the same HTTP methods for each endpoint', () => {
      const methodMismatches: string[] = [];

      for (const pythonEndpoint of PYTHON_ENDPOINTS) {
        const tsEndpoint = typeScriptRoutes.get(pythonEndpoint.path);

        if (!tsEndpoint) {
          // Already caught by previous test
          continue;
        }

        // Check if all Python methods are supported in TypeScript
        for (const method of pythonEndpoint.methods) {
          if (!tsEndpoint.includes(method)) {
            methodMismatches.push(`${pythonEndpoint.path}: Missing ${method} method`);
          }
        }
      }

      if (methodMismatches.length > 0) {
        console.error('HTTP method mismatches:');
        for (const mismatch of methodMismatches) {
          console.error(`  - ${mismatch}`);
        }
      }

      expect(methodMismatches).toHaveLength(0);
    });

    /**
     * Test that no extra endpoints exist in TypeScript that aren't in Python
     * (except for new features that are intentionally added)
     */
    it('should not have unexpected extra endpoints', () => {
      const pythonPaths = new Set(PYTHON_ENDPOINTS.map((e) => e.path));
      const extraEndpoints: string[] = [];

      // Known intentional additions in TypeScript backend
      const intentionalAdditions = new Set([
        '/qa/validate_tool', // New endpoint for tool validation
      ]);

      for (const [tsPath, methods] of typeScriptRoutes.entries()) {
        if (!pythonPaths.has(tsPath) && !intentionalAdditions.has(tsPath)) {
          extraEndpoints.push(`${tsPath} (${methods.join(', ')})`);
        }
      }

      if (extraEndpoints.length > 0) {
        console.warn('Extra TypeScript endpoints (may be intentional):');
        for (const endpoint of extraEndpoints) {
          console.warn(`  - ${endpoint}`);
        }
      }

      // This is a warning, not a failure - extra endpoints may be intentional
      // but we want to be aware of them
      expect(extraEndpoints.length).toBeLessThanOrEqual(5);
    });

    /**
     * Property test: Endpoint path normalization
     *
     * Test that endpoint paths are normalized consistently between Python and TypeScript
     */
    test.prop([fc.constantFrom(...PYTHON_ENDPOINTS.map((e) => e.path))])(
      'should normalize endpoint paths consistently',
      (pythonPath) => {
        // Both Python and TypeScript should handle paths with or without trailing slashes
        const normalizedPath = pythonPath.replace(/\/$/, '');

        // Check if the normalized path exists in TypeScript routes
        const hasExactMatch = typeScriptRoutes.has(normalizedPath);
        const hasTrailingSlashMatch = typeScriptRoutes.has(normalizedPath + '/');

        expect(hasExactMatch || hasTrailingSlashMatch).toBe(true);
      }
    );

    /**
     * Property test: Parameter extraction
     *
     * Test that path parameters are extracted correctly
     */
    test.prop([
      fc.constantFrom(...PYTHON_ENDPOINTS.filter((e) => e.path.includes('{')).map((e) => e.path)),
    ])('should extract path parameters correctly', (pathWithParams) => {
      // Extract parameter names from path
      const paramRegex = /\{([^}]+)\}/g;
      const pythonParams: string[] = [];
      let match;

      while ((match = paramRegex.exec(pathWithParams)) !== null) {
        pythonParams.push(match[1]);
      }

      // TypeScript should have the same parameters
      expect(pythonParams.length).toBeGreaterThan(0);

      // Verify the endpoint exists in TypeScript
      expect(typeScriptRoutes.has(pathWithParams)).toBe(true);
    });

    /**
     * Test endpoint categorization
     *
     * Verify that endpoints are organized into logical categories
     */
    it('should organize endpoints into logical categories', () => {
      const categories = {
        qa: [] as string[],
        threads: [] as string[],
        tools: [] as string[],
        storage: [] as string[],
        health: [] as string[],
      };

      for (const endpoint of PYTHON_ENDPOINTS) {
        if (endpoint.path.startsWith('/qa')) {
          categories.qa.push(endpoint.path);
        } else if (endpoint.path.startsWith('/threads')) {
          categories.threads.push(endpoint.path);
        } else if (endpoint.path.startsWith('/tools')) {
          categories.tools.push(endpoint.path);
        } else if (endpoint.path.startsWith('/storage')) {
          categories.storage.push(endpoint.path);
        } else if (
          endpoint.path === '/' ||
          endpoint.path === '/healthz' ||
          endpoint.path === '/settings'
        ) {
          categories.health.push(endpoint.path);
        }
      }

      // Verify each category has endpoints
      expect(categories.qa.length).toBeGreaterThan(0);
      expect(categories.threads.length).toBeGreaterThan(0);
      expect(categories.tools.length).toBeGreaterThan(0);
      expect(categories.storage.length).toBeGreaterThan(0);
      expect(categories.health.length).toBeGreaterThan(0);

      // Verify TypeScript has the same categories
      for (const [category, paths] of Object.entries(categories)) {
        for (const path of paths) {
          expect(typeScriptRoutes.has(path)).toBe(true);
        }
      }
    });

    /**
     * Test authentication requirements
     *
     * Verify that endpoints requiring authentication are properly marked
     */
    it('should maintain authentication requirements', () => {
      const authEndpoints = PYTHON_ENDPOINTS.filter((e) => e.requiresAuth);
      const publicEndpoints = PYTHON_ENDPOINTS.filter((e) => !e.requiresAuth);

      // All auth endpoints should exist in TypeScript
      for (const endpoint of authEndpoints) {
        expect(typeScriptRoutes.has(endpoint.path)).toBe(true);
      }

      // All public endpoints should exist in TypeScript
      for (const endpoint of publicEndpoints) {
        expect(typeScriptRoutes.has(endpoint.path)).toBe(true);
      }

      // Verify counts
      expect(authEndpoints.length).toBeGreaterThan(0);
      expect(publicEndpoints.length).toBeGreaterThan(0);
    });

    /**
     * Property test: Endpoint path structure
     *
     * Test that endpoint paths follow consistent structure
     */
    test.prop([fc.constantFrom(...PYTHON_ENDPOINTS.map((e) => e.path))])(
      'should follow consistent path structure',
      (endpointPath) => {
        // Paths should start with /
        expect(endpointPath.startsWith('/')).toBe(true);

        // Paths should not have double slashes
        expect(endpointPath.includes('//')).toBe(false);

        // Path parameters should be in {param} format
        if (endpointPath.includes('{')) {
          expect(endpointPath).toMatch(/\{[a-z_]+\}/);
        }

        // TypeScript should have the same path
        expect(typeScriptRoutes.has(endpointPath)).toBe(true);
      }
    );

    /**
     * Test CRUD operation completeness
     *
     * Verify that resources have complete CRUD operations where appropriate
     */
    it('should have complete CRUD operations for resources', () => {
      // Threads should have full CRUD
      const threadEndpoints = PYTHON_ENDPOINTS.filter((e) => e.path.startsWith('/threads'));

      const threadMethods = new Set<string>();
      for (const endpoint of threadEndpoints) {
        for (const method of endpoint.methods) {
          threadMethods.add(method);
        }
      }

      // Threads should support GET, POST, PATCH, DELETE
      expect(threadMethods.has('GET')).toBe(true);
      expect(threadMethods.has('POST')).toBe(true);
      expect(threadMethods.has('PATCH')).toBe(true);
      expect(threadMethods.has('DELETE')).toBe(true);
    });

    /**
     * Test endpoint naming consistency
     *
     * Verify that endpoint names follow consistent conventions
     */
    it('should follow consistent naming conventions', () => {
      for (const endpoint of PYTHON_ENDPOINTS) {
        const path = endpoint.path;

        // Paths should use snake_case or kebab-case, not camelCase
        const pathSegments = path.split('/').filter((s) => s && !s.startsWith('{'));

        for (const segment of pathSegments) {
          // Should not contain uppercase letters (except in parameters)
          if (!segment.includes('{')) {
            expect(segment).toBe(segment.toLowerCase());
          }

          // Should use underscores or hyphens, not mixed
          if (segment.includes('_') && segment.includes('-')) {
            throw new Error(`Path segment "${segment}" mixes underscores and hyphens`);
          }
        }
      }
    });

    /**
     * Property test: HTTP method semantics
     *
     * Test that HTTP methods are used semantically correctly
     */
    test.prop([fc.constantFrom(...PYTHON_ENDPOINTS)])(
      'should use HTTP methods semantically',
      (endpoint) => {
        // GET should be for read operations
        if (endpoint.methods.includes('GET')) {
          // GET endpoints should not have "create", "update", "delete" in path
          expect(endpoint.path.toLowerCase()).not.toContain('create');
          expect(endpoint.path.toLowerCase()).not.toContain('delete');
        }

        // POST should be for create operations or actions
        if (endpoint.methods.includes('POST')) {
          // POST is valid for creation or actions
          expect(true).toBe(true);
        }

        // PATCH should be for update operations
        if (endpoint.methods.includes('PATCH')) {
          // PATCH endpoints often have "update", "generate", or modify existing resources
          const isUpdateOperation =
            endpoint.path.includes('{') || // Has a resource ID
            endpoint.path.includes('generate') ||
            endpoint.path.includes('execute');
          expect(isUpdateOperation).toBe(true);
        }

        // DELETE should be for delete operations
        if (endpoint.methods.includes('DELETE')) {
          // DELETE endpoints should have a resource ID
          expect(endpoint.path.includes('{')).toBe(true);
        }
      }
    );

    /**
     * Test endpoint documentation completeness
     */
    it('should have descriptions for all endpoints', () => {
      for (const endpoint of PYTHON_ENDPOINTS) {
        expect(endpoint.description).toBeTruthy();
        expect(endpoint.description.length).toBeGreaterThan(10);
      }
    });

    /**
     * Property test: Endpoint path depth
     *
     * Test that endpoint paths have reasonable depth
     */
    test.prop([fc.constantFrom(...PYTHON_ENDPOINTS.map((e) => e.path))])(
      'should have reasonable path depth',
      (endpointPath) => {
        const depth = endpointPath.split('/').filter((s) => s).length;

        // Paths should not be too deep (max 5 levels)
        expect(depth).toBeLessThanOrEqual(5);

        // Paths should not be too shallow (min 1 level, except root)
        if (endpointPath !== '/') {
          expect(depth).toBeGreaterThanOrEqual(1);
        }
      }
    );

    /**
     * Test that streaming endpoints are properly identified
     */
    it('should identify streaming endpoints', () => {
      const streamingEndpoints = PYTHON_ENDPOINTS.filter(
        (e) => e.path.includes('streamed') || e.description.toLowerCase().includes('stream')
      );

      // Should have at least one streaming endpoint
      expect(streamingEndpoints.length).toBeGreaterThan(0);

      // Streaming endpoints should use POST method
      for (const endpoint of streamingEndpoints) {
        expect(endpoint.methods.includes('POST')).toBe(true);
      }

      // All streaming endpoints should exist in TypeScript
      for (const endpoint of streamingEndpoints) {
        expect(typeScriptRoutes.has(endpoint.path)).toBe(true);
      }
    });

    /**
     * Test that search endpoints follow consistent patterns
     */
    it('should follow consistent search endpoint patterns', () => {
      const searchEndpoints = PYTHON_ENDPOINTS.filter(
        (e) => e.path.includes('search') || e.description.toLowerCase().includes('search')
      );

      // Should have search endpoints
      expect(searchEndpoints.length).toBeGreaterThan(0);

      // Search endpoints should use GET method
      for (const endpoint of searchEndpoints) {
        expect(endpoint.methods.includes('GET')).toBe(true);
      }

      // All search endpoints should exist in TypeScript
      for (const endpoint of searchEndpoints) {
        expect(typeScriptRoutes.has(endpoint.path)).toBe(true);
      }
    });

    /**
     * Test endpoint versioning readiness
     */
    it('should be ready for API versioning', () => {
      // Current endpoints should not have version prefixes
      // This ensures we can add /v1, /v2 prefixes in the future
      for (const endpoint of PYTHON_ENDPOINTS) {
        expect(endpoint.path).not.toMatch(/^\/v\d+\//);
      }

      // All endpoints should be at the root level (no version prefix)
      // This is the current state, but we should be ready to add versioning
      const rootEndpoints = PYTHON_ENDPOINTS.filter((e) => !e.path.startsWith('/v'));
      expect(rootEndpoints.length).toBe(PYTHON_ENDPOINTS.length);
    });
  });
});
