/**
 * Vitest setup file
 *
 * This file runs before all tests and sets up the testing environment.
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// CRITICAL: Mock OpenAI SDK globally to prevent ANY real API calls
// This ensures no test can accidentally make real API calls to OpenAI
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => vi.fn(() => 'mocked-openai-model')),
}));

// Mock OpenRouter SDK globally
vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => vi.fn(() => 'mocked-openrouter-model')),
}));

// Setup runs before all tests
beforeAll(() => {
  // Set test environment variables
  process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/neuroagent_test';
});

// Cleanup after each test
afterEach(() => {
  // Clear any mocks or test data
});

// Cleanup after all tests
afterAll(() => {
  // Close any open connections
});
