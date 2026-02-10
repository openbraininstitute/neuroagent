# OBIOne Tools Registration

## Summary

All 7 OBIOne tools have been successfully registered in the tool registry and are now available for use by the agent.

## Registered Tools

1. **Circuit Connectivity Metrics GetOne** (`obione-circuitconnectivitymetrics-getone`)
   - Computes connectivity metrics between neuron populations in a circuit

2. **Circuit Metric GetOne** (`obione-circuitmetrics-getone`)
   - Retrieves circuit-level metrics and statistics

3. **Circuit Nodesets GetOne** (`obione-circuitnodesets-getone`)
   - Retrieves available nodesets (neuron groups) in a circuit

4. **Circuit Population GetOne** (`obione-circuitpopulation-getone`)
   - Retrieves population data for a circuit

5. **Ephys Metrics GetOne** (`obione-ephysmetrics-getone`)
   - Computes electrophysiological metrics from electrical recordings

6. **Morphometrics GetOne** (`obione-morphometrics-getone`)
   - Computes morphological features from neuron morphologies

7. **Generate Simulations Config** (`obione-generatesimulationsconfig`)
   - Generates simulation configurations using LLM from natural language descriptions

## Changes Made

### 1. Tool Exports (`src/lib/tools/index.ts`)

Added exports for all OBIOne tools:
```typescript
export * from './obione/circuit-connectivity-metrics-getone';
export * from './obione/circuit-metric-getone';
export * from './obione/circuit-nodesets-getone';
export * from './obione/circuit-population-getone';
export * from './obione/ephys-metrics-getone';
export * from './obione/morphometrics-getone';
export * from './obione/generate-simulations-config';
```

### 2. Tool Registration (`registerToolClasses` function)

Added imports and registration for all OBIOne tool classes:
```typescript
const { CircuitConnectivityMetricsGetOneTool } = await import('./obione/circuit-connectivity-metrics-getone');
const { CircuitMetricGetOneTool } = await import('./obione/circuit-metric-getone');
const { CircuitNodesetsGetOneTool } = await import('./obione/circuit-nodesets-getone');
const { CircuitPopulationGetOneTool } = await import('./obione/circuit-population-getone');
const { EphysMetricsGetOneTool } = await import('./obione/ephys-metrics-getone');
const { MorphometricsGetOneTool } = await import('./obione/morphometrics-getone');
const { GenerateSimulationsConfigTool } = await import('./obione/generate-simulations-config');
```

### 3. Available Tools (`getAvailableToolClasses` function)

Added all OBIOne tools to the available tools list when `obiOneUrl` is configured:
```typescript
if (config.obiOneUrl) {
  // ... imports
  availableClasses.push(CircuitConnectivityMetricsGetOneTool);
  availableClasses.push(CircuitMetricGetOneTool);
  availableClasses.push(CircuitNodesetsGetOneTool);
  availableClasses.push(CircuitPopulationGetOneTool);
  availableClasses.push(EphysMetricsGetOneTool);
  availableClasses.push(MorphometricsGetOneTool);
  availableClasses.push(GenerateSimulationsConfigTool);
}
```

### 4. Tool Instantiation (`createToolInstance` function)

Added instantiation logic for all OBIOne tools with proper context variables:
- Standard OBIOne tools receive: `httpClient`, `obiOneUrl`, `vlabId`, `projectId`
- Generate Simulations Config tool additionally receives: `openaiClient`, `sharedState`, `entityFrontendUrl`, `model`, `tokenConsumption`

### 5. Tool Configuration Interface

Updated `ToolConfig` interface to include additional context variables needed by Generate Simulations Config tool:
```typescript
export interface ToolConfig {
  // ... existing config
  obiOneUrl?: string;
  openaiClient?: any;
  sharedState?: any;
  model?: string;
  tokenConsumption?: any;
}
```

### 6. Bug Fixes

Fixed schema issue in `generate-simulations-config.ts`:
- Removed top-level `circuit` property (not in schema)
- Circuit reference is only in `initialize.circuit` block
- Updated test to check `result.initialize.circuit` instead of `result.circuit`

## Testing

All 59 OBIOne tool tests pass:
- Circuit Connectivity Metrics: 6 tests ✓
- Circuit Metric: 9 tests ✓
- Circuit Nodesets: 8 tests ✓
- Circuit Population: 8 tests ✓
- Ephys Metrics: 9 tests ✓
- Morphometrics: 9 tests ✓
- Generate Simulations Config: 10 tests ✓

## Usage

The tools are automatically available when:
1. `NEUROAGENT_TOOLS__OBIONE_URL` environment variable is set
2. The agent routine calls `registerToolClasses()` (done automatically on first request)
3. Tools are filtered by the configured whitelist regex

## API Endpoints

Tools can be accessed via:
- `GET /api/tools` - Lists all available tools including OBIOne tools
- `GET /api/tools/{name}` - Gets detailed information about a specific tool
- Tool execution happens through the agent's chat streaming endpoint

## Next Steps

OBIOne tools are now fully integrated and ready for use. The agent can call these tools during conversations to:
- Query circuit data and metrics
- Compute electrophysiological and morphological features
- Generate simulation configurations from natural language
