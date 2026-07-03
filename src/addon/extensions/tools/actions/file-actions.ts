import type { Action } from "./types.js";

export const lsAction: Action = {
  description: "List directory contents",
  execute: async (args, cwd, signal, ctx) => {
    const { path, all = false, recursive = false } = args as { path?: string; all?: boolean; recursive?: boolean };
    const lsArgs: string[] = [];
    if (all) lsArgs.push("-la");
    else if (recursive) lsArgs.push("-lR");
    else lsArgs.push("-l");
    if (path) lsArgs.push(path);
    const targetPath = path || cwd;
    const result = await ctx!.exec("ls", lsArgs, { cwd: targetPath, signal });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, path: targetPath, all, recursive },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      path: { type: "string", description: "Directory path to list" },
      all: { type: "boolean", description: "Show hidden files" },
      recursive: { type: "boolean", description: "List recursively" }
    },
    required: []
  })
};

export const catAction: Action = {
  description: "Concatenate and print file contents",
  execute: async (args, cwd, signal, ctx) => {
    const { path } = args as { path: string };
    if (!path) throw new Error("Missing required parameter: path");
    const result = await ctx!.exec("cat", [path], { cwd, signal });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, path },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      path: { type: "string", description: "File path to read" }
    },
    required: ["path"]
  })
};
