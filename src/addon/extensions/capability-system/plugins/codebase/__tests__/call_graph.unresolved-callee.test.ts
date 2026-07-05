import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { execute } from '../capabilities/call_graph';

const __filename = fileURLToPath(import.meta.url);

describe('codebase.call_graph unresolved callee', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = await fs.mkdtemp('callgraph-unresolved-');
    process.chdir(tmpDir);
    tmpDir = process.cwd();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('ignores calls to undefined functions', async () => {
    const code = `
function caller() {
  missing(); // undefined
}
    `;
    await fs.writeFile('a.ts', code);
    const ctx = { cwd: tmpDir };
    const result = await execute({ file: 'a.ts', query: { includeCrossFile: false } }, ctx as any);
    expect(result.isError).toBe(false);
    const details = result.details as any;
    expect(details.result.nodes.length).toBe(1);
    expect(details.result.nodes[0].name).toBe('caller');
    expect(details.result.edges.length).toBe(0);
  });
});
