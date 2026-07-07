import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { execute } from '../../../../../../extensions/capability-system/plugins/codebase/capabilities/call_graph';

describe('call_graph capability', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'callgraph_'));
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (e) {}
  });

  async function createFile(content: string, filename: string): Promise<void> {
    await writeFile(join(testDir, filename), content, 'utf-8');
  }

  describe('basic call edge discovery', () => {
    it('finds direct calls within a single file', async () => {
      await createFile(`
function foo() {
  bar();
}
function bar() {}
      `.trim(), 'A.ts');
      const result: any = await execute({ file: 'A.ts', query: { kind: 'call' } }, { cwd: testDir });
      expect(result.isError).toBe(false);
      const edges = result.details?.result?.edges;
      expect(edges).toBeDefined();
      expect(edges.length).toBeGreaterThanOrEqual(1);
      // Edge from foo to bar, both in same file
      const edge = edges.find((e: any) => e.from.file === 'A.ts' && e.to.file === 'A.ts' && e.from.name === 'foo' && e.to.name === 'bar');
      expect(edge).toBeDefined();
    });

    it('filters calls by callee name pattern', async () => {
      await createFile(`
function foo() { bar(); baz(); }
function bar() {}
function baz() {}
      `.trim(), 'A.ts');
      const result: any = await execute({ file: 'A.ts', query: { kind: 'call', name: '^b' } }, { cwd: testDir });
      expect(result.isError).toBe(false);
      const edges = result.details?.result?.edges;
      expect(edges).toBeDefined();
      // All callee names should start with 'b'
      expect(edges.every((e: any) => e.to.name.startsWith('b'))).toBe(true);
    });

    it('respects limit on number of edges', async () => {
      // Create a chain of calls: f0 calls f1, f1 calls f2, ... f9 calls f10
      let code = '';
      for (let i = 0; i < 10; i++) {
        code += `function f${i}() { f${i+1}(); }\n`;
      }
      code += 'function f10() {}';
      await createFile(code, 'A.ts');
      const result: any = await execute({ file: 'A.ts', query: { kind: 'call', limit: 5 } }, { cwd: testDir });
      expect(result.isError).toBe(false);
      const edges = result.details?.result?.edges;
      expect(edges.length).toBeLessThanOrEqual(5);
    });
  });

  describe('cross-file resolution', () => {
    it('includes edges across files when includeCrossFile enabled', async () => {
      await createFile(`
import { bar } from './B';
export function foo() {
  bar();
}
      `.trim(), 'A.ts');
      await createFile(`
export function bar() {}
      `.trim(), 'B.ts');
      const result: any = await execute(
        {
          file: 'A.ts',
          entryPoints: ['B.ts'],
          query: { kind: 'call', includeCrossFile: true }
        },
        { cwd: testDir }
      );
      expect(result.isError).toBe(false);
      const edges = result.details?.result?.edges;
      expect(edges).toBeDefined();
      // Edge from A.ts (foo) to B.ts (bar)
      const edge = edges.find((e: any) => e.from.file === 'A.ts' && e.to.file === 'B.ts' && e.to.name === 'bar');
      expect(edge).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('handles missing primary file gracefully (empty result)', async () => {
      const result: any = await execute({ file: 'missing.ts', query: { kind: 'call' } }, { cwd: testDir });
      expect(result.isError).toBe(false);
      const edges = result.details?.result?.edges;
      expect(edges?.length).toBe(0);
    });

    it('handles parse error by excluding problematic file (empty result)', async () => {
      await createFile('invalid syntax {', 'bad.ts');
      const result: any = await execute({ file: 'bad.ts', query: { kind: 'call' } }, { cwd: testDir });
      expect(result.isError).toBe(false);
      const edges = result.details?.result?.edges;
      expect(edges?.length).toBe(0);
    });
  });
});
