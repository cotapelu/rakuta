/**
 * Path Security Utilities
 *
 * Prevents path traversal attacks by ensuring all file operations
 * stay within the allowed working directory.
 */

import { resolve, dirname, basename, sep } from 'path';
import { realpathSync, existsSync } from 'fs';

/**
 * Normalizes and validates that a user-provided path resolves within the cwd.
 * 
 * @param cwd - The current working directory (base allowed path)
 * @param userPath - User-provided file path (relative or absolute)
 * @returns The resolved absolute path (guaranteed within cwd)
 * @throws Error if path resolves outside cwd or attempts traversal
 */
export function resolveSecurePath(cwd: string, userPath: string): string {
  if (!userPath || typeof userPath !== 'string') {
    throw new Error('Invalid path: must be a non-empty string');
  }

  // Resolve to absolute path
  const absoluteCwd = resolve(cwd);
  let absolutePath: string;

  try {
    absolutePath = resolve(absoluteCwd, userPath);
  } catch {
    throw new Error(`Invalid path: ${userPath}`);
  }

  // Resolve symlinks: use realpathSync on the existing portion of the path.
  // If the full path exists, resolve it fully. Otherwise, resolve the parent
  // directory and append the basename. This prevents symlink-based traversal.
  let realCwd: string;
  let realPath: string;
  try {
    realCwd = realpathSync(absoluteCwd);
  } catch {
    realCwd = absoluteCwd;
  }
  try {
    if (existsSync(absolutePath)) {
      realPath = realpathSync(absolutePath);
    } else {
      // File doesn't exist yet (e.g., new file write): resolve parent dir
      const parentDir = dirname(absolutePath);
      if (existsSync(parentDir)) {
        realPath = resolve(realpathSync(parentDir), basename(absolutePath));
      } else {
        realPath = absolutePath;
      }
    }
  } catch {
    realPath = absolutePath;
  }

  // Check resolved (symlink-aware) path against real cwd
  let normalizedCwd: string;
  if (realCwd.endsWith(sep)) {
    normalizedCwd = realCwd;
  } else {
    normalizedCwd = realCwd + sep;
  }
  let normalizedPath: string;
  if (realPath.endsWith(sep)) {
    normalizedPath = realPath;
  } else {
    normalizedPath = realPath + sep;
  }

  if (!normalizedPath.startsWith(normalizedCwd)) {
    throw new Error(`Access denied: path '${userPath}' is outside working directory`);
  }

  // Additional check: prevent '..' in real path segments (defense in depth)
  const pathSegments = realPath.split(sep);
  for (const segment of pathSegments) {
    if (segment === '..') {
      throw new Error(`Access denied: path '${userPath}' contains parent directory reference`);
    }
  }

  return absolutePath;
}

/**
 * Validates an array of file paths all within cwd.
 * 
 * @param cwd - Current working directory
 * @param paths - Array of user-provided paths
 * @returns Array of resolved absolute paths
 */
export function resolveSecurePaths(cwd: string, paths: string[]): string[] {
  return paths.map(p => resolveSecurePath(cwd, p));
}
