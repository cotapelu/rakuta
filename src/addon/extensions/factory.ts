#!/usr/bin/env node

/**
 * Piclaw Extensions - Factory Module
 *
 * This module contains the main extension aggregator function
 * and configuration utilities for extension loading.
 */

import { registerKiloProvider } from "./providers/kilo-provider.js";
import { registerOfmProvider } from "./providers/ofm-provider-provider.js";
import { registerTodosTool, registerMemoryTool } from "./tools/index.js";
// Tools moved to plugins: git, test, format, audit, build, metrics, secret-scanner, scripts
import { registerTeamTool } from "./team/index.js";
import { registerSubToolLoaderExtension } from "./tools/subtool-loader.js";
import { registerToolTemplate } from "./tools/tool-template.js";
import capabilitySystemExtension from "./capability-system/extension.js";
import { registerSkillReaderExtension } from "./tools/skill-reader.js";
import autoContinueExtension from "./hooks/auto-continue.js";
import autoCompact85Extension from "./hooks/auto-compact-85.js";
import contextLoggerExtension from "./context-logger.js";

// Import built-in tools override extension (disabled - overrides default built-in tools)
// import registerBuiltinsExtension from "./buildin-tools/index.js";
import multiAgentToolExtension from "./multi-agent-tool/index.js";
import sessionToolExtension from "./session-tool/index.js";
import promptHookExtension from "./prompt-hooks/index.js";
// skillsToolExtension removed - skill_reader extension handles skills

import piclawHeader from "./piclaw-header.js";
import { registerTodosRenderer } from "./renderers/todos-renderer.js";
import { registerTeamWidget } from "./team/team-widget.js";
import { registerMemoryRenderer } from "./renderers/memory-renderer.js";
import { registerBranchSummaryRenderer } from "./renderers/branch-summary-renderer.js";
import { registerTeamOpsRenderer } from "./renderers/team-ops-renderer.js";
import { registerProviderCommand } from "./commands/provider-command.js";
import { registerTeamCommand } from "./commands/team-command.js";
// Removed conflicting built-in command registrations:
// - registerSessionTreeCommand (conflicts with built-in /tree)
// - registerSettingsCommand (conflicts with built-in /settings)
// - registerCopyCommand (conflicts with built-in /copy)
import { registerKeybindingExtension } from "./keybinding/keybinding-extension.js";

/**
 * Main extension aggregator function
 *
 * Registers all custom extensions for Piclaw.
 * Called by the extension factory system.
 */
export default async function extensionsAggregator(api: import("@earendil-works/pi-coding-agent").ExtensionAPI): Promise<any> {
  // ============================================================================
  // 1. CAPABILITY SYSTEM (Plugin Architecture)
  // ============================================================================
  // Loads plugins from ./plugins folder and registers capability router tool
  await capabilitySystemExtension(api);

  // Register providers (wrapped in try/catch for resilience)
  try {
    await registerKiloProvider(api);
  } catch (e) {
    console.error('[Factory] Kilo provider registration failed:', e);
  }

  // Register the ofm-provider lanes (ofm-kilo, ofm-opencode) and the /ofm command
  // from ./providers/ofm-provider (token saver, chains, refresh)
  try {
    await registerOfmProvider(api);
  } catch (e) {
    console.error('[Factory] OFM provider registration failed:', e);
  }

  try { registerTodosTool(api); } catch (e) { console.error('[Factory] todos tool failed:', e); }
  try { registerMemoryTool(api); } catch (e) { console.error('[Factory] memory tool failed:', e); }
  try { registerTeamTool(api); } catch (e) { console.error('[Factory] team tool failed:', e); }
  try { registerToolTemplate(api); } catch (e) { console.error('[Factory] tool template failed:', e); }
  try { registerSkillReaderExtension(api); } catch (e) { console.error('[Factory] skill reader failed:', e); }

  // // Register built-in tools override (same name, uses createXTool(ctx.cwd))
  // registerBuiltinsExtension(api);
  
  try { multiAgentToolExtension(api); } catch (e) { console.error('[Factory] multi-agent failed:', e); }
  try { sessionToolExtension(api); } catch (e) { console.error('[Factory] session tool failed:', e); }
  try { promptHookExtension(api); } catch (e) { console.error('[Factory] prompt hooks failed:', e); }
  
  // skills tool removed (use skill_reader extension)

  // Register action tool (removed)
  // registerActionTool(api);
  try { registerSubToolLoaderExtension(api); } catch (e) { console.error('[Factory] subtool loader failed:', e); }

  try { registerTodosRenderer(api); } catch (e) { console.error('[Factory] todos renderer failed:', e); }
  try { registerMemoryRenderer(api); } catch (e) { console.error('[Factory] memory renderer failed:', e); }
  try { registerTeamWidget(api); } catch (e) { console.error('[Factory] team widget failed:', e); }
  try { registerBranchSummaryRenderer(api); } catch (e) { console.error('[Factory] branch summary renderer failed:', e); }
  try { registerTeamOpsRenderer(api); } catch (e) { console.error('[Factory] team ops renderer failed:', e); }

  try { registerProviderCommand(api); } catch (e) { console.error('[Factory] provider command failed:', e); }
  try { registerTeamCommand(api); } catch (e) { console.error('[Factory] team command failed:', e); }
  try { registerKeybindingExtension(api); } catch (e) { console.error('[Factory] keybinding failed:', e); }

  try { autoContinueExtension(api); } catch (e) { console.error('[Factory] auto-continue failed:', e); }
  try { autoCompact85Extension(api); } catch (e) { console.error('[Factory] auto-compact failed:', e); }
  try { piclawHeader(api); } catch (e) { console.error('[Factory] piclaw header failed:', e); }
  try { contextLoggerExtension(api); } catch (e) { console.error('[Factory] context logger failed:', e); }

  // Master-tool extension removed (not efficient)

  // Return an empty object to satisfy extension discovery requirements
  return {};
}

/**
 * Returns array of extension factory functions
 * Used by the extension loader system
 */
export function getExtensionFactories() {
  return [extensionsAggregator];
}

// Re-export aggregator with clear name
export { extensionsAggregator };

// Type-only export for consistency
export type { extensionsAggregator as ExtensionsAggregator };
