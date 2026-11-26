// ============================================
// ADD-ON REGISTRY - SINGLE FUNCTION
// ============================================
// Copy entire folder src/addon/ to reuse
//
// Returns the extension factories for the whole addon. Every subsystem
// (tools, providers, capability-system, team, session, multi-agent,
// master-tool, prompt-hooks, renderers, commands, hooks, keybinding)
// registers itself through its own directory barrel, which factory.ts
// invokes. Tools/built-in overrides are registered via api.registerTool
// inside those extensions, so this layer only exposes factories.

import { getExtensionFactories } from './extensions/index.js';

/** Export extension factories array (synchronous) */
export const extensionFactories = getExtensionFactories();

/**
 * ĐĂNG KÝ TẤT CẢ ADD-ON (extensions only)
 *
 * Note: Tools are now registered via extensions internally.
 * This function returns only extension factories for compatibility.
 *
 * @returns { extensions: ExtensionFactory[] }
 */
export function registerAllAddon() {
  return {
    extensions: extensionFactories,
    tools: [], // Tools are registered by extensions themselves
  };
}

// Default export for cli.ts
export default registerAllAddon;