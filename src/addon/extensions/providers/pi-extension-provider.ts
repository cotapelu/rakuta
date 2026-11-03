#!/usr/bin/env node

/**
 * Our Free Model (pi-extension) Registration
 *
 * Wires the self-contained pi extension in ./pi-extension into tau's bundled
 * extension (package.json "pi.extensions" -> dist/addon/index.js), so the two
 * keyless free-model lanes and the fallback chains are available on every run
 * without a separate `pi install ./pi-extension`:
 *
 *   ofm-kilo      Kilo AI's public gateway free pool — no credential at all
 *   ofm-opencode  OpenCode's public free tier — pooled credential + fingerprint
 *   ofm-chain     fallback/round-robin chains over both lanes
 *
 * The pi-extension default export is itself a pi extension factory; calling it
 * from the aggregator is exactly the registration pi performs for an installed
 * package (registerProvider + registerVirtualModel + registerCommand + on()).
 * The call is awaited so the freshly fetched rosters are visible to startup
 * model selection, and it is isolated: a failure on the free lanes (a bug, or
 * an environment pi's own fetch cannot reach) is logged and swallowed, never
 * allowed to take the rest of tau's extensions down with it. An offline
 * snapshot keeps both lanes' models present when the listing cannot be
 * fetched, so the catch path is a last resort, not the norm.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import piExtension from "./pi-extension/index.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("pi-extension");

/** Lanes registered in this process; the aggregator must not double-register. */
let registered = false;

/**
 * Register the free-model lanes and chains on the given ExtensionAPI.
 *
 * Idempotent within a process (registerProvider would otherwise be invoked
 * twice for the same provider id if the aggregator ran again), and never
 * throws: a failing lane is reported through the logger so tau still boots.
 */
export async function registerPiExtensionProvider(api: ExtensionAPI): Promise<void> {
  if (registered) return;
  try {
    await piExtension(api);
    registered = true;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    log.error(`failed to register the ofm free-model lanes (ofm-kilo, ofm-opencode): ${reason}`);
  }
}
