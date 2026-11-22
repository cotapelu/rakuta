#!/usr/bin/env node
/**
 * system.health capability
 */

import { Type } from "typebox";

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
