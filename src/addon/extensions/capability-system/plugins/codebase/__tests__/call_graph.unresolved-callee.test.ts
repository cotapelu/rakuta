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

  it('handles import with missing export (no edge created)', async () => {
    // a.ts imports { x } from './b' and calls x(). b.ts does not export x.
    await fs.writeFile('a.ts', `import { x } from './b';
function a() { x(); }`);
    await fs.writeFile('b.ts', `export function y() {}`);
    const ctx = { cwd: tmpDir };
    const result = await execute({ file: 'a.ts', query: { includeCrossFile: true, depth: 1 } }, ctx as any);
    expect(result.isError).toBe(false);
    const details = result.details as any;
    // Should have nodes for a.ts and b.ts
    const nodeFiles = details.result.nodes.map((n: any) => n.file);
    expect(nodeFiles).toContain('a.ts');
    expect(nodeFiles).toContain('b.ts');
    // No edge because x is not exported by b
    expect(details.result.edges.length).toBe(0);
  });
});
