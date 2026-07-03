import type { Action } from "./types.js";

function runPkgCmd(cwd: string, cmd: string, signal?: AbortSignal, ctx?: any, ...args: string[]) {
  return ctx!.exec(cmd, args, { cwd, signal });
}

export const npmAction: Action = {
  description: "Node package manager (npm)",
  execute: async (args, cwd, signal, ctx) => {
    const { install = false, global = false, packages = [] as string[] } = args as {
      install?: boolean;
      global?: boolean;
      packages?: string[];
    };
    const npmArgs: string[] = [];
    if (install) npmArgs.push("install");
    if (global) npmArgs.push("-g");
    npmArgs.push(...packages);
    if (npmArgs.length === 0) throw new Error("npm requires an operation");
    const result = await runPkgCmd(cwd, "npm", signal, ctx, ...npmArgs);
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, install, global, packages },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      install: { type: "boolean", description: "Install packages" },
      global: { type: "boolean", description: "Global install" },
      packages: { type: "array", items: { type: "string" }, description: "Package names" }
    },
    required: []
  })
};

export const aptAction: Action = {
  description: "Debian/Ubuntu package manager (apt-get)",
  execute: async (args, cwd, signal, ctx) => {
    const { update = false, install = [] as string[] } = args as { update?: boolean; install?: string[] };
    const aptArgs: string[] = [];
    if (update) aptArgs.push("update");
    if (install.length > 0) aptArgs.push("install", ...install);
    if (aptArgs.length === 0) throw new Error("apt requires an operation");
    const result = await runPkgCmd(cwd, "apt-get", signal, ctx, ...aptArgs);
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, update, install },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      update: { type: "boolean", description: "Update package lists" },
      install: { type: "array", items: { type: "string" }, description: "Packages to install" }
    },
    required: []
  })
};
