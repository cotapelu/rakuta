#!/usr/bin/env node
import { setCurrentRuntime, clearCurrentRuntime } from "./addon/runtime-context.js";
import registerAllAddon from "./addon/registry.js";
import { detectProjectProfile, writeProjectProfile } from "./project-profile.js";
// @ts-ignore
import { main as sdkMain } from "./vendor/sdk-main.mjs";

export default async function main(): Promise<void> {
  const addon = registerAllAddon();
  const extensionFactories = addon.extensions;

  (globalThis as any).__rakuta_set_runtime = (runtime: any) => { console.error("[RAKUTA] set runtime hook called");
    setCurrentRuntime(runtime);
  };

  try {
    const profile = await detectProjectProfile(process.cwd());
    await writeProjectProfile(profile);
    console.log("[RAKUTA] Project profile detected:", {
      size: profile.size,
      risk: profile.risk,
      deployment: profile.deployment,
      team: profile.team,
    });
  } catch (err) {
    console.warn("[RAKUTA] Project profile detection failed:", err);
  }

  await sdkMain(process.argv.slice(2), { extensionFactories });
  clearCurrentRuntime();
}

await main();
