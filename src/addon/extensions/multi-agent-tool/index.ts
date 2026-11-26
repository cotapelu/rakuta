import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createMultiAgentTool } from './router.js';
import { messageBus } from './message-bus.js';
import { multiAgentRuntime } from './runtime.js';

// Extension wrapper
export default function (api: ExtensionAPI) {
  api.on("session_start", async (event, ctx) => {
    api.registerTool(createMultiAgentTool());
  });
}

// Re-exports for programmatic access
export * from './types.js';
export { messageBus };
export { multiAgentRuntime };
export { createMultiAgentTool };

// Child-side tools (reportProgress / askQuestion) and parent-side ops
export {
  setCurrentChildId,
  getCurrentChildId,
  reportProgress,
  askQuestion,
} from './child-tools.js';
export {
  setRuntime,
  spawnChild,
  sendMessage,
  awaitResult,
} from './parent-tools.js';

// Tool definition fragments (description / prompt / parameters)
export {
  MULTI_AGENT_TOOL_DESCRIPTION,
  MULTI_AGENT_TOOL_PROMPT_SNIPPET,
  MULTI_AGENT_TOOL_PROMPT_GUIDELINES,
  MULTI_AGENT_TOOL_PARAMETERS,
} from './definition.js';
