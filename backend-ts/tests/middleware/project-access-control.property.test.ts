/**
 * Property-Based Tests for Project Access Control
 *
 * Feature: typescript-backend-migration
 * Property 20: Project Access Control
 *
 * For any user and virtual lab/project combination, access should only be
 * granted if the user's groups include the appropriate permissions.
 *
 * Validates: Requirements 8.4
 *
 * This test verifies that:
 * 1. Users with correct group memberships can access projects
 * 2. Users without correct group memberships cannot access projects
 * 3. Virtual lab access is validated correctly
 * 4. Project access requires both vlab and project group membership
 * 5. Access control is consistent across multiple validation attempts
 * 6. Edge cases (empty groups, malformed group names) are handled correctly
 */

import { describe, it, expect } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import {
  validateVirtualLabAccess,
  validateProjectAccess,
  validateProject,
  AuthorizationError,
} from '@/lib/middleware/auth';

/**
 * Arbitrary for generating valid UUID strings
 */
const uuidArbitrary = fc.uuid();

/**
 * Arbitrary for generating valid group names with vlab access
 * Format: /vlab/{vlabId}
 */
const vlabGroupArbitrary = fc.tuple(uuidArbitrary).map(([vlabId]) => `/vlab/${vlabId}`);

/**
 * Arbitrary for generating valid group names with project access
 * Format: /proj/{vlabId}/{projectId}
 */
const projectGroupArbitrary = fc
  .tuple(uuidArbitrary, uuidArbitrary)
  .map(([vlabId, projectId]) => `/proj/${vlabId}/${projectId}`);

/**
 * Arbitrary for generating various group name patterns
 */
const groupNameArbitrary = fc.oneof(
  vlabGroupArbitrary,
  projectGroupArbitrary,
  fc.string(), // Random strings
  fc.constant(''), // Empty strings
  fc.constant('/vlab/'), // Incomplete vlab group
  fc.constant('/proj/'), // Incomplete project group
  fc.stringMatching(/^\/[a-z]+\/[a-f0-9-]+$/) // Other group patterns
);

/**
 * Arbitrary for generating arrays of group names
 */
const groupsArrayArbitrary = fc.array(groupNameArbitrary, { minLength: 0, maxLength: 20 });

