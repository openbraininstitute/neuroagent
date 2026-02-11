# EntityCore Field Exclusions

This document explains the field exclusion patterns used in EntityCore tools to guide LLM behavior.

## Overview

EntityCore tools exclude certain fields from their input schemas to prevent the LLM from using them directly. This encourages better patterns like semantic search or brain region hierarchy filtering.

## Exclusion Types

### 1. Brain Region Exclusions (`EntitycoreExcludeBRParams`)

**Purpose:** Prevent direct brain region filtering; encourage use of `within_brain_region_brain_region_id` instead.

**Tools that use this:**
- `circuit-getall`
- `cell-morphology-getall`
- `emodel-getall`
- `electrical-cell-recording-getall`
- `experimental-bouton-density-getall`
- `experimental-neuron-density-getall`
- `experimental-synapses-per-connection-getall`
- `ion-channel-model-getall`
- `ion-channel-recording-getall`
- `measurement-annotation-getall`
- `memodel-getall`
- `simulation-getall`
- `simulation-campaign-getall`
- `simulation-generation-getall`
- `simulation-result-getall`
- `single-neuron-simulation-getall`
- `single-neuron-synaptome-getall`
- `single-neuron-synaptome-simulation-getall`

**Excluded fields:**
```typescript
// Direct brain_region filters
'brain_region__name'
'brain_region__name__in'
'brain_region__name__ilike'
'brain_region__id'
'brain_region__id__in'
'brain_region__acronym'
'brain_region__acronym__in'

// emodel__brain_region filters
'emodel__brain_region__name'
'emodel__brain_region__name__in'
'emodel__brain_region__name__ilike'
'emodel__brain_region__id'
'emodel__brain_region__id__in'
'emodel__brain_region__acronym'
'emodel__brain_region__acronym__in'

// me_model__brain_region filters
'me_model__brain_region__name'
'me_model__brain_region__name__in'
'me_model__brain_region__name__ilike'
'me_model__brain_region__id'
'me_model__brain_region__id__in'
'me_model__brain_region__acronym'
'me_model__brain_region__acronym__in'

// morphology__brain_region filters
'morphology__brain_region__name'
'morphology__brain_region__name__in'
'morphology__brain_region__name__ilike'
'morphology__brain_region__id'
'morphology__brain_region__id__in'
'morphology__brain_region__acronym'
'morphology__brain_region__acronym__in'

// synaptome__brain_region filters
'synaptome__brain_region__name'
'synaptome__brain_region__name__in'
'synaptome__brain_region__name__ilike'
'synaptome__brain_region__id'
'synaptome__brain_region__id__in'
'synaptome__brain_region__acronym'
'synaptome__brain_region__acronym__in'

// Internal fields
'within_brain_region_hierarchy_id'
'within_brain_region_ascendants'
```

**Rationale:**
- The LLM should use `within_brain_region_brain_region_id` when filtering by brain region
- The tool automatically maps the brain region ID to the hierarchy ID during execution
- This ensures consistent behavior across all brain region filtering
- Excluding `brain_region__id` means we can't filter for entities exactly within a specific region, but most use cases care about entities within a region's subtree

### 2. Name Exclusions (`EntitycoreExcludeNameParams`)

**Purpose:** Maximize probability of LLM using `semantic_search` instead of direct name-based filtering.

**Tools that use this:**
- `brain-region-getall`
- `species-getall`
- `strain-getall`

**Excluded fields:**
```typescript
'name'
'name__in'
'name__ilike'
```

**Rationale:**
- Semantic search provides better results for natural language queries
- Direct name matching is too rigid for user queries
- Encourages more flexible, user-friendly interactions

## Usage in TypeScript

### Import the utilities

```typescript
import {
  createEntitycoreExcludeBROmit,
  createEntitycoreExcludeNameOmit,
  createEntitycoreExcludeBRAndNameOmit,
} from '../entitycore-schema-utils';
```

### Apply to Zod schemas

**For brain region exclusions:**
```typescript
const MyToolInputSchema = zReadManyMyEntityGetData.shape.query
  .unwrap()
  .extend({
    // Add custom fields
    within_brain_region_brain_region_id: z.string().uuid().optional(),
  })
  .omit(createEntitycoreExcludeBROmit());
```

**For name exclusions:**
```typescript
const MyToolInputSchema = zReadManyMyEntityGetData.shape.query
  .unwrap()
  .extend({
    // Add custom fields
    semantic_search: z.string().optional(),
  })
  .omit(createEntitycoreExcludeNameOmit());
```

**For both:**
```typescript
const MyToolInputSchema = zReadManyMyEntityGetData.shape.query
  .unwrap()
  .extend({
    // Add custom fields
  })
  .omit(createEntitycoreExcludeBRAndNameOmit());
```

## Verification

To verify that exclusions are working correctly:

1. Check the generated JSON schema doesn't include excluded fields
2. Test that the LLM cannot use excluded fields in tool calls
3. Verify that the tool still functions correctly with the remaining fields

## Python Equivalents

- TypeScript `createEntitycoreExcludeBROmit()` ≈ Python `EntitycoreExcludeBRParams`
- TypeScript `createEntitycoreExcludeNameOmit()` ≈ Python `EntitycoreExcludeNameParams`

The Python implementation uses Pydantic's `Field(default=None, exclude=True)` pattern, while TypeScript uses Zod's `.omit()` method.
