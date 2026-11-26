/**
 * Addon Types - Ambient Type Augmentations
 *
 * Type-only barrel: types/extensions.d.ts augments the Pi SDK interfaces
 * (AgentToolResult.isError, ExtensionContext.runtime) used across the addon.
 * It is picked up by the tsconfig include glob (all sources under src).
 * The type-only import below documents the dependency and is fully elided
 * at runtime.
 */

import type {} from './types/extensions.js';

export {};