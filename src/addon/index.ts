// ============================================
// ADDON REGISTRY - SINGLE FUNCTION
// ============================================
// Copy entire folder src/addon/ to reuse
//
// Registration chain (per layer):
//   index.ts (this file)            ← root barrel for the copied addon
//   ├── registry.ts                 ← registerAllAddon() { extensions, tools }
//   │     └── extensions/index.ts   ← one barrel per subsystem
//   ├── prompts/index.ts            ← built-in prompt templates
//   ├── types/index.ts              ← ambient SDK type augmentations
//   ├── runtime-context.ts          ← current runtime accessors
//   ├── project-profile.ts          ← project profiling
//   └── logger.ts                   ← addon logger

import extensionsAggregator from './extensions/index.js';

// Default export - this is the ExtensionFactory that pi install will load
export default extensionsAggregator;

// Root layer re-exports (full addon surface for reuse)
export { registerAllAddon, default as registerAllAddonDefault } from './registry.js';
export * as prompts from './prompts/index.js';
export * as types from './types/index.js';
export {
  getCurrentRuntime,
  setCurrentRuntime,
  clearCurrentRuntime,
  getCurrentSession,
  getCurrentServices,
  getCurrentCwd,
} from './runtime-context.js';
export { detectProjectProfile, writeProjectProfile } from './project-profile.js';
export { logger } from './logger.js';