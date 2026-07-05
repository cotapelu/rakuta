import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execute } from '../capabilities/dependency_tree';

const __filename = fileURLToPath(import.meta.url);

describe('codebase.dependency_tree extension resolution', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = await fs.mkdtemp('dep-tree-ext-test-');
    process.chdir(tmpDir);
    tmpDir = process.cwd();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('resolves .js file when .ts not present', async () => {
    // a.ts imports './b' (no extension)
    // We provide b.js, not b.ts.
    await fs.writeFile('a.ts', `import { something } from './b';\nexport const a = 1;`);
    await fs.writeFile('b.js', `export function something() { return 42; }`);

    const result = await execute({ files: ['a.ts', 'b.js'] }, { cwd: tmpDir } as { cwd: string });
    expect(result.isError).toBe(false);
    const details = result.details as any;
    // Should have 2 nodes, 1 edge (a -> b)
    expect(details.nodes.length).toBe(2);
    const edge = details.edges.find((e: any) => e.from.endsWith('a.ts') && e.to.endsWith('b.js'));
    expect(edge).toBeDefined();
    expect(edge?.symbols).toContain('something');
  });
});