describe('Project Access Control Property Tests', () => {
  describe('Property 20: Project Access Control', () => {
    /**
     * **Validates: Requirements 8.4**
     *
     * Test that users with correct vlab group membership can access virtual labs
     */
    test.prop([uuidArbitrary, fc.array(fc.string(), { minLength: 0, maxLength: 10 })])(
      'should grant access when user has correct vlab group membership',
      (vlabId, otherGroups) => {
        // Create groups array with the correct vlab group
        const correctGroup = `/vlab/${vlabId}`;
        const groups = [...otherGroups, correctGroup];

        // Property: Access should be granted
        expect(() => validateVirtualLabAccess(groups, vlabId)).not.toThrow();
      }
    );

    /**
     * Test that users without correct vlab group membership cannot access virtual labs
     */
    test.prop([uuidArbitrary, uuidArbitrary, groupsArrayArbitrary])(
      'should deny access when user lacks correct vlab group membership',
      (vlabId, differentVlabId, otherGroups) => {
        // Ensure vlabId and differentVlabId are different
        fc.pre(vlabId !== differentVlabId);

        // Create groups array without the correct vlab group
        // Filter out any groups that might accidentally match
        const groups = otherGroups.filter((g) => !g.includes(`/vlab/${vlabId}`));

        // Property: Access should be denied
        expect(() => validateVirtualLabAccess(groups, vlabId)).toThrow(AuthorizationError);
        expect(() => validateVirtualLabAccess(groups, vlabId)).toThrow(
          'User does not belong to the virtual-lab'
        );
      }
    );

    /**
     * Test that users with correct project group membership can access projects
     */
    test.prop([
      uuidArbitrary,
      uuidArbitrary,
      fc.array(fc.string(), { minLength: 0, maxLength: 10 }),
    ])(
      'should grant access when user has correct project group membership',
      (vlabId, projectId, otherGroups) => {
        // Create groups array with the correct project group
        const correctGroup = `/proj/${vlabId}/${projectId}`;
        const groups = [...otherGroups, correctGroup];

        // Property: Access should be granted
        expect(() => validateProjectAccess(groups, vlabId, projectId)).not.toThrow();
      }
    );

    /**
     * Test that users without correct project group membership cannot access projects
     */
    test.prop([uuidArbitrary, uuidArbitrary, uuidArbitrary, uuidArbitrary, groupsArrayArbitrary])(
      'should deny access when user lacks correct project group membership',
      (vlabId, projectId, differentVlabId, differentProjectId, otherGroups) => {
        // Ensure IDs are different
        fc.pre(vlabId !== differentVlabId || projectId !== differentProjectId);

        // Create groups array without the correct project group
        // Filter out any groups that might accidentally match
        const groups = otherGroups.filter((g) => !g.includes(`/proj/${vlabId}/${projectId}`));

        // Property: Access should be denied
        expect(() => validateProjectAccess(groups, vlabId, projectId)).toThrow(AuthorizationError);
        expect(() => validateProjectAccess(groups, vlabId, projectId)).toThrow(
          'User does not belong to the project'
        );
      }
    );

    /**
     * Test that project access requires the specific project group, not just vlab access
     */
    test.prop([uuidArbitrary, uuidArbitrary])(
      'should deny project access when user only has vlab access',
      (vlabId, projectId) => {
        // User has vlab access but not project access
        const groups = [`/vlab/${vlabId}`];

        // Property: Project access should be denied even with vlab access
        expect(() => validateProjectAccess(groups, vlabId, projectId)).toThrow(AuthorizationError);
      }
    );

    /**
     * Test that project access with wrong vlab is denied
     */
    test.prop([uuidArbitrary, uuidArbitrary, uuidArbitrary])(
      'should deny project access when project group has wrong vlab',
      (vlabId, differentVlabId, projectId) => {
        // Ensure vlabs are different
        fc.pre(vlabId !== differentVlabId);

        // User has project access but for a different vlab
        const groups = [`/proj/${differentVlabId}/${projectId}`];

        // Property: Access should be denied
        expect(() => validateProjectAccess(groups, vlabId, projectId)).toThrow(AuthorizationError);
      }
    );

    /**
     * Test validateProject convenience function with vlab only
     */
    test.prop([uuidArbitrary, fc.array(fc.string(), { minLength: 0, maxLength: 10 })])(
      'validateProject should validate vlab access when only vlabId provided',
      (vlabId, otherGroups) => {
        // With correct vlab group
        const groupsWithAccess = [...otherGroups, `/vlab/${vlabId}`];
        expect(() => validateProject(groupsWithAccess, vlabId, null)).not.toThrow();

        // Without correct vlab group
        const groupsWithoutAccess = otherGroups.filter((g) => !g.includes(`/vlab/${vlabId}`));
        expect(() => validateProject(groupsWithoutAccess, vlabId, null)).toThrow(
          AuthorizationError
        );
      }
    );

    /**
     * Test validateProject convenience function with both vlab and project
     */
    test.prop([
      uuidArbitrary,
      uuidArbitrary,
      fc.array(fc.string(), { minLength: 0, maxLength: 10 }),
    ])(
      'validateProject should validate project access when both vlabId and projectId provided',
      (vlabId, projectId, otherGroups) => {
        // With correct project group
        const groupsWithAccess = [...otherGroups, `/proj/${vlabId}/${projectId}`];
        expect(() => validateProject(groupsWithAccess, vlabId, projectId)).not.toThrow();

        // Without correct project group
        const groupsWithoutAccess = otherGroups.filter(
          (g) => !g.includes(`/proj/${vlabId}/${projectId}`)
        );
        expect(() => validateProject(groupsWithoutAccess, vlabId, projectId)).toThrow(
          AuthorizationError
        );
      }
    );

    /**
     * Test validateProject with no IDs (should not throw)
     */
    test.prop([groupsArrayArbitrary])(
      'validateProject should not validate when neither vlabId nor projectId provided',
      (groups) => {
        // Property: No validation should occur, so no error should be thrown
        expect(() => validateProject(groups, null, null)).not.toThrow();
        expect(() => validateProject(groups, undefined, undefined)).not.toThrow();
      }
    );

    /**
     * Test validateProject throws error when projectId provided without vlabId
     */
    test.prop([uuidArbitrary, groupsArrayArbitrary])(
      'validateProject should throw error when projectId provided without vlabId',
      (projectId, groups) => {
        // Property: Should throw an error (not AuthorizationError, but a regular Error)
        expect(() => validateProject(groups, null, projectId)).toThrow(Error);
        expect(() => validateProject(groups, null, projectId)).toThrow(
          'Virtual-lab ID must be provided when providing a project ID'
        );
      }
    );

    /**
     * Test that empty groups array always denies access
     */
    test.prop([uuidArbitrary, uuidArbitrary])(
      'should deny access when groups array is empty',
      (vlabId, projectId) => {
        const emptyGroups: string[] = [];

        // Property: Empty groups should always deny access
        expect(() => validateVirtualLabAccess(emptyGroups, vlabId)).toThrow(AuthorizationError);
        expect(() => validateProjectAccess(emptyGroups, vlabId, projectId)).toThrow(
          AuthorizationError
        );
      }
    );

    /**
     * Test that malformed group names don't grant access
     */
    test.prop([uuidArbitrary, uuidArbitrary])(
      'should deny access with malformed group names',
      (vlabId, projectId) => {
        // Ensure vlabId and projectId are different to avoid accidental substring matches
        fc.pre(vlabId !== projectId);

        const malformedGroups = [
          `/vlab/`, // Missing ID
          `/proj/`, // Missing IDs
          `vlab/${vlabId}`, // Missing leading slash
          `proj/${vlabId}/${projectId}`, // Missing leading slash
          `/VLAB/${vlabId}`, // Wrong case
          `/PROJ/${vlabId}/${projectId}`, // Wrong case
        ];

        // Property: Malformed groups should not grant access
        expect(() => validateVirtualLabAccess(malformedGroups, vlabId)).toThrow(AuthorizationError);
        expect(() => validateProjectAccess(malformedGroups, vlabId, projectId)).toThrow(
          AuthorizationError
        );
      }
    );

    /**
     * Test that access validation is case-sensitive
     */
    test.prop([uuidArbitrary, uuidArbitrary])(
      'should be case-sensitive in group matching',
      (vlabId, projectId) => {
        // Create groups with wrong case
        const wrongCaseGroups = [
          `/VLAB/${vlabId}`,
          `/Vlab/${vlabId}`,
          `/PROJ/${vlabId}/${projectId}`,
          `/Proj/${vlabId}/${projectId}`,
        ];

        // Property: Case-sensitive matching should deny access
        expect(() => validateVirtualLabAccess(wrongCaseGroups, vlabId)).toThrow(AuthorizationError);
        expect(() => validateProjectAccess(wrongCaseGroups, vlabId, projectId)).toThrow(
          AuthorizationError
        );
      }
    );

    /**
     * Test that validation is consistent across multiple calls
     */
    test.prop([
      uuidArbitrary,
      uuidArbitrary,
      fc.array(fc.string(), { minLength: 0, maxLength: 10 }),
      fc.boolean(),
    ])(
      'should produce consistent validation results across multiple calls',
      (vlabId, projectId, otherGroups, shouldHaveAccess) => {
        // Create groups based on shouldHaveAccess flag
        const groups = shouldHaveAccess
          ? [...otherGroups, `/proj/${vlabId}/${projectId}`]
          : otherGroups.filter((g) => !g.includes(`/proj/${vlabId}/${projectId}`));

        // Validate multiple times
        const results = [1, 2, 3].map(() => {
          try {
            validateProjectAccess(groups, vlabId, projectId);
            return 'success';
          } catch (error) {
            return error instanceof AuthorizationError ? 'denied' : 'error';
          }
        });

        // Property: All results should be identical
        expect(results[0]).toBe(results[1]);
        expect(results[1]).toBe(results[2]);

        // Verify expected outcome
        if (shouldHaveAccess) {
          expect(results[0]).toBe('success');
        } else {
          expect(results[0]).toBe('denied');
        }
      }
    );

    /**
     * Test that multiple valid groups don't interfere with access
     */
    test.prop([uuidArbitrary, uuidArbitrary, uuidArbitrary, uuidArbitrary])(
      'should grant access when user has multiple valid groups including the required one',
      (vlabId1, vlabId2, projectId1, projectId2) => {
        // User has access to multiple vlabs and projects
        const groups = [
          `/vlab/${vlabId1}`,
          `/vlab/${vlabId2}`,
          `/proj/${vlabId1}/${projectId1}`,
          `/proj/${vlabId2}/${projectId2}`,
        ];

        // Property: Should have access to all vlabs and projects
        expect(() => validateVirtualLabAccess(groups, vlabId1)).not.toThrow();
        expect(() => validateVirtualLabAccess(groups, vlabId2)).not.toThrow();
        expect(() => validateProjectAccess(groups, vlabId1, projectId1)).not.toThrow();
        expect(() => validateProjectAccess(groups, vlabId2, projectId2)).not.toThrow();
      }
    );

    /**
     * Test that the implementation uses substring matching (current behavior)
     *
     * NOTE: This documents the CURRENT implementation behavior using .includes().
     * The implementation allows substring matches, which means:
     * - `/vlab/abc` matches if the group contains `/vlab/abc` anywhere
     * - This could be a security concern if group names can have prefixes/suffixes
     *
     * This test documents the actual behavior. If exact matching is required,
     * the implementation should be updated to use === or startsWith/endsWith.
     */
    it('should document that substring matching is used (current implementation)', () => {
      const vlabId = '00000000-0000-1000-8000-000000000000';
      const projectId = '00000000-0000-1000-8000-000000000001';

      // These groups contain the required patterns as substrings
      const groupsWithSubstrings = [
        `some-prefix-/vlab/${vlabId}`, // Contains /vlab/id as substring
        `prefix-/proj/${vlabId}/${projectId}`, // Contains /proj/vlab/proj as substring
      ];

      // Current implementation DOES grant access (substring match)
      expect(() => validateVirtualLabAccess(groupsWithSubstrings, vlabId)).not.toThrow();
      expect(() => validateProjectAccess(groupsWithSubstrings, vlabId, projectId)).not.toThrow();

      // If exact matching is needed, these should throw AuthorizationError
      // and the implementation should be updated
    });

    /**
     * Test that groups without the exact pattern don't grant access
     *
     * This tests groups that DON'T contain the required pattern even as a substring.
     */
    test.prop([uuidArbitrary, uuidArbitrary])(
      'should deny access when groups do not contain the required pattern',
      (vlabId, projectId) => {
        // Ensure vlabId and projectId are sufficiently different
        fc.pre(vlabId !== projectId);
        fc.pre(!vlabId.includes(projectId) && !projectId.includes(vlabId));

        // Create groups that don't contain the required patterns at all
        const nonMatchingGroups = [
          `/other-vlab/${vlabId}`, // Different prefix
          `/vlab-${vlabId}`, // Missing slash
          `/proj-${vlabId}-${projectId}`, // Wrong format
          `/different/${vlabId}/${projectId}`, // Wrong prefix
        ];

        // Property: Groups without the pattern should deny access
        expect(() => validateVirtualLabAccess(nonMatchingGroups, vlabId)).toThrow(
          AuthorizationError
        );
        expect(() => validateProjectAccess(nonMatchingGroups, vlabId, projectId)).toThrow(
          AuthorizationError
        );
      }
    );

    /**
     * Test that duplicate groups don't affect validation
     */
    test.prop([uuidArbitrary, uuidArbitrary, fc.integer({ min: 1, max: 5 })])(
      'should handle duplicate groups correctly',
      (vlabId, projectId, duplicateCount) => {
        // Create groups with duplicates
        const correctGroup = `/proj/${vlabId}/${projectId}`;
        const groups = Array(duplicateCount).fill(correctGroup);

        // Property: Duplicates should not affect validation
        expect(() => validateProjectAccess(groups, vlabId, projectId)).not.toThrow();
      }
    );

    /**
     * Test that special characters in IDs are handled correctly
     */
    it('should handle UUIDs with hyphens correctly', () => {
      const vlabId = '123e4567-e89b-12d3-a456-426614174000';
      const projectId = '987fcdeb-51a2-43f7-8765-123456789abc';

      const groups = [`/proj/${vlabId}/${projectId}`];

      // Property: UUIDs with hyphens should work correctly
      expect(() => validateProjectAccess(groups, vlabId, projectId)).not.toThrow();
    });

    /**
     * Test error types are correct
     */
    test.prop([uuidArbitrary, uuidArbitrary, groupsArrayArbitrary])(
      'should throw AuthorizationError (not generic Error) on access denial',
      (vlabId, projectId, otherGroups) => {
        // Filter out any groups that might grant access
        const groups = otherGroups.filter(
          (g) => !g.includes(`/vlab/${vlabId}`) && !g.includes(`/proj/${vlabId}/${projectId}`)
        );

        // Property: Should throw AuthorizationError specifically
        try {
          validateVirtualLabAccess(groups, vlabId);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error) {
          expect(error).toBeInstanceOf(AuthorizationError);
          expect(error).toBeInstanceOf(Error);
          expect((error as AuthorizationError).name).toBe('AuthorizationError');
        }

        try {
          validateProjectAccess(groups, vlabId, projectId);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error) {
          expect(error).toBeInstanceOf(AuthorizationError);
          expect(error).toBeInstanceOf(Error);
          expect((error as AuthorizationError).name).toBe('AuthorizationError');
        }
      }
    );

    /**
     * Test that null/undefined IDs are handled correctly
     */
    it('should handle null/undefined IDs appropriately', () => {
      const groups = ['/vlab/some-id', '/proj/some-id/some-project'];

      // validateProject with null/undefined should not throw
      expect(() => validateProject(groups, null, null)).not.toThrow();
      expect(() => validateProject(groups, undefined, undefined)).not.toThrow();

      // But providing projectId without vlabId should throw
      expect(() => validateProject(groups, null, 'some-project')).toThrow(Error);
      expect(() => validateProject(groups, undefined, 'some-project')).toThrow(Error);
    });

    /**
     * Integration test: Realistic user scenarios
     */
    it('should handle realistic user access scenarios', () => {
      const vlabId1 = 'abc-123-def';
      const vlabId2 = 'xyz-789-ghi';
      const projectId1 = 'proj-111-aaa';
      const projectId2 = 'proj-222-bbb';
      const projectId3 = 'proj-333-ccc';

      // User is member of vlab1 and has access to project1 and project2
      // User is also member of vlab2 but has no project access there
      const userGroups = [
        `/vlab/${vlabId1}`,
        `/proj/${vlabId1}/${projectId1}`,
        `/proj/${vlabId1}/${projectId2}`,
        `/vlab/${vlabId2}`,
        '/some-other-group',
        '/another-group',
      ];

      // Should have vlab access to both vlabs
      expect(() => validateVirtualLabAccess(userGroups, vlabId1)).not.toThrow();
      expect(() => validateVirtualLabAccess(userGroups, vlabId2)).not.toThrow();

      // Should have project access to project1 and project2 in vlab1
      expect(() => validateProjectAccess(userGroups, vlabId1, projectId1)).not.toThrow();
      expect(() => validateProjectAccess(userGroups, vlabId1, projectId2)).not.toThrow();

      // Should NOT have project access to project3 in vlab1
      expect(() => validateProjectAccess(userGroups, vlabId1, projectId3)).toThrow(
        AuthorizationError
      );

      // Should NOT have project access to any project in vlab2
      expect(() => validateProjectAccess(userGroups, vlabId2, projectId1)).toThrow(
        AuthorizationError
      );
      expect(() => validateProjectAccess(userGroups, vlabId2, projectId2)).toThrow(
        AuthorizationError
      );
      expect(() => validateProjectAccess(userGroups, vlabId2, projectId3)).toThrow(
        AuthorizationError
      );
    });
  });
});
