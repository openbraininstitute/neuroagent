# EntityCore 422 Error Fixes

## Issue Summary

Multiple EntityCore tools were failing with 422 (Unprocessable Entity) errors when called by the agent. The root cause was sending `within_brain_region_direction` parameter to the API even when no brain region filtering was requested.

## Root Cause

The TypeScript tools were sending default parameter values to the EntityCore API, while the Python backend uses `exclude_defaults=True` to only send explicitly set parameters. The EntityCore API rejects requests that include `within_brain_region_direction` without a corresponding `within_brain_region_hierarchy_id`.

## Affected Tools

### Tools with 422 Errors (from error logs):
1. `entitycore-simulationgeneration-getall` ✅
2. `entitycore-measurementannotation-getall` ✅
3. `entitycore-simulationresult-getall` ✅
4. `entitycore-simulationexecution-getall` ✅
5. `entitycore-simulationcampaign-getall` ✅

### Additional Tools Fixed Proactively:
6. `entitycore-experimental-bouton-density-getall` ✅
7. `entitycore-experimental-neuron-density-getall` ✅
8. `entitycore-cell-morphology-getall` ✅
9. `entitycore-circuit-getall` ✅
10. `entitycore-electrical-cell-recording-getall` ✅
11. `entitycore-emodel-getall` ✅
12. `entitycore-experimental-synapses-per-connection-getall` ✅
13. `entitycore-ion-channel-model-getall` ✅
14. `entitycore-ion-channel-recording-getall` ✅
15. `entitycore-memodel-getall` ✅
16. `entitycore-single-neuron-synaptome-getall` ✅
17. `entitycore-single-neuron-synaptome-simulation-getall` ✅

**Total: 17 tools fixed**

## Fix Applied

### Pattern for Tools with `within_brain_region_direction`

For tools that support brain region filtering with direction control:

```typescript
// Extract both parameters for special handling
const { within_brain_region_brain_region_id, within_brain_region_direction, ...restInput } = input;

// Only add other parameters (excluding defaults)
Object.entries(restInput).forEach(([key, value]) => {
  if (value !== undefined) {
    queryParams[key] = Array.isArray(value) ? value.map(String) : String(value);
  }
});

// Always include page_size explicitly
queryParams['page_size'] = String(input.page_size ?? 5);

// Only add within_brain_region_direction when hierarchy_id is present
if (within_brain_region_brain_region_id) {
  // ... fetch hierarchy_id from brain-region endpoint
  queryParams['within_brain_region_hierarchy_id'] = brainRegionData.hierarchy_id;
  queryParams['within_brain_region_direction'] = within_brain_region_direction ?? 'ascendants_and_descendants';
}
```

### Special Case: `simulation-execution-getall`

This tool doesn't use `within_brain_region_direction` at all (matching Python implementation). Removed the incorrect default `within_brain_region_hierarchy_id` parameter from the schema.

## Additional Fix

### Missing Import in `routine.ts`

Fixed `ReferenceError: toolRegistry is not defined` by adding the missing import:

```typescript
import { toolRegistry } from '../tools/base-tool';
```

## Testing

After these fixes:
- Tools should no longer send `within_brain_region_direction` unless brain region filtering is explicitly requested
- The agent should be able to call these tools without 422 errors

## Related Files

All 17 EntityCore getall tools have been fixed:

- `backend-ts/src/lib/agents/routine.ts` - Added toolRegistry import
- `backend-ts/src/lib/tools/entitycore/simulation-generation-getall.ts`
- `backend-ts/src/lib/tools/entitycore/measurement-annotation-getall.ts`
- `backend-ts/src/lib/tools/entitycore/simulation-result-getall.ts`
- `backend-ts/src/lib/tools/entitycore/simulation-execution-getall.ts`
- `backend-ts/src/lib/tools/entitycore/simulation-campaign-getall.ts`
- `backend-ts/src/lib/tools/entitycore/experimental-bouton-density-getall.ts`
- `backend-ts/src/lib/tools/entitycore/experimental-neuron-density-getall.ts`
- `backend-ts/src/lib/tools/entitycore/cell-morphology-getall.ts`
- `backend-ts/src/lib/tools/entitycore/circuit-getall.ts`
- `backend-ts/src/lib/tools/entitycore/electrical-cell-recording-getall.ts`
- `backend-ts/src/lib/tools/entitycore/emodel-getall.ts`
- `backend-ts/src/lib/tools/entitycore/experimental-synapses-per-connection-getall.ts`
- `backend-ts/src/lib/tools/entitycore/ion-channel-model-getall.ts`
- `backend-ts/src/lib/tools/entitycore/ion-channel-recording-getall.ts`
- `backend-ts/src/lib/tools/entitycore/memodel-getall.ts`
- `backend-ts/src/lib/tools/entitycore/single-neuron-synaptome-getall.ts`
- `backend-ts/src/lib/tools/entitycore/single-neuron-synaptome-simulation-getall.ts`

## Python Backend Reference

The Python backend uses `model_dump(exclude_defaults=True)` to only send non-default parameters:

```python
query_params = self.input_schema.model_dump(exclude_defaults=True, mode="json")
query_params["page_size"] = self.input_schema.page_size
query_params["within_brain_region_direction"] = self.input_schema.within_brain_region_direction
```

The TypeScript implementation now matches this behavior by:
1. Excluding default parameters from the initial query params
2. Explicitly adding `page_size` (always sent)
3. Only adding `within_brain_region_direction` when `within_brain_region_hierarchy_id` is present
