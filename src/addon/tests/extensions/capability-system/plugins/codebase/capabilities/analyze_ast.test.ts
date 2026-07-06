import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { execute } from '../../../../../../extensions/capability-system/plugins/codebase/capabilities/analyze_ast';

describe('analyze_ast capability', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'analyze_'));
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (e) {}
  });

  async function createFile(content: string, filename = 'sample.ts'): Promise<void> {
    await writeFile(join(testDir, filename), content, 'utf-8');
  }

  describe('errors', () => {
    it('returns error if file not found', async () => {
      const result = await execute({ file: 'missing.ts' }, { cwd: testDir });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File not found');
      expect(result.details?.exists).toBe(false);
    });

    it('returns error on parse error', async () => {
      await createFile('invalid syntax {');
      const result = await execute({ file: 'sample.ts' }, { cwd: testDir });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parse error');
      expect(result.details?.error).toBeDefined();
    });
  });

  describe('successful analysis', () => {
    it('collects imports, exports, symbols with various constructs', async () => {
      const code = `
import React from 'react';
import { useState } from 'react';
import * as util from './utils';
import type { MyType } from './types';

export const foo = 42;
export function bar() {}
export default class MyClass {}
export * from './other';
export type { MyType } from './types';

const a = 1;
let b = 2;
var c = 3;
function baz() {}
const arrow = () => {};
interface I {}
type T = number;
enum E { A, B }
      `.trim();
      await createFile(code, 'sample.ts');
      const result = await execute({ file: 'sample.ts' }, { cwd: testDir });
      expect(result.isError).toBe(false);
      const details: any = result.details;

      // Metadata
      expect(details.file).toBe('sample.ts');
      expect(details.language).toBe('ts');
      expect(details.exists).toBe(true);

      // Imports: 4 distinct module specifiers
      const modules = details.imports.map((imp: any) => imp.moduleSpecifier);
      expect(modules).toContain('react');
      expect(modules).toContain('./utils');
      expect(modules).toContain('./types');
      expect(details.imports.length).toBe(4);

      // Check import types
      const defaultImp = details.imports.find((imp: any) => imp.importClause === 'React');
      expect(defaultImp).toBeDefined();
      const namedImps = details.imports.filter((imp: any) => imp.namedImports && imp.namedImports.includes('useState'));
      expect(namedImps.length).toBe(1);
      const namespaceImp = details.imports.find((imp: any) => imp.importClause === '* as util');
      expect(namespaceImp).toBeDefined();
      const typeOnlyImp = details.imports.find((imp: any) => imp.typeOnly === true && imp.namedImports?.includes('MyType'));
      expect(typeOnlyImp).toBeDefined();

      // Exports: expect named, default, all, type
      expect(details.exports.length).toBeGreaterThanOrEqual(5);
      const exportTypes = details.exports.map((exp: any) => exp.type);
      expect(exportTypes).toContain('named');
      expect(exportTypes).toContain('default');
      expect(exportTypes).toContain('all');

      // Symbols
      const kinds = new Set(details.symbols.map((s: any) => s.kind));
      // Variables: const, let, var
      expect(kinds.has('const') || kinds.has('variable') || kinds.has('let')).toBe(true);
      // Function declarations
      expect(kinds.has('function')).toBe(true);
      // Class
      expect(kinds.has('class')).toBe(true);
      // Interface
      expect(kinds.has('interface')).toBe(true);
      // Type alias
      expect(kinds.has('type')).toBe(true);
      // Enum
      expect(kinds.has('enum')).toBe(true);
    });
  });
});
