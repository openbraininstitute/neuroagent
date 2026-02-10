# Remaining EntityCore Tool Fixes Needed

## Status

✅ **ALL TOOLS FIXED** - All 17 EntityCore getall tools have been updated to match Python backend behavior.

## Tools Fixed ✅

1. `simulation-generation-getall.ts`
2. `measurement-annotation-getall.ts`
3. `simulation-result-getall.ts`
4. `simulation-execution-getall.ts`
5. `simulation-campaign-getall.ts`
6. `experimental-bouton-density-getall.ts`
7. `experimental-neuron-density-getall.ts`
8. `cell-morphology-getall.ts`
9. `circuit-getall.ts`
10. `electrical-cell-recording-getall.ts`
11. `emodel-getall.ts`
12. `experimental-synapses-per-connection-getall.ts`
13. `ion-channel-model-getall.ts`
14. `ion-channel-recording-getall.ts`
15. `memodel-getall.ts`
16. `single-neuron-synaptome-getall.ts`
17. `single-neuron-synaptome-simulation-getall.ts`

## Tools Still Needing Fix ⚠️

None - all tools have been fixed!

## Fix Pattern

For each tool, apply these two changes:

### Change 1: Extract both parameters

**Before:**
```typescript
const { within_brain_region_brain_region_id, ...restInput } = input;
```

**After:**
```typescript
const { within_brain_region_brain_region_id, within_brain_region_direction, ...restInput } = input;
```

### Change 2: Add page_size explicitly

**After the forEach loop, add:**
```typescript
// Always include page_size (matches Python: query_params["page_size"] = self.input_schema.page_size)
queryParams['page_size'] = String(input.page_size ?? 5);
```

### Change 3: Conditional direction assignment

**Before:**
```typescript
        queryParams['within_brain_region_hierarchy_id'] = brainRegionData.hierarchy_id;
      }
```

**After:**
```typescript
        queryParams['within_brain_region_hierarchy_id'] = brainRegionData.hierarchy_id;

        // Only add within_brain_region_direction when hierarchy_id is present
        // (matches Python: query_params["within_brain_region_direction"] = self.input_schema.within_brain_region_direction)
        queryParams['within_brain_region_direction'] = within_brain_region_direction ?? 'ascendants_and_descendants';
      }
```

## Why This Fix Is Needed

The EntityCore API returns 422 (Unprocessable Entity) when `within_brain_region_direction` is sent without a corresponding `within_brain_region_hierarchy_id`. The Python backend uses `exclude_defaults=True` to avoid sending default parameters, but the TypeScript tools were sending all parameters including defaults.

## Testing

After applying these fixes, the tools should:
- Not send `within_brain_region_direction` unless brain region filtering is requested
- Match the Python backend behavior
- Avoid 422 errors from the EntityCore API

## Priority

✅ **COMPLETED** - All EntityCore getall tools have been fixed and will no longer cause 422 errors.
