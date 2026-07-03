import type { Action } from "./types.js";

export const psAction: Action = {
  description: "List processes (ps aux)",
  execute: async (args, cwd, signal, ctx) => {
    const { format = "aux" } = args as { format?: string };
    const result = await ctx!.exec("ps", [format], { cwd, signal });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, format },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      format: { type: "string", description: "ps format options (e.g., 'aux', 'ef')" }
    },
    required: []
  })
};

export const killAction: Action = {
  description: "Kill a process by PID",
  execute: async (args, cwd, signal, ctx) => {
    const { pid, signal: sig = "TERM" } = args as { pid: number; signal?: string };
    const result = await ctx!.exec("kill", [`-${sig}`, String(pid)], { cwd, signal });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, pid, signal: sig },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      pid: { type: "number", description: "Process ID to kill" },
      signal: { type: "string", description: "Signal to send (TERM, KILL, HUP, etc.)" }
    },
    required: ["pid"]
  })
};
