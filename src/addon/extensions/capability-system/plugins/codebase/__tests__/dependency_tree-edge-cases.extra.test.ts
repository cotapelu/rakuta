import { promises as fs } from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execute } from '../capabilities/dependency_tree';

const __filename = import.meta.url;

describe('dependency_tree additional edge cases', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = await fs.mkdtemp('dep-tree-extra-');
    process.chdir(tmpDir);
    tmpDir = process.cwd();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('handles export * as namespace from module (ES2020)', async () => {
    await fs.writeFile('lib.ts', `export const x = 1;`);
    await fs.writeFile('main.ts', `export * as ns from './lib';`);
    const result = await execute({ files: ['lib.ts', 'main.ts'] }, { cwd: tmpDir } as any);
    expect(result.isError).toBe(false);
    const details = result.details as any;
    // main.ts should have an import edge to lib.ts with symbol '*'
    const edge = details.edges.find(e => e.from.endsWith('main.ts') && e.to.endsWith('lib.ts'));
    expect(edge).toBeDefined();
    expect(edge?.symbols).toContain('*');
  });

  it('handles multiple independent cycles in same graph', async () => {
    // Cycle A: a -> b -> a
    // Cycle C: c -> d -> c, with a separate branch e -> c
    await fs.writeFile('a.ts', `import { b } from './b'; export const a = 1;`);
    await fs.writeFile('b.ts', `import { a } from './a'; export const b = 2;`);
    await fs.writeFile('c.ts', `import { d } from './d'; export const c = 3;`);
    await fs.writeFile('d.ts', `import { c } from './c'; export const d = 4;`);
    await fs.writeFile('e.ts', `import { c } from './c'; export const e = 5;`);

    const result = await execute({ files: ['a.ts','b.ts','c.ts','d.ts','e.ts'] }, { cwd: tmpDir } as any);
    expect(result.isError).toBe(false);
    const details = result.details as any;
    // Should detect two cycles
    const cycles = details.cycles;
    expect(cycles.length).toBeGreaterThanOrEqual(2);
    // First cycle includes a,b
    const cycleAB = cycles.find((c: string[]) => c.includes('a.ts') && c.includes('b.ts'));
    expect(cycleAB).toBeDefined();
    // Second cycle includes c,d
    const cycleCD = cycles.find((c: string[]) => c.includes('c.ts') && c.includes('d.ts'));
    expect(cycleCD).toBeDefined();
  });
});
