import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { execute } from '../capabilities/dependency_tree';

const __filename = fileURLToPath(import.meta.url);

describe('codebase.dependency_tree entryPoints all missing', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = await fs.mkdtemp('dep-tree-entry-missing-');
    process.chdir(tmpDir);
    tmpDir = process.cwd();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('returns empty graph when entryPoints provided but none exist in files', async () => {
    await fs.writeFile('a.ts', `export const a = 1;`);
    await fs.writeFile('b.ts', `import { a } from './a';\nexport const b = 2;`);
    const result = await execute({ files: ['a.ts', 'b.ts'], entryPoints: ['missing.ts'] }, { cwd: tmpDir } as { cwd: string });
    expect(result.isError).toBe(false);
    const details = result.details as any;
    expect(details.nodes.length).toBe(0);
    expect(details.edges.length).toBe(0);
  });
});
