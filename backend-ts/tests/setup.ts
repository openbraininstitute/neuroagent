/**
 * Vitest setup file
 *
 * This file runs before all tests and sets up the testing environment.
 */

import { beforeAll, afterAll, afterEach } from 'vitest';

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
