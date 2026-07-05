import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { execute } from '../capabilities/ast_query';

const __filename = fileURLToPath(import.meta.url);

describe('codebase.ast_query branch coverage', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = await fs.mkdtemp('astquery-branch-');
    process.chdir(tmpDir);
    tmpDir = process.cwd();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('handles invalid regex pattern by falling back to equality', async () => {
    const code = `
function foo() {}
function bar() {}
    `;
    await fs.writeFile('test.ts', code);
    const ctx = { cwd: tmpDir };
    // Invalid regex pattern: '[' missing closing bracket
    const result = await execute({ file: 'test.ts', query: { kind: 'function', name: '[' } }, ctx as any);
    expect(result.isError).toBe(false);
    // Should treat pattern as literal string and match nothing? Actually nameMatches will try RegExp, catch, then return name === pattern. Since pattern is '[' and no function named '[', matches empty.
    const names = result.details.matches.map(m => m.name);
    expect(names).not.toContain('foo');
    expect(names).not.toContain('bar');
  });

  it('excludes functions when parent does not match container (nested function case)', async () => {
    const code = `
function outer() {
  function inner() {}
}
    `;
    await fs.writeFile('test.ts', code);
    const ctx = { cwd: tmpDir };
    // Parent "outer" will not match inner because inner's direct parent is BlockStatement, not the outer function.
    const result = await execute({ file: 'test.ts', query: { kind: 'function', parent: 'outer' } }, ctx as any);
    expect(result.isError).toBe(false);
    const names = result.details.matches.map(m => m.name);
    expect(names).not.toContain('inner');
    expect(names).not.toContain('outer');
  });

  it('returns empty matches for unknown kind', async () => {
    const code = `function foo() {}`;
    await fs.writeFile('test.ts', code);
    const ctx = { cwd: tmpDir };
    // @ts-ignore - testing unknown kind; schema should validate, but we test runtime handling
    const result = await execute({ file: 'test.ts', query: { kind: 'unknownkind' } }, ctx as any);
    expect(result.isError).toBe(false);
    expect(result.details.matches).toHaveLength(0);
  });

  it('finds member expression calls (method calls)', async () => {
    const code = `
obj.method();
another.doSomething();
    `;
    await fs.writeFile('test.ts', code);
    const ctx = { cwd: tmpDir };
    const result = await execute({ file: 'test.ts', query: { kind: 'call', name: 'method' } }, ctx as any);
    expect(result.isError).toBe(false);
    const names = result.details.matches.map(m => m.name);
    expect(names).toContain('method');
  });

  it('includes class methods when parent matches class name', async () => {
    const code = `
class MyClass {
  method() {}
  another() {}
}
    `;
    await fs.writeFile('test.ts', code);
    const ctx = { cwd: tmpDir };
    const result = await execute({ file: 'test.ts', query: { kind: 'function', parent: 'MyClass' } }, ctx as any);
    expect(result.isError).toBe(false);
    const names = result.details.matches.map(m => m.name);
    expect(names).toContain('method');
    expect(names).toContain('another');
  });
});
