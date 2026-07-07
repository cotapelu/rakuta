import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { execute } from '../../../../../../extensions/capability-system/plugins/codebase/capabilities/dependency_tree';

describe('dependency_tree capability', () => {
  let testDir: string;
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'deptree_'));
  });
  afterEach(async () => {
    try { await rm(testDir, { recursive: true, force: true }); } catch {}
  });
  async function createFile(content: string, filename: string): Promise<void> {
    await writeFile(join(testDir, filename), content, 'utf-8');
  }

  describe('graph construction', () => {
    it('creates nodes and import edges between files', async () => {
      await createFile(`export const a = 1;`, 'A.ts');
      await createFile(`import { a } from './A'; export const b = a;`, 'B.ts');
      const result: any = await execute({
        files: ['A.ts', 'B.ts'],
        entryPoints: ['B.ts']
      }, { cwd: testDir });
      expect(result.isError).toBe(false);
      const nodes = result.details?.nodes;
      const edges = result.details?.edges;
      expect(nodes.length).toBe(2);
      expect(edges.length).toBe(1);
      const edge = edges.find((e: any) => e.from === 'B.ts' && e.to === 'A.ts');
      expect(edge).toBeDefined();
      expect(edge.symbols).toContain('a');
    });

    it('detects cycles', async () => {
      await createFile(`import { b } from './B'; export const a = 1;`, 'A.ts');
      await createFile(`import { a } from './A'; export const b = 2;`, 'B.ts');
      const result: any = await execute({ files: ['A.ts', 'B.ts'] }, { cwd: testDir });
      expect(result.isError).toBe(false);
      expect(result.details?.cycles.length).toBeGreaterThanOrEqual(1);
      const cycle = result.details?.cycles[0];
      // Cycle should contain both A.ts and B.ts (may include start again at end)
      expect(cycle).toContain('A.ts');
      expect(cycle).toContain('B.ts');
    });

    it('returns empty edges when file has no imports', async () => {
      await createFile(`export const x = 1;`, 'A.ts');
      const result: any = await execute({ files: ['A.ts'] }, { cwd: testDir });
      expect(result.isError).toBe(false);
      expect(result.details?.nodes.length).toBe(1);
      expect(result.details?.edges.length).toBe(0);
    });
  });

  describe('error handling', () => {
    it('returns error if a file is missing', async () => {
      const result: any = await execute({ files: ['missing.ts'] }, { cwd: testDir });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error processing file');
    });

    it('returns error on parse error', async () => {
      await createFile('invalid syntax {', 'bad.ts');
      const result: any = await execute({ files: ['bad.ts'] }, { cwd: testDir });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parse error');
    });
  });

  describe('import resolution edge cases', () => {
    it('ignores external packages (non-relative)', async () => {
      await createFile(`import 'some-pkg'; export {}`, 'A.ts');
      const result: any = await execute({ files: ['A.ts'] }, { cwd: testDir });
      expect(result.isError).toBe(false);
      expect(result.details?.edges.length).toBe(0);
    });

    it('resolves import without extension via .ts fallback', async () => {
      await createFile(`export const val = 1;`, 'mod.ts');
      await createFile(`import { val } from './mod'; export {}`, 'A.ts');
      const result: any = await execute({ files: ['A.ts', 'mod.ts'] }, { cwd: testDir });
      expect(result.isError).toBe(false);
      const edges = result.details?.edges;
      expect(edges.length).toBe(1);
      expect(edges[0].from).toBe('A.ts');
      expect(edges[0].to).toBe('mod.ts');
      expect(edges[0].symbols).toContain('val');
    });

    it('resolves .js fallback when .ts absent', async () => {
      await createFile(`export const j = 2;`, 'mod.js');
      await createFile(`import { j } from './mod'; export {}`, 'A.ts');
      const result: any = await execute({ files: ['A.ts', 'mod.js'] }, { cwd: testDir });
      expect(result.isError).toBe(false);
      const edges = result.details?.edges;
      expect(edges.length).toBe(1);
      expect(edges[0].to).toBe('mod.js');
      expect(edges[0].symbols).toContain('j');
    });

    it('prefers .ts over .js when both exist', async () => {
      await createFile(`export const tsVal = 1;`, 'mod.ts');
      await createFile(`export const jsVal = 2;`, 'mod.js');
      await createFile(`import { tsVal } from './mod'; export {}`, 'A.ts');
      const result: any = await execute({ files: ['A.ts', 'mod.ts', 'mod.js'] }, { cwd: testDir });
      expect(result.isError).toBe(false);
      const edges = result.details?.edges;
      expect(edges.length).toBe(1);
      expect(edges[0].to).toBe('mod.ts');
      expect(edges[0].symbols).toContain('tsVal');
    });

    it('handles file with only imports (no exports) as node', async () => {
      await createFile(`import { a } from './A';`, 'B.ts');
      await createFile(`export const a = 1;`, 'A.ts');
      const result: any = await execute({ files: ['A.ts', 'B.ts'] }, { cwd: testDir });
      expect(result.isError).toBe(false);
      const nodes = result.details?.nodes;
      expect(nodes.length).toBe(2);
      const nodeB = nodes.find((n: any) => n.file === 'B.ts');
      expect(nodeB?.exports?.length).toBe(0);
      const edges = result.details?.edges;
      expect(edges.length).toBe(1);
      expect(edges[0].from).toBe('B.ts');
    });
  });
});
