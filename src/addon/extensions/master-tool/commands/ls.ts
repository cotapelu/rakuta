#!/usr/bin/env node
/**
 * LS Command - List directory contents
 * Category: fs
 */

import { Type } from "typebox";
import { Text } from "@earendil-works/pi-tui";

export const metadata = {
  name: "ls",
  category: "fs",
  description: "List directory contents (like 'ls' or 'dir' command)",
  longDescription: `
Lists files and directories in the specified path (default: current directory).
Supports common flags like showing hidden files, long format, etc.
Cross-platform: uses system 'ls' on Unix/macOS and 'dir' on Windows.
  `.trim(),
  examples: [
    "master_tool({ command: 'ls', args: {} })",
    "master_tool({ command: 'ls', args: { path: '/home', all: true, long: true } })"
  ],
  tags: ["fs", "filesystem", "list"],
  permissions: ["fs:read"]
};

export const schema = Type.Object({
  path: Type.Optional(Type.String({ description: "Directory path to list (default: current working directory)" })),
  all: Type.Optional(Type.Boolean({ description: "Show hidden files (Unix: -a, Windows: /a)" })),
  long: Type.Optional(Type.Boolean({ description: "Use long format (Unix: -l, Windows: /Q)" })),
  oneLine: Type.Optional(Type.Boolean({ description: "One entry per line (Unix: -1, Windows: /b)" }))
}, { additionalProperties: false });

export async function execute(
  args: { path?: string; all?: boolean; long?: boolean; oneLine?: boolean },
  cwd: string,
  signal?: AbortSignal,
  ctx?: any
): Promise<{ code: number; stdout: string; stderr: string; data?: any }> {
  const targetPath = args.path ?? cwd;

  // Build command based on platform
  const isWindows = process.platform === 'win32';
  const cmd = isWindows ? 'cmd' : 'ls';
  const cmdArgs: string[] = [];

  if (isWindows) {
    // Windows: use cmd /c dir
    cmdArgs.push('/c', 'dir');
    if (args.oneLine) {
      cmdArgs.push('/b'); // bare format (just names)
    }
    if (args.long) {
      cmdArgs.push('/Q'); // show owner
    }
    if (args.all) {
      cmdArgs.push('/a'); // show all files including hidden/system
    }
    // Quote path to handle spaces
    cmdArgs.push('"' + targetPath.replace(/"/g, '""') + '"');
  } else {
    // Unix: use ls
    if (args.oneLine) cmdArgs.push('-1');
    if (args.long) cmdArgs.push('-l');
    if (args.all) cmdArgs.push('-a');
    // If none specified, ls default may be multi-column; it's okay.
    cmdArgs.push(targetPath);
  }

  try {
    const result = await ctx?.exec?.(cmd, cmdArgs, { cwd, signal })
      ?? { code: 0, stdout: "", stderr: "" };

    return {
      code: result.code,
      stdout: result.stdout,
      stderr: result.stderr,
      data: undefined
    };
  } catch (error: any) {
    return {
      code: 1,
      stdout: "",
      stderr: `ls error: ${error.message}`,
      data: undefined
    };
  }
}

// No custom renderer needed; default output is fine
export const StateClass = undefined;
export const getPersistencePath = undefined;
