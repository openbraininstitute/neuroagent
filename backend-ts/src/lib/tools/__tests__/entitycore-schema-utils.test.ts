/**
 * Tests for EntityCore Schema Utilities
 *
 * Verifies that field exclusion utilities work correctly and match Python behavior.
 */

import { describe, it, expect } from 'vitest';
import {
  ENTITYCORE_EXCLUDE_BR_FIELDS,
  ENTITYCORE_EXCLUDE_NAME_FIELDS,
  createEntitycoreExcludeBROmit,
  createEntitycoreExcludeNameOmit,
  createEntitycoreExcludeBRAndNameOmit,
  isEntitycoreExcludeBRField,
  isEntitycoreExcludeNameField,
} from '../entitycore-schema-utils';

describe('EntityCore Schema Utilities', () => {
  describe('ENTITYCORE_EXCLUDE_BR_FIELDS', () => {
    it('should contain all brain region exclusion fields', () => {
      // Verify key fields are present
      expect(ENTITYCORE_EXCLUDE_BR_FIELDS).toContain('brain_region__name');
      expect(ENTITYCORE_EXCLUDE_BR_FIELDS).toContain('brain_region__id');
      expect(ENTITYCORE_EXCLUDE_BR_FIELDS).toContain('brain_region__acronym');
      expect(ENTITYCORE_EXCLUDE_BR_FIELDS).toContain('within_brain_region_hierarchy_id');
      expect(ENTITYCORE_EXCLUDE_BR_FIELDS).toContain('within_brain_region_ascendants');
    });

    it('should contain emodel brain region fields', () => {
      expect(ENTITYCORE_EXCLUDE_BR_FIELDS).toContain('emodel__brain_region__name');
      expect(ENTITYCORE_EXCLUDE_BR_FIELDS).toContain('emodel__brain_region__id');
    });

    it('should contain me_model brain region fields', () => {
      expect(ENTITYCORE_EXCLUDE_BR_FIELDS).toContain('me_model__brain_region__name');
      expect(ENTITYCORE_EXCLUDE_BR_FIELDS).toContain('me_model__brain_region__id');
    });

    it('should contain morphology brain region fields', () => {
      expect(ENTITYCORE_EXCLUDE_BR_FIELDS).toContain('morphology__brain_region__name');
      expect(ENTITYCORE_EXCLUDE_BR_FIELDS).toContain('morphology__brain_region__id');
    });

    it('should contain synaptome brain region fields', () => {
      expect(ENTITYCORE_EXCLUDE_BR_FIELDS).toContain('synaptome__brain_region__name');
      expect(ENTITYCORE_EXCLUDE_BR_FIELDS).toContain('synaptome__brain_region__id');
    });

    it('should have 76 total fields', () => {
      // This matches the Python implementation
      expect(ENTITYCORE_EXCLUDE_BR_FIELDS).toHaveLength(76);
    });
  });

  describe('ENTITYCORE_EXCLUDE_NAME_FIELDS', () => {
    it('should contain all name exclusion fields', () => {
      expect(ENTITYCORE_EXCLUDE_NAME_FIELDS).toContain('name');
      expect(ENTITYCORE_EXCLUDE_NAME_FIELDS).toContain('name__in');
      expect(ENTITYCORE_EXCLUDE_NAME_FIELDS).toContain('name__ilike');
    });

    it('should have 3 total fields', () => {
      expect(ENTITYCORE_EXCLUDE_NAME_FIELDS).toHaveLength(3);
    });
  });

  describe('createEntitycoreExcludeBROmit', () => {
    it('should create an omit object with all BR fields set to true', () => {
      const omit = createEntitycoreExcludeBROmit();

      // Check structure
      expect(omit).toBeTypeOf('object');
      expect(Object.keys(omit)).toHaveLength(76);

      // Check all values are true
      Object.values(omit).forEach((value) => {
        expect(value).toBe(true);
      });

      // Check specific fields
      expect(omit.brain_region__name).toBe(true);
      expect(omit.within_brain_region_hierarchy_id).toBe(true);
    });
  });

  describe('createEntitycoreExcludeNameOmit', () => {
    it('should create an omit object with all name fields set to true', () => {
      const omit = createEntitycoreExcludeNameOmit();

      // Check structure
      expect(omit).toBeTypeOf('object');
      expect(Object.keys(omit)).toHaveLength(3);

      // Check all values are true
      expect(omit.name).toBe(true);
      expect(omit.name__in).toBe(true);
      expect(omit.name__ilike).toBe(true);
    });
  });

  describe('createEntitycoreExcludeBRAndNameOmit', () => {
    it('should create an omit object with both BR and name fields', () => {
      const omit = createEntitycoreExcludeBRAndNameOmit();

      // Check structure
      expect(omit).toBeTypeOf('object');
      expect(Object.keys(omit)).toHaveLength(79); // 76 + 3

      // Check BR fields
      expect(omit.brain_region__name).toBe(true);
      expect(omit.within_brain_region_hierarchy_id).toBe(true);

      // Check name fields
      expect(omit.name).toBe(true);
      expect(omit.name__in).toBe(true);
      expect(omit.name__ilike).toBe(true);
    });
  });

  describe('isEntitycoreExcludeBRField', () => {
    it('should return true for BR fields', () => {
      expect(isEntitycoreExcludeBRField('brain_region__name')).toBe(true);
      expect(isEntitycoreExcludeBRField('within_brain_region_hierarchy_id')).toBe(true);
      expect(isEntitycoreExcludeBRField('emodel__brain_region__id')).toBe(true);
    });

    it('should return false for non-BR fields', () => {
      expect(isEntitycoreExcludeBRField('name')).toBe(false);
      expect(isEntitycoreExcludeBRField('page_size')).toBe(false);
      expect(isEntitycoreExcludeBRField('semantic_search')).toBe(false);
    });
  });

  describe('isEntitycoreExcludeNameField', () => {
    it('should return true for name fields', () => {
      expect(isEntitycoreExcludeNameField('name')).toBe(true);
      expect(isEntitycoreExcludeNameField('name__in')).toBe(true);
      expect(isEntitycoreExcludeNameField('name__ilike')).toBe(true);
    });

    it('should return false for non-name fields', () => {
      expect(isEntitycoreExcludeNameField('brain_region__name')).toBe(false);
      expect(isEntitycoreExcludeNameField('page_size')).toBe(false);
      expect(isEntitycoreExcludeNameField('semantic_search')).toBe(false);
    });
  });
});
