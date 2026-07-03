import type { Action } from "./types.js";

export const grepAction: Action = {
  description: "Search for patterns in files (grep)",
  execute: async (args, cwd, signal, ctx) => {
    const { pattern, path = cwd, ignoreCase = false, recursive = true } = args as {
      pattern: string;
      path?: string;
      ignoreCase?: boolean;
      recursive?: boolean;
    };
    const grepArgs: string[] = [];
    if (ignoreCase) grepArgs.push("-i");
    if (recursive) grepArgs.push("-r");
    grepArgs.push(pattern);
    grepArgs.push(path);
    const result = await ctx!.exec("grep", grepArgs, { cwd, signal });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, pattern, path, ignoreCase, recursive },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      pattern: { type: "string", description: "Search pattern (regex)" },
      path: { type: "string", description: "Search directory or file" },
      ignoreCase: { type: "boolean", description: "Case-insensitive search" },
      recursive: { type: "boolean", description: "Search recursively" }
    },
    required: ["pattern"]
  })
};

export const findAction: Action = {
  description: "Search for files and directories (find)",
  execute: async (args, cwd, signal, ctx) => {
    const { path = cwd, name } = args as { path?: string; name?: string };
    const findArgs: string[] = [path || cwd];
    if (name) findArgs.push("-name", name);
    const result = await ctx!.exec("find", findArgs, { cwd, signal });
    return {
      content: [{ type: "text", text: result.stdout.trim() }],
      details: { exitCode: result.code, killed: result.killed, path, name },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      path: { type: "string", description: "Search starting path" },
      name: { type: "string", description: "Name pattern (e.g., '*.ts')" }
    },
    required: []
  })
};
