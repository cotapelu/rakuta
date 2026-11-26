/**
 * Extensions Module - Central Entry Point
 *
 * Registration chain (per layer):
 *   factory.ts (extensionsAggregator)  ← registers every layer below
 *   ├── capability-system/index.ts     ← plugin architecture + capability router
 *   ├── providers/index.ts             ← kilo + ofm providers
 *   ├── tools/index.ts                 ← tool definitions (+ sub-tools, utils)
 *   ├── team/index.ts                  ← team_run tool + widget
 *   ├── session-tool/index.ts          ← session tool + operations
 *   ├── multi-agent-tool/index.ts      ← multi-agent tool
 *   ├── master-tool/index.ts           ← master tool + command modules
 *   ├── prompt-hooks/index.ts          ← prompt templates
 *   ├── buildin-tools/index.ts         ← built-in tool overrides
 *   ├── renderers/index.ts             ← custom message renderers
 *   ├── commands/index.ts              ← slash commands
 *   ├── hooks/index.ts                 ← event hooks (auto-continue, auto-compact)
 *   ├── keybinding/index.ts            ← custom keybindings
 *   ├── context-logger.ts              ← context logging
 *   └── piclaw-header.ts               ← header banner
 */

export { extensionsAggregator as default, getExtensionFactories } from './factory.js';

// Layer barrels (each registers its own subtree)
export * as capabilitySystem from './capability-system/index.js';
export * as providers from './providers/index.js';
export * as tools from './tools/index.js';
export * as team from './team/index.js';
export * as sessionTool from './session-tool/index.js';
export * as multiAgentTool from './multi-agent-tool/index.js';
export * as masterTool from './master-tool/index.js';
export * as promptHooks from './prompt-hooks/index.js';
export * as builtinTools from './buildin-tools/index.js';
export * as renderers from './renderers/index.js';
export * as commands from './commands/index.js';
export * as hooks from './hooks/index.js';
export * as keybinding from './keybinding/index.js';
export * as utils from './utils/index.js';
export { default as contextLoggerExtension } from './context-logger.js';
export { default as piclawHeaderExtension } from './piclaw-header.js';