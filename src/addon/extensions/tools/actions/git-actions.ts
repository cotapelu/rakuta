import type { Action } from "./types.js";

function runGitCommand(cwd: string, signal?: AbortSignal, ctx?: any, ...args: string[]) {
  return ctx!.exec("git", args, { cwd, signal });
}

export const gitStatusAction: Action = {
  description: "Show working tree status",
  execute: async (args, cwd, signal, ctx) => {
    const { short = false, branch = false } = args as { short?: boolean; branch?: boolean };
    const gitArgs: string[] = ["status"];
    if (short) gitArgs.push("-s");
    if (branch) gitArgs.push("-b");
    const result = await runGitCommand(cwd, signal, ctx, ...gitArgs);
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, short, branch },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      short: { type: "boolean", description: "Short format" },
      branch: { type: "boolean", description: "Show branch info" }
    },
    required: []
  })
};

export const gitLogAction: Action = {
  description: "Show commit logs",
  execute: async (args, cwd, signal, ctx) => {
    const { oneline = false, graph = false, maxCount } = args as {
      oneline?: boolean;
      graph?: boolean;
      maxCount?: number;
    };
    const gitArgs: string[] = ["log"];
    if (oneline) gitArgs.push("--oneline");
    if (graph) gitArgs.push("--graph");
    if (maxCount !== undefined) gitArgs.push(`-n${maxCount}`);
    const result = await runGitCommand(cwd, signal, ctx, ...gitArgs);
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, oneline, graph, maxCount },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      oneline: { type: "boolean", description: "One line per commit" },
      graph: { type: "boolean", description: "Show ASCII graph" },
      maxCount: { type: "number", description: "Limit number of commits" }
    },
    required: []
  })
};

export const gitDiffAction: Action = {
  description: "Show changes between commits, commit and working tree, etc.",
  execute: async (args, cwd, signal, ctx) => {
    const { staged = false, nameOnly = false } = args as { staged?: boolean; nameOnly?: boolean };
    const gitArgs: string[] = ["diff"];
    if (staged) gitArgs.push("--staged");
    if (nameOnly) gitArgs.push("--name-only");
    const result = await runGitCommand(cwd, signal, ctx, ...gitArgs);
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, staged, nameOnly },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      staged: { type: "boolean", description: "Show staged changes" },
      nameOnly: { type: "boolean", description: "Show only file names" }
    },
    required: []
  })
};

export const gitAddAction: Action = {
  description: "Add file contents to the staging area",
  execute: async (args, cwd, signal, ctx) => {
    const { files = [] as string[], all = false } = args as { files?: string[]; all?: boolean };
    const gitArgs: string[] = ["add"];
    if (all) gitArgs.push("-A");
    gitArgs.push(...files);
    const result = await runGitCommand(cwd, signal, ctx, ...gitArgs);
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, all, files },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      files: { type: "array", items: { type: "string" }, description: "Files to add" },
      all: { type: "boolean", description: "Add all changes (including deletions)" }
    },
    required: []
  })
};

export const gitCommitAction: Action = {
  description: "Record changes to the repository",
  execute: async (args, cwd, signal, ctx) => {
    const { message, all = false, amend = false } = args as {
      message?: string;
      all?: boolean;
      amend?: boolean;
    };
    const gitArgs: string[] = ["commit"];
    if (all) gitArgs.push("-a");
    if (amend) gitArgs.push("--amend");
    if (message) gitArgs.push("-m", message);
    const result = await runGitCommand(cwd, signal, ctx, ...gitArgs);
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, all, amend, hasMessage: !!message },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      message: { type: "string", description: "Commit message" },
      all: { type: "boolean", description: "Commit all changed files (-a)" },
      amend: { type: "boolean", description: "Amend previous commit" }
    },
    required: []
  })
};

export const gitPushAction: Action = {
  description: "Update remote refs along with associated objects",
  execute: async (args, cwd, signal, ctx) => {
    const { remote = "origin", branch, force = false } = args as {
      remote?: string;
      branch?: string;
      force?: boolean;
    };
    const gitArgs: string[] = ["push"];
    if (force) gitArgs.push("-f");
    gitArgs.push(remote);
    if (branch) gitArgs.push(branch);
    const result = await runGitCommand(cwd, signal, ctx, ...gitArgs);
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, remote, branch, force },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      remote: { type: "string", description: "Remote name (default: origin)" },
      branch: { type: "string", description: "Branch to push (e.g., 'main', 'feature:main')" },
      force: { type: "boolean", description: "Force push (-f)" }
    },
    required: []
  })
};

export const gitPullAction: Action = {
  description: "Fetch from and integrate with another repository",
  execute: async (args, cwd, signal, ctx) => {
    const { remote = "origin", branch, rebase = false } = args as {
      remote?: string;
      branch?: string;
      rebase?: boolean;
    };
    const gitArgs: string[] = ["pull"];
    if (rebase) gitArgs.push("--rebase");
    gitArgs.push(remote);
    if (branch) gitArgs.push(branch);
    const result = await runGitCommand(cwd, signal, ctx, ...gitArgs);
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, remote, branch, rebase },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      remote: { type: "string", description: "Remote name", default: "origin" },
      branch: { type: "string", description: "Branch to pull" },
      rebase: { type: "boolean", description: "Rebase instead of merge" }
    },
    required: []
  })
};
