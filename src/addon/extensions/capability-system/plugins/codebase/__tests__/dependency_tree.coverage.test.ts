import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execute } from '../capabilities/dependency_tree';

const __filename = fileURLToPath(import.meta.url);

describe('codebase.dependency_tree coverage gaps', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = await fs.mkdtemp('dep-tree-cov-');
    process.chdir(tmpDir);
    tmpDir = process.cwd();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('returns error when no files provided', async () => {
    const result = await execute({ files: [] }, { cwd: tmpDir } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No files provided');
  });

  it('skips external package imports (non-relative)', async () => {
    await fs.writeFile('a.ts', `import _ from 'lodash';\nexport const a = 1;`);
    await fs.writeFile('b.ts', `export const b = 2;`);

    const result = await execute({ files: ['a.ts', 'b.ts'] }, { cwd: tmpDir } as any);
    expect(result.isError).toBe(false);
    const details: any = result.details;
    // a.ts should be included but no edge to lodash (skipped)
    const aNode = details.nodes.find((n: any) => n.id.endsWith('a.ts'));
    expect(aNode).toBeDefined();
    const externalEdge = details.edges.find(e => e.to.includes('node_modules') || e.to.includes('lodash'));
    expect(externalEdge).toBeUndefined();
  });

  it('handles class export', async () => {
    await fs.writeFile('a.ts', `export class Foo {}`);
    await fs.writeFile('b.ts', `export const bar = 1;`);

    const result = await execute({ files: ['a.ts', 'b.ts'] }, { cwd: tmpDir } as any);
    expect(result.isError).toBe(false);
    const details: any = result.details;
    const nodeA = details.nodes.find((n: any) => n.file.endsWith('a.ts'));
    expect(nodeA).toBeDefined();
    expect(nodeA.exports).toContain('Foo');
  });

  it('handles wildcard re-export (export *)', async () => {
    await fs.writeFile('a.ts', `export * from './b';`);
    await fs.writeFile('b.ts', `export const x = 1; export const y = 2;`);

    const result = await execute({ files: ['a.ts', 'b.ts'] }, { cwd: tmpDir } as any);
    expect(result.isError).toBe(false);
    const details: any = result.details;
    // a.ts should have an edge to b.ts with symbol '*'
    const edge = details.edges.find(e => e.from.endsWith('a.ts') && e.to.endsWith('b.ts'));
    expect(edge).toBeDefined();
    expect(edge.symbols).toContain('*');
    // a.ts imports list includes b.ts (the target file ID)
    const nodeA = details.nodes.find((n: any) => n.file.endsWith('a.ts'));
    const nodeB = details.nodes.find((n: any) => n.file.endsWith('b.ts'));
    expect(nodeA).toBeDefined();
    expect(nodeB).toBeDefined();
    expect(nodeA.imports).toContain(nodeB.id);
  });
});
