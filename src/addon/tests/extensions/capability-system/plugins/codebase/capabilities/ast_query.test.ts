import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { execute } from '../../../../../../extensions/capability-system/plugins/codebase/capabilities/ast_query';

describe('ast_query capability', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ast_q_'));
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (e) {
      // ignore cleanup errors
    }
  });

  async function createFile(content: string, filename = 'test.ts'): Promise<void> {
    const filePath = join(testDir, filename);
    await writeFile(filePath, content, 'utf-8');
  }

  describe('validation', () => {
    it('returns error if file does not exist', async () => {
      const result = await execute({ file: 'nonexistent.ts', query: { kind: 'function' } }, { cwd: testDir });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File not found');
      expect(result.details?.exists).toBe(false);
    });

    it('returns error on parse error', async () => {
      await createFile('invalid syntax {');
      const result = await execute({ file: 'test.ts', query: { kind: 'function' } }, { cwd: testDir });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parse error');
      expect(result.details?.error).toBeDefined();
    });
  });

  describe('query kinds', () => {
    it('finds functions (declarations, expressions, arrow, methods)', async () => {
      await createFile(`
function foo() {}
const bar = () => {};
class Baz { method() {} }
      `.trim());
      const result = await execute({ file: 'test.ts', query: { kind: 'function' } }, { cwd: testDir });
      expect(result.isError).toBe(false);
      const matches = result.details?.matches;
      // Expect at least: function foo, arrow (anonymous), method in class
      expect(matches.length).toBeGreaterThanOrEqual(3);
      const names = matches.map((m: any) => m.name);
      expect(names).toContain('foo');
      expect(names).toContain('method');
      // Arrow function node has no name, returns '<arrow>'
      expect(names).toContain('<arrow>');
      // Verify method's parent is Baz
      const methodMatch = matches.find((m: any) => m.name === 'method');
      expect(methodMatch?.parent).toBe('Baz');
    });

    it('finds classes', async () => {
      await createFile('class A {} class B {}');
      const result = await execute({ file: 'test.ts', query: { kind: 'class' } }, { cwd: testDir });
      expect(result.isError).toBe(false);
      const names = result.details?.matches.map((m: any) => m.name).sort();
      expect(names).toEqual(['A', 'B']);
    });

    it('finds calls (identifier and member)', async () => {
      await createFile('foo(); bar(); obj.baz();');
      const result = await execute({ file: 'test.ts', query: { kind: 'call' } }, { cwd: testDir });
      expect(result.isError).toBe(false);
      const names = result.details?.matches.map((m: any) => m.name);
      expect(names).toContain('foo');
      expect(names).toContain('bar');
      expect(names).toContain('baz');
      expect(names.length).toBe(3);
    });

    it('finds imports', async () => {
      await createFile(`
import { a } from 'mod1';
import b from 'mod2';
import * as ns from 'mod3';
      `.trim());
      const result = await execute({ file: 'test.ts', query: { kind: 'import' } }, { cwd: testDir });
      expect(result.isError).toBe(false);
      const sources = result.details?.matches.map((m: any) => m.name);
      expect(sources).toEqual(['mod1', 'mod2', 'mod3']);
    });

    it('finds exports (named, default, all)', async () => {
      await createFile(`
export const x = 1;
export function f() {}
export default 42;
export * from './other';
      `.trim());
      const result = await execute({ file: 'test.ts', query: { kind: 'export' } }, { cwd: testDir });
      expect(result.isError).toBe(false);
      const names = result.details?.matches.map((m: any) => m.name);
      expect(names).toContain('x');
      expect(names).toContain('f');
      expect(names).toContain('default');
      expect(names).toContain('*');
      expect(names.length).toBe(4);
    });

    it('finds symbols (variables, types, interfaces, enums, functions, classes)', async () => {
      await createFile(`
let x;
const y = 1;
var z;
interface I {}
type T = number;
enum E { A, B }
function fn() {}
class C {}
      `.trim());
      const result = await execute({ file: 'test.ts', query: { kind: 'symbol' } }, { cwd: testDir });
      expect(result.isError).toBe(false);
      const names = result.details?.matches.map((m: any) => m.name);
      expect(names).toContain('x');
      expect(names).toContain('y');
      expect(names).toContain('z');
      expect(names).toContain('I');
      expect(names).toContain('T');
      expect(names).toContain('E');
      expect(names).toContain('fn');
      expect(names).toContain('C');
    });
  });

  describe('filters', () => {
    it('filters by exact name', async () => {
      await createFile('function foo() {} function bar() {}');
      const result = await execute({ file: 'test.ts', query: { kind: 'function', name: 'foo' } }, { cwd: testDir });
      expect(result.isError).toBe(false);
      expect(result.details?.matches.length).toBe(1);
      expect(result.details?.matches[0].name).toBe('foo');
    });

    it('filters by regex pattern', async () => {
      await createFile('function foo() {} function bar() {}');
      const result = await execute({ file: 'test.ts', query: { kind: 'function', name: '^f' } }, { cwd: testDir });
      expect(result.isError).toBe(false);
      expect(result.details?.matches.length).toBe(1);
      expect(result.details?.matches[0].name).toBe('foo');
    });

    it('invalid regex falls back to exact match (no match)', async () => {
      await createFile('function foo() {} function bar() {}');
      const result = await execute({ file: 'test.ts', query: { kind: 'function', name: '[invalid' } }, { cwd: testDir });
      expect(result.isError).toBe(false);
      expect(result.details?.matches.length).toBe(0);
    });

    it('filters by parent class to include only methods in that class', async () => {
      await createFile(`
class A { m1() {} m2() {} }
class B { m3() {} }
      `.trim());
      const result = await execute({ file: 'test.ts', query: { kind: 'function', parent: 'A' } }, { cwd: testDir });
      expect(result.isError).toBe(false);
      const names = result.details?.matches.map((m: any) => m.name).sort();
      expect(names).toEqual(['m1', 'm2']);
    });
  });

  describe('limit', () => {
    it('respects limit and stops early', async () => {
      const functions = Array.from({ length: 10 }, (_, i) => `function f${i}() {}`).join('\n');
      await createFile(functions);
      const result = await execute({ file: 'test.ts', query: { kind: 'function', limit: 3 } }, { cwd: testDir });
      expect(result.isError).toBe(false);
      expect(result.details?.matches.length).toBe(3);
    });
  });
});
