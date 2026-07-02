#!/usr/bin/env node
/**
 * Find Command - Search for files/directories by name pattern
 * (like Unix 'find' command)
 */

import { Type } from "typebox";
import { promises as fs } from "fs";
import { join, relative, sep } from "path";
import { minimatch } from "minimatch"; // named import
import { Text } from "@earendil-works/pi-tui";

export const metadata = {
  name: "find",
  category: "fs",
  description: "Find files and directories by name pattern",
  longDescription: `
Recursively search for files and directories matching name patterns.
Similar to Unix 'find' command but using glob patterns.

Supports:
- Name patterns with wildcards (*, ?, **)
- Filter by type (file, directory, symlink)
- Min/max depth control
- Exclusion patterns
- Limit results
  `.trim(),
  examples: [
    "master_tool({ command: 'find', args: { pattern: '**/*.ts' } })",
    "master_tool({ command: 'find', args: { pattern: '*.test.*', type: 'file' } })",
    "master_tool({ command: 'find', args: { pattern: '**/*', exclude: ['**/node_modules/**'], maxDepth: 3 } })"
  ],
  tags: ["fs", "search", "filesystem"],
  permissions: ["fs:read"]
};

export const schema = Type.Object({
  pattern: Type.String({ description: "Glob pattern for file/directory names (required)" }),
  cwd: Type.Optional(Type.String({ description: "Base directory to search (default: current working directory)" })),
  type: Type.Optional(Type.Union([
    Type.Literal("file"),
    Type.Literal("dir"),
    Type.Literal("all")
  ], { description: "Filter by type: 'file', 'dir', or 'all' (default: 'file')" })),
  exclude: Type.Optional(Type.Array(Type.String(), { description: "Glob patterns to exclude" })),
  minDepth: Type.Optional(Type.Integer({ description: "Minimum directory depth (0 = base dir)" })),
  maxDepth: Type.Optional(Type.Integer({ description: "Maximum directory depth (0 = no recursion)" })),
  limit: Type.Optional(Type.Integer({ description: "Maximum number of results (0 = unlimited)" })),
  absolute: Type.Optional(Type.Boolean({ description: "Return absolute paths (default: false)" }))
}, { additionalProperties: false });

interface FindResult {
  files: string[];
  total: number;
  durationMs: number;
}

function getDepth(baseDir: string, targetPath: string): number {
  const rel = relative(baseDir, targetPath);
  if (!rel || rel === '.') return 0;
  return rel.split(sep).length;
}

async function findRecursive(
  dir: string,
  baseDir: string,
  pattern: string,
  options: {
    type: 'file' | 'dir' | 'all';
    exclude: string[];
    minDepth: number;
    maxDepth: number;
    limit: number;
    absolute: boolean;
    signal?: AbortSignal;
  },
  currentDepth: number = 0,
  matches: string[] = []
): Promise<string[]> {
  if (options.signal?.aborted) throw new Error('Cancelled');

  // Depth check
  if (options.maxDepth !== undefined && currentDepth > options.maxDepth) {
    return matches;
  }

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (options.signal?.aborted) throw new Error('Cancelled');

      const fullPath = join(dir, entry.name);
      const relPath = relative(baseDir, fullPath);
      const normalizedRel = relPath.split(sep).join('/');

      // Check excludes
      if (options.exclude.some(excl => minimatch(normalizedRel, excl, { dot: true }) || minimatch(`${normalizedRel}/**`, excl, { dot: true }))) {
        continue;
      }

      const isDir = entry.isDirectory();
      const isFile = entry.isFile();
      const isSymlink = entry.isSymbolicLink();

      // Determine if this entry matches type filter
      let typeMatches = false;
      if (options.type === 'all') {
        typeMatches = true;
      } else if (options.type === 'file' && isFile) {
        typeMatches = true;
      } else if (options.type === 'dir' && isDir) {
        typeMatches = true;
      }

      // Check name pattern
      const depth = getDepth(baseDir, fullPath);
      const name = entry.name;

      // Use minimatch on the relative path
      const patternMatches = minimatch(normalizedRel, pattern, { dot: true });

      // Apply minDepth
      if (depth >= options.minDepth && patternMatches && typeMatches) {
        matches.push(fullPath);
        if (options.limit > 0 && matches.length >= options.limit) {
          return matches;
        }
      }

      // Recurse into directories (but not symlinks to avoid loops)
      if (isDir) {
        await findRecursive(fullPath, baseDir, pattern, options, currentDepth + 1, matches);
      }
    }

    return matches;
  } catch (error: any) {
    // Skip directories we can't read
    if (error.code === 'EACCES' || error.code === 'ENOENT') {
      return matches;
    }
    throw error;
  }
}

export async function execute(
  args: {
    pattern: string;
    cwd?: string;
    type?: 'file' | 'dir' | 'all';
    exclude?: string[];
    minDepth?: number;
    maxDepth?: number;
    limit?: number;
    absolute?: boolean;
  },
  cwd: string,
  signal?: AbortSignal,
  ctx?: any
): Promise<{ code: number; stdout: string; stderr: string; data?: FindResult }> {
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
    const type = args.type ?? 'file';
    const exclude = args.exclude ?? [];
    const minDepth = args.minDepth ?? 0;
    const maxDepth = args.maxDepth ?? Number.MAX_SAFE_INTEGER;
    const limit = args.limit ?? 0;

    // Validate baseDir exists
    try {
      const stat = await fs.stat(baseDir);
      if (!stat.isDirectory()) {
        return {
          code: 1,
          stdout: "",
          stderr: `Not a directory: ${baseDir}`,
          data: undefined
        };
      }
    } catch {
      return {
        code: 1,
        stdout: "",
        stderr: `Directory not found: ${baseDir}`,
        data: undefined
      };
    }

    const matches = await findRecursive(
      baseDir,
      baseDir,
      args.pattern,
      {
        type,
        exclude,
        minDepth,
        maxDepth,
        limit,
        absolute: args.absolute ?? false,
        signal
      }
    );

    // Format output
    const displayMatches = args.absolute
      ? matches
      : matches.map(m => relative(cwd, m));

    const duration = Date.now() - startTime;
    const result: FindResult = {
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
      stderr: `Find error: ${error.message}`,
      data: undefined
    };
  }
}

// Custom renderer
export function renderResult(result: any, options: any, theme: any): any {
  if (result.code !== 0) {
    return new Text(theme.fg("error", `❌ ${result.stderr}`));
  }

  const data = result.data as FindResult | undefined;
  if (!data) {
    return new Text(theme.fg("text", result.stdout || "No results"));
  }

  const lines: string[] = [];
  lines.push(theme.fg("accent", `🔎 Find:`));
  lines.push(`Pattern: ${theme.fg("highlight", "(*)")} ${theme.text(result.data?.pattern || '')}`);
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
