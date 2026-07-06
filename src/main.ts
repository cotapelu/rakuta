#!/usr/bin/env node
/**
 * PiClaw Main - ONLY interactive mode, with global runtime for extensions.
 * Minimal implementation.
 */

import { setCurrentRuntime, clearCurrentRuntime } from "./addon/runtime-context.js";
import registerAllAddon from "./addon/registry.js";

import {
  createAgentSessionRuntime,
  createAgentSessionServices,
  createAgentSessionFromServices,
  SessionManager,
  SettingsManager,
  ModelRegistry,
  AuthStorage,
  getAgentDir,
  InteractiveMode,
  initTheme,
  parseArgs,
  VERSION,
} from "@earendil-works/pi-coding-agent";

import chalk from "chalk";

export default async function main() {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);

  if (parsed.version) {
    console.log(VERSION);
    return;
  }

  // Load addon extensions
  const extensionFactories = registerAllAddon().extensions;

  // Services
  const cwd = process.cwd();
  const agentDir = getAgentDir();

  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);
  const settingsManager = SettingsManager.create(cwd, agentDir);

  // Session manager (always create new session for simplicity)
  const sessionManager = SessionManager.create(cwd, undefined, { id: parsed.sessionId });

  // Runtime factory
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createRuntime = async ({ cwd, sessionManager }: any) => {
    const services = await createAgentSessionServices({
      cwd,
      agentDir,
      authStorage,
      settingsManager,
      modelRegistry,
      resourceLoaderOptions: {
        extensionFactories: extensionFactories,
      },
    });

    const sessionResult = await createAgentSessionFromServices({
      services,
      sessionManager,
    });

    return {
      ...sessionResult,
      services,
      diagnostics: services.diagnostics,
    };
  };

  // Create runtime
  const runtime = await createAgentSessionRuntime(createRuntime, {
    cwd,
    agentDir,
    sessionManager,
  });

  // SET GLOBAL RUNTIME - this is the whole purpose
  setCurrentRuntime(runtime);

  try {
    // ONLY interactive mode
    initTheme(settingsManager.getTheme(), true);
    const interactive = new InteractiveMode(runtime, {
      migratedProviders: [],
      modelFallbackMessage: undefined,
      autoTrustOnReloadCwd: undefined,
      initialMessage: undefined,
      initialImages: [],
      initialMessages: parsed.messages || [],
      verbose: parsed.verbose,
    });
    await interactive.run();
  } catch (err) {
    console.error(chalk.red("Fatal error:"), err);
    process.exit(1);
  } finally {
    clearCurrentRuntime();
  }
}

await main();
