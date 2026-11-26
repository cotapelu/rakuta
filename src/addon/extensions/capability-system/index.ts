#!/usr/bin/env node
/**
 * Capability System - Public Exports
 *
 * Entry point for the capability-based plugin architecture.
 */

export { default as capabilitySystemExtension } from "./extension.js";
export { getCapabilityRegistry, resetCapabilityRegistry, createRegistry } from "./registry.js";
// Renderer component + text helpers used by the router tool UI
export { CapabilityResultRenderComponent, rebuildCapabilityRenderComponent, truncateToVisualLines, type RouterRendererState } from "./capability-renderer.js";
// Prompt/guideline generation for capability discovery
export { generateCapabilityGuidelines, extractMinimalParams, getExampleValue } from "./guideline-generator.js";
export { PluginLoader, createPluginLoader } from "./plugin-loader.js";
export { enhancePromptWithCapabilities, getCapabilitiesSection, generateSlashCommands, parseSlashCommand, createCapabilityDiscoveryCapability } from "./prompt-integration.js";
export * from "./types.js";
