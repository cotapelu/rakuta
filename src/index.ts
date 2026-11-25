// ============================================
// RAKUTA ADD-ON REGISTRY - SINGLE FUNCTION
// ============================================
// Copy entire folder src/addon/ to reuse

import registerAllAddon from './addon/registry.js';

/**
 * ĐĂNG KÝ TẤT CẢ ADD-ON (extensions + tools)
 *
 * @param cwd - Current working directory
 * @returns { extensions: ExtensionFactory[], tools: ToolDefinition[] }
 *
 * USAGE:
 * const { extensions, tools } = registerAllAddon(cwd);
 */
export function registerAllAddonRAKUTA(cwd: string) {
  const addon = registerAllAddon();
  return {
    tools: [], // Tools are registered via extensions internally
    extensions: addon.extensions,
  };
}

// Default export
export default registerAllAddonRAKUTA;
