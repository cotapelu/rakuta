#!/usr/bin/env node
/**
 * Glob Command - Find files using glob patterns
 * Category: glob
 */

import { Type } from "typebox";
import { promises as fs } from "fs";
import { join, relative, sep } from "path";
import { minimatch } from "minimatch";
import { Text } from "@earendil-works/pi-tui";

export const metadata = {
  name: "glob",
  category: "glob",
  description: "Find files/directories matching glob patterns",
  longDescription: `
Recursively find files and directories using glob patterns.
Uses minimatch for pattern matching (supports **, *, ?, [], {} etc.).

Examples of patterns:
  "**/*.ts"        → all TypeScript files
  "src/**/*.test.*" → test files in src
  "!**/node_modules/**" → exclude patterns via 'exclude' option
  `.trim(),
  examples: [
    "master_tool({ command: 'glob', args: { pattern: '**/*.ts' } })",
    "master_tool({ command: 'glob', args: { pattern: 'src/**/*.test.*', cwd: '.' } })",
    "master_tool({ command: 'glob', args: { pattern: '**/*', exclude: ['**/node_modules/**', '**/.git/**'] } })"
  ],
  tags: ["glob", "filesystem", "search"],
  permissions: ["fs:read"],
  experimental: false
};

export const schema = Type.Object({
  pattern: Type.String({ description: "Glob pattern (required). E.g., '**/*.ts', 'src/**/*.js'" }),
  cwd: Type.Optional(Type.String({ description: "Base directory to search (default: current working directory)" })),
  exclude: Type.Optional(Type.Array(Type.String(), { description: "Array of glob patterns to exclude" })),
  includeDirs: Type.Optional(Type.Boolean({ description: "Include directories in results (default: false)" })),
  limit: Type.Optional(Type.Integer({ description: "Maximum number of results (0 = unlimited)" })),
  absolute: Type.Optional(Type.Boolean({ description: "Return absolute paths instead of relative (default: false)" }))
}, { additionalProperties: false });

interface GlobResult {
  files: string[];
  total: number;
  durationMs: number;
}

async function walkDir(
  dir: string,
  baseDir: string,
  pattern: string,
  exclude: string[],
  includeDirs: boolean,
  limit: number,
  signal?: AbortSignal,
  matches: string[] = []
): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (signal?.aborted) throw new Error('Cancelled');

    const fullPath = join(dir, entry.name);
    const relPath = relative(baseDir, fullPath);

    // Normalize to forward slashes for minimatch
    const normalizedRel = relPath.split(sep).join('/');

    // Check excludes
    const isExcluded = exclude.some(excl => minimatch(normalizedRel, excl, { dot: true }) || minimatch(`${normalizedRel}/**`, excl, { dot: true }));
    if (isExcluded) continue;

    if (entry.isDirectory()) {
      if (includeDirs && minimatch(normalizedRel, pattern, { dot: true })) {
        matches.push(fullPath);
        if (limit > 0 && matches.length >= limit) return matches;
      }
      // Recurse into subdirectory
      await walkDir(fullPath, baseDir, pattern, exclude, includeDirs, limit, signal, matches);
    } else {
      if (minimatch(normalizedRel, pattern, { dot: true })) {
        matches.push(fullPath);
        if (limit > 0 && matches.length >= limit) return matches;
      }
    }
  }

  return matches;
}

export async function execute(
  args: {
    pattern: string;
    cwd?: string;
    exclude?: string[];
    includeDirs?: boolean;
    limit?: number;
    absolute?: boolean;
  },
  cwd: string,
  signal?: AbortSignal,
  ctx?: any
): Promise<{ code: number; stdout: string; stderr: string; data?: GlobResult }> {
  const startTime = Date.now();

  try {
    if (!args.pattern) {
      return {
        code: 1,
        stdout: "",
        stderr: "Missing required parameter: pattern",
        data: undefined
      };
    }

    const baseDir = args.cwd ?? cwd;
    const limit = args.limit ?? 0;
    const exclude = args.exclude ?? [];
    const includeDirs = args.includeDirs ?? false;

    // Validate baseDir exists
    try {
      await fs.access(baseDir);
    } catch {
      return {
        code: 1,
        stdout: "",
        stderr: `Directory not found: ${baseDir}`,
        data: undefined
      };
    }

    const matches = await walkDir(
      baseDir,
      baseDir,
      args.pattern,
      exclude,
      includeDirs,
      limit,
      signal
    );

    // Format output
    const displayMatches = matches.map(m => {
      if (args.absolute) return m;
      return relative(cwd, m);
    });

    const duration = Date.now() - startTime;
    const result: GlobResult = {
      files: displayMatches,
      total: matches.length,
      durationMs: duration
    };

    return {
      code: 0,
      stdout: displayMatches.join('\n'),
      stderr: "",
      data: result
    };

  } catch (error: any) {
    if (error.message === 'Cancelled') {
      return { code: 1, stdout: "", stderr: 'Cancelled', data: undefined };
    }
    return {
      code: 1,
      stdout: "",
      stderr: `Glob error: ${error.message}`,
      data: undefined
    };
  }
}

// Custom renderer
export function renderResult(result: any, options: any, theme: any): any {
  if (result.code !== 0) {
    return new Text(theme.fg("error", `❌ ${result.stderr}`));
  }

  const data = result.data as GlobResult | undefined;
  if (!data) {
    return new Text(theme.fg("text", result.stdout || "No results"));
  }

  const lines: string[] = [];
  lines.push(theme.fg("accent", `🔍 Glob Search:`));
  lines.push(`Pattern: ${theme.fg("highlight", "(*)" )} ${theme.text(result.data?.pattern || '')}`);
  lines.push(`Found: ${theme.fg(data.total > 0 ? "success" : "muted", data.total.toString())} item(s)`);
  lines.push(`Time: ${theme.fg("dim", `${data.durationMs}ms`)}`);

  if (data.files.length > 0) {
    lines.push("");
    const maxShow = 20;
    const toShow = data.files.slice(0, maxShow);
    toShow.forEach(f => lines.push(`  ${theme.fg("text", f)}`));
    if (data.files.length > maxShow) {
      lines.push(theme.fg("dim", `  ...and ${data.files.length - maxShow} more`));
    }
  } else {
    lines.push(theme.fg("muted", "  (no matches)"));
  }

  return new Text(lines.join("\n"));
}

export const StateClass = undefined;
export const getPersistencePath = undefined;
