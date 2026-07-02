/**
 * Built-in extensions registry
 * Central export point for all built-in extension registration.
 */
import { getAllBuiltinExtensions } from './extensions/index.js';
import type { ExtensionFactory } from './deps.js';

/**
 * Registers all built-in extensions.
 *
 * @param cwd - Working directory (unused but kept for compatibility)
 * @returns Object containing extensions
 */
export function registerAllBuiltin(cwd: string): {
  extensions: ExtensionFactory[];
} {
  return {
    extensions: getAllBuiltinExtensions(),
  };
}
