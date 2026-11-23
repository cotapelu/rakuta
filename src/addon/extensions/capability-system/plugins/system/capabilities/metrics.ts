#!/usr/bin/env node
/**
 * system.metrics capability
 *
 * Collects codebase metrics: file counts, lines, functions, etc.
 */

import { Type } from "typebox";
import { promises as fs } from "fs";
import { join } from "path";

export const schema = Type.Object({}, { additionalProperties: false });

async function collectFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage' || entry.name === '.git') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await collectFiles(full));
    else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) out.push(full);
  }
  return out;
}

export async function execute(params: Record<string, never>, ctx: any): Promise<any> {
  const cwd = ctx.cwd || process.cwd();
  const srcDir = join(cwd, 'src');
  let fileCount = 0;
  let totalLines = 0;
  try {
    const files = await collectFiles(srcDir);
    for (const file of files) {
      fileCount++;
      const content = await fs.readFile(file, 'utf-8');
      totalLines += content.split('\n').length;
    }
  } catch {
    // src may not exist
  }
  const result = {
    srcFiles: fileCount,
    totalLines,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
  };
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    details: result,
    isError: false,
  };
}

export default { execute, schema };
