import type { Action } from "./types.js";

export const dfAction: Action = {
  description: "Report file system disk space usage",
  execute: async (args, cwd, signal, ctx) => {
    const { human = true, all = false } = args as { human?: boolean; all?: boolean };
    const dfArgs: string[] = [];
    if (all) dfArgs.push("-a");
    if (human) dfArgs.push("-h");
    const result = await ctx!.exec("df", dfArgs, { cwd, signal });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, human, all },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      human: { type: "boolean", description: "Human readable sizes" },
      all: { type: "boolean", description: "Include dummy file systems" }
    },
    required: []
  })
};

export const duAction: Action = {
  description: "Estimate file space usage",
  execute: async (args, cwd, signal, ctx) => {
    const { path, human = true, summarize = false } = args as {
      path?: string;
      human?: boolean;
      summarize?: boolean;
    };
    const duArgs: string[] = [];
    if (human) duArgs.push("-h");
    if (summarize) duArgs.push("-s");
    if (path) duArgs.push(path);
    const targetPath = path || cwd;
    const result = await ctx!.exec("du", duArgs, { cwd, signal });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, path: targetPath, human, summarize },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      path: { type: "string", description: "Target path" },
      human: { type: "boolean", description: "Human readable sizes" },
      summarize: { type: "boolean", description: "Show total only" }
    },
    required: []
  })
};
