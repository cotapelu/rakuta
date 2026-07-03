import type { Action } from "./types.js";

function runDockerCommand(cwd: string, signal?: AbortSignal, ctx?: any, ...args: string[]) {
  return ctx!.exec("docker", args, { cwd, signal });
}

export const dockerPsAction: Action = {
  description: "List Docker containers",
  execute: async (args, cwd, signal, ctx) => {
    const { all = false, quiet = false } = args as { all?: boolean; quiet?: boolean };
    const dockerArgs: string[] = ["ps"];
    if (all) dockerArgs.push("-a");
    if (quiet) dockerArgs.push("-q");
    const result = await runDockerCommand(cwd, signal, ctx, ...dockerArgs);
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, all, quiet },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      all: { type: "boolean", description: "Show all containers (including stopped)" },
      quiet: { type: "boolean", description: "Only display numeric IDs" }
    },
    required: []
  })
};

export const dockerImagesAction: Action = {
  description: "List Docker images",
  execute: async (args, cwd, signal, ctx) => {
    const { all = false, quiet = false } = args as { all?: boolean; quiet?: boolean };
    const dockerArgs: string[] = ["images"];
    if (all) dockerArgs.push("-a");
    if (quiet) dockerArgs.push("-q");
    const result = await runDockerCommand(cwd, signal, ctx, ...dockerArgs);
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, all, quiet },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      all: { type: "boolean", description: "Show all images (including intermediate)" },
      quiet: { type: "boolean", description: "Only show numeric IDs" }
    },
    required: []
  })
};
