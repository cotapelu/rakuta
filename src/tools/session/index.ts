import type { ExtensionAPI, ToolDefinition } from '@earendil-works/pi-coding-agent';
import { MultiSessionManager } from './manager.js';
import { createSessionToolRouter } from './router.js';
import { getCurrentRuntime } from '../../addon/runtime-context.js';

let manager: MultiSessionManager | null = null;

export function initializeSessionTool(): void {
  if (manager) return;
  const runtime = getCurrentRuntime();
  manager = new MultiSessionManager(runtime, {
    allowMultipleChildren: true,
    maxSessions: 0,
  });
  console.log('Session tool initialized');
}

export function resolveManager(): MultiSessionManager {
  if (!manager) {
    initializeSessionTool();
    if (!manager) throw new Error('Session tool not initialized');
  }
  return manager;
}

export function resetSessionTool(): void {
  manager = null;
}

export function createSessionTool(): ToolDefinition {
  return createSessionToolRouter({ initialize: resolveManager });
}

// Extension wrapper
export function registerJFSessionTool(api: ExtensionAPI) {
  api.on("session_start", async (_event, _ctx) => {
    api.registerTool(createSessionTool());
  });
}

export default registerJFSessionTool;
