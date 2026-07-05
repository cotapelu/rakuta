import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { execute } from '../capabilities/dependency_tree';

const __filename = fileURLToPath(import.meta.url);

describe('codebase.dependency_tree external package', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = await fs.mkdtemp('dep-tree-ext-');
    process.chdir(tmpDir);
    tmpDir = process.cwd();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('ignores external package imports (non-relative)', async () => {
    await fs.writeFile('a.ts', `import _ from 'lodash';\nexport const a = 1;`);
    await fs.writeFile('b.ts', `export const b = 2;`);
    const result = await execute({ files: ['a.ts', 'b.ts'] }, { cwd: tmpDir } as any);
    expect(result.isError).toBe(false);
    const details = result.details as any;
    // a.ts node should exist; no edge created for 'lodash'
    const aNode = details.nodes.find((n: any) => n.id.endsWith('a.ts'));
    expect(aNode).toBeDefined();
    // There should be no edge where 'to' is an external package
    const externalEdges = details.edges.filter((e: any) => !e.to.startsWith('.') && !e.to.startsWith('/'));
    expect(externalEdges).toHaveLength(0);
  });
});
