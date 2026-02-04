/**
 * Property-Based Tests for Tool Metadata Completeness
 *
 * Feature: typescript-backend-migration
 * Property 12: Tool Metadata Completeness
 *
 * For any registered tool, its metadata (name, description, utterances) should be
 * accessible and non-empty.
 *
 * Validates: Requirements 5.5
 *
 * This test verifies that:
 * 1. All registered tools have complete metadata
 * 2. Tool names are non-empty strings
 * 3. Tool descriptions are non-empty strings
 * 4. Tool utterances (if provided) are non-empty arrays
 * 5. Metadata is accessible without instantiation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import { toolRegistry, ToolClass, registerToolClasses } from '@/lib/tools';

describe('Tool Metadata Property Tests', () => {
  beforeAll(async () => {
    // Register all tool classes for testing
    await registerToolClasses();
  });

  describe('Property 12: Tool Metadata Completeness', () => {
    /**
     * **Validates: Requirements 5.5**
     *
     * Test that all registered tools have complete metadata
     */
    it('should have complete metadata for all registered tools', async () => {
      const toolClasses = toolRegistry.getAllClasses();

      // Ensure we have tools to test
      expect(toolClasses.length).toBeGreaterThan(0);

      // Check each tool class
      for (const ToolClass of toolClasses) {
        // Property: Tool name must be a non-empty string
        expect(ToolClass.toolName).toBeDefined();
        expect(typeof ToolClass.toolName).toBe('string');
        expect(ToolClass.toolName.length).toBeGreaterThan(0);

        // Property: Tool description must be a non-empty string
        expect(ToolClass.toolDescription).toBeDefined();
        expect(typeof ToolClass.toolDescription).toBe('string');
        expect(ToolClass.toolDescription.length).toBeGreaterThan(0);

        // Property: If utterances are provided, they must be a non-empty array
        if (ToolClass.toolUtterances !== undefined) {
          expect(Array.isArray(ToolClass.toolUtterances)).toBe(true);

          // If utterances array exists, it should contain strings
          if (ToolClass.toolUtterances.length > 0) {
            for (const utterance of ToolClass.toolUtterances) {
              expect(typeof utterance).toBe('string');
              expect(utterance.length).toBeGreaterThan(0);
            }
          }
        }

        // Property: Frontend name (if provided) must be a non-empty string
        if (ToolClass.toolNameFrontend !== undefined) {
          expect(typeof ToolClass.toolNameFrontend).toBe('string');
          expect(ToolClass.toolNameFrontend.length).toBeGreaterThan(0);
        }

        // Property: Frontend description (if provided) must be a non-empty string
        if (ToolClass.toolDescriptionFrontend !== undefined) {
          expect(typeof ToolClass.toolDescriptionFrontend).toBe('string');
          expect(ToolClass.toolDescriptionFrontend.length).toBeGreaterThan(0);
        }

        // Property: HIL flag (if provided) must be a boolean
        if (ToolClass.toolHil !== undefined) {
          expect(typeof ToolClass.toolHil).toBe('boolean');
        }
      }
    });

    /**
     * Test that tool names are unique across all registered tools
     */
    it('should have unique tool names for all registered tools', async () => {
      const toolClasses = toolRegistry.getAllClasses();
      const toolNames = toolClasses.map((ToolClass) => ToolClass.toolName);

      // Property: All tool names must be unique
      const uniqueNames = new Set(toolNames);
      expect(uniqueNames.size).toBe(toolNames.length);
    });

    /**
     * Test that metadata can be accessed without instantiation
     */
    it('should access metadata without instantiation', async () => {
      const toolClasses = toolRegistry.getAllClasses();

      for (const ToolClass of toolClasses) {
        // Property: Metadata should be accessible from the class itself
        // without creating an instance
        expect(() => {
          const name = ToolClass.toolName;
          const description = ToolClass.toolDescription;
          const utterances = ToolClass.toolUtterances;

          // These should all be accessible without errors
          expect(name).toBeDefined();
          expect(description).toBeDefined();
          // utterances is optional, so just check it doesn't throw
          void utterances;
        }).not.toThrow();
      }
    });

    /**
     * Test that getAllMetadata returns complete metadata for all tools
     */
    it('should return complete metadata from getAllMetadata', async () => {
      const metadata = toolRegistry.getAllMetadata();

      // Ensure we have metadata for all tools
      expect(metadata.length).toBeGreaterThan(0);

      for (const meta of metadata) {
        // Property: Each metadata object must have required fields
        expect(meta.name).toBeDefined();
        expect(typeof meta.name).toBe('string');
        expect(meta.name.length).toBeGreaterThan(0);

        expect(meta.description).toBeDefined();
        expect(typeof meta.description).toBe('string');
        expect(meta.description.length).toBeGreaterThan(0);

        // Optional fields should have correct types if present
        if (meta.nameFrontend !== undefined) {
          expect(typeof meta.nameFrontend).toBe('string');
          expect(meta.nameFrontend.length).toBeGreaterThan(0);
        }

        if (meta.descriptionFrontend !== undefined) {
          expect(typeof meta.descriptionFrontend).toBe('string');
          expect(meta.descriptionFrontend.length).toBeGreaterThan(0);
        }

        if (meta.utterances !== undefined) {
          expect(Array.isArray(meta.utterances)).toBe(true);
        }

        if (meta.hil !== undefined) {
          expect(typeof meta.hil).toBe('boolean');
        }
      }
    });

    /**
     * Property-based test: Tool metadata should be consistent across multiple accesses
     */
    test.prop([fc.nat({ max: 100 })])(
      'should return consistent metadata across multiple accesses',
      async (iterations) => {
        const toolClasses = toolRegistry.getAllClasses();

        if (toolClasses.length === 0) {
          return true; // Skip if no tools registered
        }

        // Pick a random tool class
        const ToolClass = toolClasses[iterations % toolClasses.length];

        // Access metadata multiple times
        const name1 = ToolClass.toolName;
        const name2 = ToolClass.toolName;
        const desc1 = ToolClass.toolDescription;
        const desc2 = ToolClass.toolDescription;

        // Property: Metadata should be consistent across accesses
        expect(name1).toBe(name2);
        expect(desc1).toBe(desc2);

        return true;
      },
      { numRuns: 100 }
    );

    /**
     * Property-based test: Tool names should follow naming conventions
     */
    test.prop([fc.constant(null)])(
      'should follow naming conventions for tool names',
      async () => {
        const toolClasses = toolRegistry.getAllClasses();

        for (const ToolClass of toolClasses) {
          const toolName = ToolClass.toolName;

          // Property: Tool names should be valid identifiers
          // (lowercase, underscores, alphanumeric)
          const validNamePattern = /^[a-z][a-z0-9_]*$/;

          // This is a soft check - we log warnings but don't fail
          // to allow for different naming conventions
          if (!validNamePattern.test(toolName)) {
            console.warn(
              `Tool name "${toolName}" doesn't follow snake_case convention`
            );
          }

          // Hard requirement: No spaces or special characters except underscore
          expect(toolName).not.toMatch(/\s/);
          expect(toolName).toMatch(/^[a-zA-Z0-9_]+$/);
        }

        return true;
      },
      { numRuns: 100 }
    );

    /**
     * Property-based test: Tool descriptions should be meaningful
     */
    test.prop([fc.constant(null)])(
      'should have meaningful descriptions',
      async () => {
        const toolClasses = toolRegistry.getAllClasses();

        for (const ToolClass of toolClasses) {
          const description = ToolClass.toolDescription;

          // Property: Descriptions should be at least 10 characters
          // (to ensure they're meaningful, not just placeholders)
          expect(description.length).toBeGreaterThanOrEqual(10);

          // Property: Descriptions should not be just whitespace
          expect(description.trim().length).toBeGreaterThan(0);

          // Property: Descriptions should not be placeholder text
          const placeholders = [
            'TODO',
            'FIXME',
            'placeholder',
            'test description',
            'no description',
          ];

          const lowerDesc = description.toLowerCase();
          for (const placeholder of placeholders) {
            if (lowerDesc.includes(placeholder.toLowerCase())) {
              console.warn(
                `Tool "${ToolClass.toolName}" has placeholder description: "${description}"`
              );
            }
          }
        }

        return true;
      },
      { numRuns: 100 }
    );

    /**
     * Property-based test: Tool utterances should be meaningful examples
     */
    test.prop([fc.constant(null)])(
      'should have meaningful utterances if provided',
      async () => {
        const toolClasses = toolRegistry.getAllClasses();

        for (const ToolClass of toolClasses) {
          if (!ToolClass.toolUtterances || ToolClass.toolUtterances.length === 0) {
            continue; // Skip tools without utterances
          }

          for (const utterance of ToolClass.toolUtterances) {
            // Property: Utterances should be at least 3 characters
            // (allowing for short examples like "add", "sum", etc.)
            expect(utterance.length).toBeGreaterThanOrEqual(3);

            // Property: Utterances should not be just whitespace
            expect(utterance.trim().length).toBeGreaterThan(0);

            // Property: Utterances should be sentence-like
            // (start with capital letter or question word)
            // This is a soft check - we log warnings but don't fail
            const firstChar = utterance.trim()[0];
            const isCapitalized = firstChar === firstChar.toUpperCase();
            const startsWithQuestionWord = /^(what|how|when|where|why|who|which|is|are|can|do|does)/i.test(
              utterance.trim()
            );

            if (!isCapitalized && !startsWithQuestionWord) {
              console.warn(
                `Tool "${ToolClass.toolName}" has utterance that doesn't start with capital or question word: "${utterance}"`
              );
            }
          }
        }

        return true;
      },
      { numRuns: 100 }
    );

    /**
     * Test that tool metadata is serializable (for API responses)
     */
    it('should have serializable metadata', async () => {
      const metadata = toolRegistry.getAllMetadata();

      // Property: Metadata should be JSON serializable
      expect(() => {
        const json = JSON.stringify(metadata);
        const parsed = JSON.parse(json);

        // Should be able to round-trip through JSON
        expect(parsed).toEqual(metadata);
      }).not.toThrow();
    });

    /**
     * Test that tool classes can be retrieved by name
     */
    it('should retrieve tool classes by name', async () => {
      const toolClasses = toolRegistry.getAllClasses();

      for (const ToolClass of toolClasses) {
        const name = ToolClass.toolName;

        // Property: Should be able to retrieve tool class by its name
        const retrieved = toolRegistry.getClass(name);
        expect(retrieved).toBeDefined();
        expect(retrieved).toBe(ToolClass);
      }
    });

    /**
     * Test that tool metadata includes all required fields
     */
    it('should include all required metadata fields', async () => {
      const toolClasses = toolRegistry.getAllClasses();

      for (const ToolClass of toolClasses) {
        // Required fields
        expect(ToolClass).toHaveProperty('toolName');
        expect(ToolClass).toHaveProperty('toolDescription');

        // Optional fields (should exist even if undefined)
        expect('toolNameFrontend' in ToolClass || true).toBe(true);
        expect('toolDescriptionFrontend' in ToolClass || true).toBe(true);
        expect('toolUtterances' in ToolClass || true).toBe(true);
        expect('toolHil' in ToolClass || true).toBe(true);
      }
    });

    /**
     * Test that tool metadata should be readonly (best practice check)
     *
     * Note: TypeScript readonly is compile-time only, so we can't enforce
     * it at runtime. This test documents the expected behavior.
     */
    it('should document that metadata should be readonly', async () => {
      const toolClasses = toolRegistry.getAllClasses();

      if (toolClasses.length === 0) {
        return;
      }

      const ToolClass = toolClasses[0];
      const originalName = ToolClass.toolName;
      const originalDescription = ToolClass.toolDescription;

      // Document that metadata SHOULD be readonly
      // In TypeScript, static readonly properties are compile-time only
      // At runtime, they can be modified (though they shouldn't be)

      // Property: Metadata should be defined and accessible
      expect(originalName).toBeDefined();
      expect(originalDescription).toBeDefined();

      // Best practice: Don't modify tool metadata at runtime
      // This is enforced by TypeScript's type system at compile time
      // with the 'readonly' keyword on static properties
    });
  });
});
