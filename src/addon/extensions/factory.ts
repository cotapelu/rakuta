#!/usr/bin/env node

/**
 * Piclaw Extensions - Factory Module (Ultimate Combined)
 *
 * Combines: jf + evo + tau
 * - tau: capability-system, OFM provider, tracing, best renderers
 * - jf: master-tool, bash-actions, compaction, indexer, skills, time, comprehensive session tool
 * - evo: buildin-tools override, provider-command
 */

import { registerKiloProvider } from "./providers/kilo-provider.js";
import { registerOfmProvider } from "./providers/ofm-provider-provider.js";
import {
  registerTodosTool,
  registerMemoryTool,
  registerSubToolLoaderExtension,
  registerToolTemplate,
  registerSkillReaderExtension,
  registerBashAction,
  registerCompactionTool,
  registerCodebaseIndexTool,
  registerSkillTool,
  registerTimeTool,
  registerJFSessionTool,
} from "./tools/index.js";
import { registerTeamTool } from "./team/index.js";
import capabilitySystemExtension from "./capability-system/extension.js";
import autoContinueExtension from "./hooks/auto-continue.js";
import autoCompact85Extension from "./hooks/auto-compact-85.js";
import contextLoggerExtension from "./context-logger.js";
import registerBuiltinsExtension from "./buildin-tools/index.js";
import multiAgentToolExtension from "./multi-agent-tool/index.js";
import sessionToolExtension from "./session-tool/index.js";
import promptHookExtension from "./prompt-hooks/index.js";

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
import { registerMasterTool } from "./master-tool/index.js";

/**
 * Main extension aggregator function
 *
 * Registers all custom extensions for Piclaw.
 * Called by the extension factory system.
 */
export default async function extensionsAggregator(api: import("@earendil-works/pi-coding-agent").ExtensionAPI): Promise<any> {
  // ============================================================================
  // 1. CAPABILITY SYSTEM (Plugin Architecture) - from tau (best)
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
  // from ./providers/ofm-provider (token saver, chains, refresh) - tau unique
  try {
    await registerOfmProvider(api);
  } catch (e) {
    console.error('[Factory] OFM provider registration failed:', e);
  }

  // ============================================================================
  // 2. CORE TOOLS - combined from all three
  // ============================================================================
  try { registerTodosTool(api); } catch (e) { console.error('[Factory] todos tool failed:', e); }
  try { registerMemoryTool(api); } catch (e) { console.error('[Factory] memory tool failed:', e); }
  try { registerTeamTool(api); } catch (e) { console.error('[Factory] team tool failed:', e); }
  try { registerToolTemplate(api); } catch (e) { console.error('[Factory] tool template failed:', e); }
  try { registerSkillReaderExtension(api); } catch (e) { console.error('[Factory] skill reader failed:', e); }

  // JF-specific tools (ToolDefinitions, register via api.registerTool)
  try { registerBashAction(api); } catch (e) { console.error('[Factory] bash action failed:', e); }
  try { api.registerTool(registerCompactionTool); } catch (e) { console.error('[Factory] compaction tool failed:', e); }
  try { api.registerTool(registerCodebaseIndexTool); } catch (e) { console.error('[Factory] codebase index tool failed:', e); }
  try { api.registerTool(registerSkillTool); } catch (e) { console.error('[Factory] skill tool failed:', e); }
  try { api.registerTool(registerTimeTool); } catch (e) { console.error('[Factory] time tool failed:', e); }

  // EVO: Register built-in tools override (re-registers find, grep, ls)
  try { registerBuiltinsExtension(api); } catch (e) { console.error('[Factory] builtin tools failed:', e); }

  // Multi-agent tool (tau/evo version)
  try { multiAgentToolExtension(api); } catch (e) { console.error('[Factory] multi-agent failed:', e); }

  // Session tools - tau/evo version AND jf comprehensive version
  try { sessionToolExtension(api); } catch (e) { console.error('[Factory] session tool failed:', e); }
  try { registerJFSessionTool(api); } catch (e) { console.error('[Factory] jf session tool failed:', e); }

  // Prompt hooks extension
  try { promptHookExtension(api); } catch (e) { console.error('[Factory] prompt hooks failed:', e); }

  // Sub-tool loader
  try { registerSubToolLoaderExtension(api); } catch (e) { console.error('[Factory] subtool loader failed:', e); }

  // ============================================================================
  // 3. CUSTOM MESSAGE RENDERERS
  // ============================================================================
  try { registerTodosRenderer(api); } catch (e) { console.error('[Factory] todos renderer failed:', e); }
  try { registerMemoryRenderer(api); } catch (e) { console.error('[Factory] memory renderer failed:', e); }
  try { registerTeamWidget(api); } catch (e) { console.error('[Factory] team widget failed:', e); }
  try { registerBranchSummaryRenderer(api); } catch (e) { console.error('[Factory] branch summary renderer failed:', e); }
  try { registerTeamOpsRenderer(api); } catch (e) { console.error('[Factory] team ops renderer failed:', e); }

  // ============================================================================
  // 4. COMMANDS (non-conflicting)
  // ============================================================================
  try { registerProviderCommand(api); } catch (e) { console.error('[Factory] provider command failed:', e); }
  try { registerTeamCommand(api); } catch (e) { console.error('[Factory] team command failed:', e); }

  // ============================================================================
  // 5. KEYBINDING EXTENSION
  // ============================================================================
  try { registerKeybindingExtension(api); } catch (e) { console.error('[Factory] keybinding failed:', e); }

  // ============================================================================
  // 6. HOOK EXTENSIONS
  // ============================================================================
  try { autoContinueExtension(api); } catch (e) { console.error('[Factory] auto-continue failed:', e); }
  try { autoCompact85Extension(api); } catch (e) { console.error('[Factory] auto-compact failed:', e); }
  try { piclawHeader(api); } catch (e) { console.error('[Factory] piclaw header failed:', e); }
  try { contextLoggerExtension(api); } catch (e) { console.error('[Factory] context logger failed:', e); }

  // ============================================================================
  // 7. MASTER TOOL (jf unique)
  // ============================================================================
  try { registerMasterTool(api); console.log('[Factory] Registered master-tool extension'); } catch (e) { console.error('[Factory] master-tool failed:', e); }

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
