import type { ExtensionAPI, ToolDefinition } from '@earendil-works/pi-coding-agent';
import { MultiSessionManager } from './manager.js';
import { createSessionToolRouter } from './router.js';
import { getCurrentRuntime } from '../../runtime-context.js';

let manager: MultiSessionManager | null = null;

export function initializeSessionTool(): void {
  if (manager) return;
  const runtime = getCurrentRuntime();
  manager = new MultiSessionManager(runtime, {
    allowMultipleChildren: true,
    maxSessions: 0,
    persistPath: (runtime.services?.agentDir ? runtime.services.agentDir + '/sessions.json' : ''),
  });
  console.log('Session tool initialized');
}

function resolveManager(): MultiSessionManager {
  if (!manager) {
    initializeSessionTool();
    if (!manager) throw new Error('Session tool not initialized');
  }
  return manager;
}

export function resetSessionTool(): void {
  manager = null;
}

export function getSessionManager(): MultiSessionManager | null {
  return manager;
}

export function createSessionTool(): ToolDefinition {
  return createSessionToolRouter({ initialize: resolveManager });
}

// Extension wrapper
export default function sessionToolExtension(api: ExtensionAPI) {
  api.on("session_start", async (event, ctx) => {
    api.registerTool(createSessionTool());
  });
}

// ============================================================================
// Sub-layers (registered here so the whole session-tool tree is reachable)
// ============================================================================

// Registry: session metadata / state / history
export {
  SessionRegistry,
  SessionState,
  type SessionMetadata,
  type SessionOperation,
  type SessionHistoryEntry,
  type SessionTreeNode,
} from './registry.js';

// Tool definition fragments
export {
  SESSION_TOOL_DESCRIPTION,
  SESSION_TOOL_PROMPT_SNIPPET,
  SESSION_TOOL_PROMPT_GUIDELINES,
  SESSION_TOOL_PARAMETERS,
  buildSessionToolDefinition,
} from './definition.js';

// Handoff filesystem contract helpers
export {
  DEFAULT_HANDOFF_DIR,
  DEFAULT_CONTRACT_FILE,
  DEFAULT_BUS_FILE,
  extractSessionIdFromPath,
  buildHandoffBusPaths,
} from './handoff.js';

// Concurrency primitive used by the manager
export { Mutex } from './concurrency.js';

// Formatting / rendering helpers
export { formatSession, countNodes, formatListOutput, renderTree } from './utils.js';

// Operation handlers (create/switch/list/... one folder per layer)
export * from './operations/index.js';
