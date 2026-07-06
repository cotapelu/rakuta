#!/usr/bin/env node
import { 
  createAgentSessionRuntime,
  InteractiveMode,
  runPrintMode,
  runRpcMode,
  parseArgs,
  resolveAppMode,
  SessionManager,
  createAgentSessionServices,
  createAgentSessionFromServices,
  getAgentDir,
  SettingsManager,
  ModelRegistry,
  AuthStorage,
  createProjectTrustContext,
  selectSession,
  shouldRunFirstTimeSetup,
  showFirstTimeSetup,
  showStartupSelector,
  listModels,
  // ... other imports from main.js as needed
} from "@earendil-works/pi-coding-agent";
import { setCurrentRuntime, clearCurrentRuntime } from "./addon/runtime-context.js";
import registerAllAddon from "./addon/registry.js";

/**
 * Simplified main - creates runtime and sets global context.
 * TODO: Port full main.js logic (session handling, model resolution, etc.)
 */
async function customMain() {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);
  const stdinIsTTY = process.stdin.isTTY;
  const stdoutIsTTY = process.stdout.isTTY;
  const appMode = resolveAppMode(parsed, stdinIsTTY, stdoutIsTTY);

  // Load extensions (registers all addon extensions)
  const { extensions } = registerAllAddon();

  const cwd = process.cwd();
  const agentDir = getAgentDir();

  // Auth & Model registry
  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);
  const settingsManager = SettingsManager.create(cwd, agentDir);

  // Create services
  const services = await createAgentSessionServices({
    cwd,
    agentDir,
    authStorage,
    settingsManager,
    modelRegistry,
  });

  // Create session manager with basic handling
  const sessionManager = SessionManager.create(cwd, process.env.PI_CODING_AGENT_SESSION_DIR, {
    id: parsed.sessionId,
  });

  // Runtime factory
  const createRuntime = async ({ cwd, sessionManager, sessionStartEvent }) => {
    return {
      ...(await createAgentSessionFromServices({
        services,
        sessionManager,
        sessionStartEvent,
      })),
      services,
      diagnostics: services.diagnostics,
    };
  };

  const runtime = await createAgentSessionRuntime(createRuntime, {
    cwd,
    agentDir,
    sessionManager,
  });

  // SET GLOBAL RUNTIME - quan trọng nhất!
  setCurrentRuntime(runtime);

  try {
    switch (appMode) {
      case "interactive": {
        const interactive = new InteractiveMode(runtime, {
          migratedProviders: [],
          modelFallbackMessage: undefined,
          initialMessage: undefined,
          initialImages: [],
          initialMessages: [],
        });
        await interactive.run();
        break;
      }
      case "print": {
        await runPrintMode(runtime, {
          mode: "text",
          initialMessage: undefined,
          initialImages: [],
          messages: [],
        });
        break;
      }
      case "rpc": {
        await runRpcMode(runtime);
        break;
      }
      default:
        throw new Error(`Unsupported mode: ${appMode}`);
    }
  } finally {
    clearCurrentRuntime();
  }
}

customMain().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
