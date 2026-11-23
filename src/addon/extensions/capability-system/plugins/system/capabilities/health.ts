#!/usr/bin/env node
/**
 * system.health capability
 */

import { Type } from "typebox";
import { getGlobalLoader } from "../../../plugin-loader.js";
import { getSessionManager } from "../../../../session-tool/index.js";

export const schema = Type.Object({}, { additionalProperties: false });

export async function execute(params: Record<string, never>, ctx: any): Promise<any> {
  const checks: Record<string, { status: string; detail?: string }> = {};
  let overall = "healthy";

  // Check 1: Node.js runtime
  try {
    checks.node = { status: "ok", detail: process.version };
  } catch (e) {
    checks.node = { status: "error", detail: String(e) };
    overall = "unhealthy";
  }

  // Check 2: Memory usage
  try {
    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
    checks.memory = { status: heapUsedMB < heapTotalMB * 0.9 ? "ok" : "warning", detail: `${heapUsedMB}MB / ${heapTotalMB}MB` };
    if (checks.memory.status === "warning") overall = "degraded";
  } catch (e) {
    checks.memory = { status: "error", detail: String(e) };
    overall = "unhealthy";
  }

  // Check 3: Uptime
  try {
    const uptime = Math.round(process.uptime());
    checks.uptime = { status: "ok", detail: `${uptime}s` };
  } catch (e) {
    checks.uptime = { status: "error", detail: String(e) };
    overall = "unhealthy";
  }

  // Check 4: Session manager
  try {
    const sm = getSessionManager();
    if (sm) {
      checks.sessionManager = { status: "ok", detail: `active sessions available` };
    } else {
      checks.sessionManager = { status: "warning", detail: "not initialized" };
      if (overall === "healthy") overall = "degraded";
    }
  } catch (e) {
    checks.sessionManager = { status: "error", detail: String(e) };
    overall = "unhealthy";
  }

  // Check 5: Plugin loader
  try {
    const loader = getGlobalLoader();
    if (loader) {
      const stats = loader.getStats();
      checks.pluginLoader = { status: "ok", detail: `${stats.totalPlugins} plugins, ${stats.totalCapabilities} capabilities` };
    } else {
      checks.pluginLoader = { status: "warning", detail: "not initialized" };
      if (overall === "healthy") overall = "degraded";
    }
  } catch (e) {
    checks.pluginLoader = { status: "error", detail: String(e) };
    overall = "unhealthy";
  }

  // Check 6: Provider connectivity (basic: env keys present)
  try {
    const hasProviderKey = Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.KILO_API_KEY);
    checks.providerConnectivity = { status: hasProviderKey ? "ok" : "warning", detail: hasProviderKey ? "provider credentials present" : "no provider credentials detected" };
    if (!hasProviderKey && overall === "healthy") overall = "degraded";
  } catch (e) {
    checks.providerConnectivity = { status: "error", detail: String(e) };
    overall = "unhealthy";
  }

  const result = {
    status: overall,
    timestamp: new Date().toISOString(),
    checks,
  };

  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    details: result,
    isError: overall === "unhealthy",
  };
}

export default { execute, schema };
