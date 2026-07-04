#!/usr/bin/env node
/**
 * Capability System - Public Exports
 *
 * Entry point for the capability-based plugin architecture.
 */

export { default as capabilitySystemExtension } from "./extension.ts";
export { getCapabilityRegistry, resetCapabilityRegistry, createRegistry } from "./registry.ts";
export { PluginLoader, createPluginLoader } from "./plugin-loader.ts";
export { enhancePromptWithCapabilities, getCapabilitiesSection, generateSlashCommands, parseSlashCommand, createCapabilityDiscoveryCapability } from "./prompt-integration.ts";
export * from "./types.ts";
