/**
 * EntityCore Tools
 * 
 * Collection of tools for interacting with the EntityCore neuroscience knowledge graph.
 * 
 * EntityCore provides access to:
 * - Brain regions and hierarchies
 * - Cell morphologies
 * - Electrical recordings
 * - E-models and ME-models
 * - Circuits and simulations
 * - And many more neuroscience entities
 * 
 * This module exports the base class and implemented tools.
 * Additional EntityCore tools can be added following the same pattern.
 */

export * from './base';
export * from './brain-region-getall';
export * from './cell-morphology-getall';

// Additional EntityCore tools to be implemented:
// - entitycore-brainregion-getone
// - entitycore-electricalcellrecording-getall
// - entitycore-electricalcellrecording-getone
// - entitycore-emodel-getall
// - entitycore-emodel-getone
// - entitycore-circuit-getall
// - entitycore-circuit-getone
// - And many more...
//
// Each tool follows the same pattern:
// 1. Extend EntityCoreTool base class
// 2. Define input schema with Zod
// 3. Define output schema with Zod
// 4. Implement execute method
// 5. Set metadata (name, description, utterances)
