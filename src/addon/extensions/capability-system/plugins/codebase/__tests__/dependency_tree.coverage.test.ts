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
});
