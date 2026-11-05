#!/usr/bin/env node

/**
 * Our Free Model (ofm-provider) Registration
 *
 * Wires the self-contained ofm-provider extension in ./ofm-provider into tau's
 * bundled extension, so the keyless free-model lanes, the token saver, and the
 * /ofm command are available on every run without a separate `pi install`:
 *
 *   ofm-kilo      Kilo AI's public gateway free pool — no credential at all
 *   ofm-opencode  OpenCode's public free tier — pooled credential + fingerprint
 *   /ofm          status | refresh | saver [on|off|stats] | chain [add|set|remove|enable|disable]
 *
 * The ofm-provider default export is itself a pi extension factory; calling it
 * from the aggregator is exactly the registration pi performs for an installed
 * package (registerProvider + registerVirtualModel + registerCommand + on()).
 * The call is awaited so the freshly fetched rosters are visible to startup
 * model selection, and it is isolated: a failing lane is logged and swallowed,
 * never allowed to take the rest of tau's extensions down with it.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import ofmProvider from "./ofm-provider/index.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("ofm-provider");

/** Lanes registered in this process; the aggregator must not double-register. */
let registered = false;

/**
 * Register the ofm free-model lanes and the /ofm command on the given ExtensionAPI.
 *
 * Idempotent within a process (registerProvider would otherwise be invoked
 * twice for the same provider id if the aggregator ran again), and never
 * throws: a failing lane is reported through the logger so tau still boots.
 */
export async function registerOfmProvider(api: ExtensionAPI): Promise<void> {
  if (registered) return;
  try {
    await ofmProvider(api);
    registered = true;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    log.error(`failed to register the ofm-provider lanes (ofm-kilo, ofm-opencode): ${reason}`);
  }
}
