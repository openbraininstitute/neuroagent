/**
 * OBIOne Tools
 * 
 * Collection of tools for interacting with the OBIOne circuit analysis API.
 * 
 * OBIOne provides:
 * - Circuit metrics and population analysis
 * - Connectivity metrics and patterns
 * - Node sets and population filtering
 * - Ephys metrics
 * - Morphometrics
 * - Simulation configuration generation
 * 
 * This module exports the base class and implemented tools.
 * Additional OBIOne tools can be added following the same pattern.
 */

export * from './base';
export * from './circuit-metrics-getone';

// Additional OBIOne tools to be implemented:
// - obione-circuitconnectivitymetrics-getone
// - obione-circuitnodesets-getone
// - obione-circuitpopulations-getone
// - obione-ephysmetrics-getone
// - obione-morphometrics-getone
// - obione-generatesimulationsconfig
//
// Each tool follows the same pattern:
// 1. Extend OBIOneTool base class
// 2. Define input schema with Zod
// 3. Define output schema with Zod
// 4. Implement execute method
// 5. Set metadata (name, description, utterances)
