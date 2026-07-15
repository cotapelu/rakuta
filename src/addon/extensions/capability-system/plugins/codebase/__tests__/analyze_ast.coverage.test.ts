import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, unlink } from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function writeTempFile(content: string, ext = "ts"): Promise<string> {
  const timestamp = Date.now();
  const dir = path.join(__dirname, "temp");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `ast-${timestamp}.${ext}`);
  await writeFile(file, content, "utf-8");
  return file;
}

const analyzeAstModule = await import("../capabilities/analyze_ast.ts");

describe("codebase.analyze_ast coverage gaps", () => {
  afterEach(async () => {
    const tempDir = path.join(__dirname, "temp");
    // OS cleanup
  });

  it('handles type import (import type)', async () => {
    const code = `import type { Foo } from "module";`;
    const file = await writeTempFile(code);
    const ctx = { cwd: path.dirname(file) };
    const result = await analyzeAstModule.execute({ file: path.basename(file) }, ctx as any);

    expect(result.isError).toBe(false);
    expect(result.details.imports.length).toBe(1);
    expect(result.details.imports[0].typeOnly).toBe(true);
    expect(result.details.imports[0].namedImports).toContain('Foo');

    await unlink(file);
  });

  it('handles interface declaration', async () => {
    const code = `interface Foo { x: number; }`;
    const file = await writeTempFile(code);
    const ctx = { cwd: path.dirname(file) };
    const result = await analyzeAstModule.execute({ file: path.basename(file) }, ctx as any);

    expect(result.isError).toBe(false);
    const iface = result.details.symbols.find(s => s.name === 'Foo' && s.kind === 'interface');
    expect(iface).toBeDefined();

    await unlink(file);
  });

  it('handles type alias declaration', async () => {
    const code = `type Foo = { a: string } | { b: number };`;
    const file = await writeTempFile(code);
    const ctx = { cwd: path.dirname(file) };
    const result = await analyzeAstModule.execute({ file: path.basename(file) }, ctx as any);

    expect(result.isError).toBe(false);
    const typeAlias = result.details.symbols.find(s => s.name === 'Foo' && s.kind === 'type');
    expect(typeAlias).toBeDefined();

    await unlink(file);
  });

  it('handles enum declaration', async () => {
    const code = `enum Color { Red, Green, Blue }`;
    const file = await writeTempFile(code);
    const ctx = { cwd: path.dirname(file) };
    const result = await analyzeAstModule.execute({ file: path.basename(file) }, ctx as any);

    expect(result.isError).toBe(false);
    const enumSymbol = result.details.symbols.find(s => s.name === 'Color' && s.kind === 'enum');
    expect(enumSymbol).toBeDefined();

    await unlink(file);
  });

  it('handles export default class expression', async () => {
    const code = `export default class { }`;
    const file = await writeTempFile(code);
    const ctx = { cwd: path.dirname(file) };
    const result = await analyzeAstModule.execute({ file: path.basename(file) }, ctx as any);

    expect(result.isError).toBe(false);
    const defExp = result.details.exports.find(e => e.type === 'default');
    expect(defExp).toBeDefined();

    await unlink(file);
  });

  it('handles export default function expression', async () => {
    const code = `export default function () { }`;
    const file = await writeTempFile(code);
    const ctx = { cwd: path.dirname(file) };
    const result = await analyzeAstModule.execute({ file: path.basename(file) }, ctx as any);

    expect(result.isError).toBe(false);
    const defExp = result.details.exports.find(e => e.type === 'default');
    expect(defExp).toBeDefined();

    await unlink(file);
  });

  it('handles const declaration', async () => {
    const code = `const X = 123;`;
    const file = await writeTempFile(code);
    const ctx = { cwd: path.dirname(file) };
    const result = await analyzeAstModule.execute({ file: path.basename(file) }, ctx as any);

    expect(result.isError).toBe(false);
    const sym = result.details.symbols.find(s => s.name === 'X');
    expect(sym).toBeDefined();
    expect(sym?.kind).toBe('const');

    await unlink(file);
  });

  it('handles mixed named and default exports', async () => {
    const code = `export const a = 1;\nexport default function foo() {};`;
    const file = await writeTempFile(code);
    const ctx = { cwd: path.dirname(file) };
    const result = await analyzeAstModule.execute({ file: path.basename(file) }, ctx as any);

    expect(result.isError).toBe(false);
    expect(result.details.exports.some(e => e.type === 'named' && e.name === 'a')).toBe(true);
    expect(result.details.exports.some(e => e.type === 'default')).toBe(true);

    await unlink(file);
  });
});
