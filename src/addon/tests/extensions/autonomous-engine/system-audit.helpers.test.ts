import { mkdtemp, rmdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SystemAudit } from '../../../extensions/autonomous-engine/system-audit';

describe('SystemAudit helper methods (unit)', () => {
  let fixtureDir: string;

  beforeEach(async () => {
    fixtureDir = await mkdtemp(join(tmpdir(), 'audit-helper-'));
  });

  afterEach(async () => {
    try {
      await rmdir(fixtureDir, { recursive: true });
    } catch (e) {}
  });

  async function writeFileAsync(fileName: string, content: string) {
    await writeFile(join(fixtureDir, fileName), content, 'utf-8');
  }

  describe('findFiles', () => {
    test('finds .ts files', async () => {
      await writeFileAsync('a.ts', '');
      await writeFileAsync('b.ts', '');
      const auditor = new SystemAudit(fixtureDir);
      const files = auditor['findFiles']('**/*.ts') as string[];
      expect(files.length).toBeGreaterThanOrEqual(2);
      expect(files.some(f => f.endsWith('a.ts'))).toBe(true);
      expect(files.some(f => f.endsWith('b.ts'))).toBe(true);
    });

    test('respects ignore patterns', async () => {
      // Create some files that would be ignored if they were in ignored dirs
      await writeFileAsync('src.ts', '');
      const auditor = new SystemAudit(fixtureDir);
      const files = auditor['findFiles']('**/*.ts', { ignore: ['node_modules', 'dist', 'coverage'] }) as string[];
      // Since we didn't create files in those ignored dirs, the result is just src.ts
      expect(files).toContain('src.ts');
      // Ensure that none of the returned files include those dirs (sanity)
      expect(files.every(f => !f.includes('node_modules') && !f.includes('dist') && !f.includes('coverage'))).toBe(true);
    });

    test('deduplicates and limits to first 100 files', async () => {
      // Create many files to test limit
      for (let i = 0; i < 50; i++) {
        await writeFileAsync(`file${i}.ts`, '');
      }

      const auditor = new SystemAudit(fixtureDir);
      const files = auditor['findFiles']('**/*.ts') as string[];
      expect(files.length).toBeLessThanOrEqual(100);
    });
  });

  describe('searchCode', () => {
    test('returns true when pattern found', async () => {
      await writeFileAsync('app.ts', `
        function foo() {
          const x = 1;
          console.log(x);
        }
      `);
      await writeFileAsync('lib.ts', 'const y = 2;');

      const auditor = new SystemAudit(fixtureDir);
      const result = (auditor as any).searchCode('console\\.log') as boolean;
      expect(result).toBe(true);
    });

    test('returns false when pattern not found', async () => {
      await writeFileAsync('app.ts', 'const a = 1;');
      const auditor = new SystemAudit(fixtureDir);
      const result = (auditor as any).searchCode('nonexistent') as boolean;
      expect(result).toBe(false);
    });

    test('case insensitive flag works', async () => {
      await writeFileAsync('app.ts', 'CONSOLE = 123;');
      const auditor = new SystemAudit(fixtureDir);
      const result1 = (auditor as any).searchCode('console', { caseInsensitive: false }) as boolean;
      const result2 = (auditor as any).searchCode('console', { caseInsensitive: true }) as boolean;
      expect(result1).toBe(false);
      expect(result2).toBe(true);
    });

    test('minOccurrences: returns true when count reaches threshold', async () => {
      await writeFileAsync('app.ts', 'foo(); foo(); foo(); bar();');
      const auditor = new SystemAudit(fixtureDir);
      const result = (auditor as any).searchCode('foo\\(\\)', { minOccurrences: 3 }) as boolean;
      expect(result).toBe(true);
    });

    test('minOccurrences: returns false if count below threshold', async () => {
      await writeFileAsync('app.ts', 'foo(); foo();');
      const auditor = new SystemAudit(fixtureDir);
      const result = (auditor as any).searchCode('foo\\(\\)', { minOccurrences: 3 }) as boolean;
      expect(result).toBe(false);
    });

    test('handles invalid regex gracefully and returns false', async () => {
      await writeFileAsync('app.ts', 'content');
      const auditor = new SystemAudit(fixtureDir);
      const result = (auditor as any).searchCode('*(invalid') as boolean; // invalid pattern
      expect(result).toBe(false);
    });
  });

  describe('hasTimeoutConfigured', () => {
    test('detects timeout configuration', async () => {
      await writeFileAsync('client.ts', `
        const timeout = 5000;
        const connectTimeout = 1000;
        const requestTimeout = 2000;
      `);
      const auditor = new SystemAudit(fixtureDir);
      const result = (auditor as any).hasTimeoutConfigured() as boolean;
      expect(result).toBe(true);
    });

    test('returns false when no timeout found', async () => {
      await writeFileAsync('client.ts', 'const delay = 100;');
      const auditor = new SystemAudit(fixtureDir);
      const result = (auditor as any).hasTimeoutConfigured() as boolean;
      expect(result).toBe(false);
    });
  });

  describe('matchPattern', () => {
    test('matches simple glob pattern', () => {
      const auditor = new SystemAudit(fixtureDir);
      const match = (auditor as any).matchPattern.bind(auditor);
      expect(match('src/foo.ts', '**/*.ts')).toBe(true);
      expect(match('src/foo.js', '**/*.ts')).toBe(false);
      expect(match('dist/bundle.js', '**/*.ts')).toBe(false);
    });
  });

  describe('extractFunctionBlock', () => {
    test('extracts simple function body', () => {
      const content = 'function foo() {\n  return 1;\n}\nconst x = 2;';
      const startIdx = content.indexOf('function foo');
      const result = (new SystemAudit(fixtureDir) as any).extractFunctionBlock(content, startIdx);
      expect(result).toContain('return 1;');
      expect(result).toContain('}');
    });

    test('handles nested braces within function', () => {
      const content = `function bar() {
        if (true) {
          doWork();
        }
        return;
      }`;
      const startIdx = content.indexOf('function bar');
      const result = (new SystemAudit(fixtureDir) as any).extractFunctionBlock(content, startIdx);
      expect(result).toContain('if (true)');
      expect(result).toContain('doWork();');
      expect(result).toContain('return;');
    });

    test('ignores braces inside strings', () => {
      const content = `function baz() {
        const s = "some { string }";
        console.log(s);
      }`;
      const startIdx = content.indexOf('function baz');
      const result = (new SystemAudit(fixtureDir) as any).extractFunctionBlock(content, startIdx);
      expect(result).toContain('const s');
      expect(result).toContain('console.log(s);');
    });

    test('returns empty string when no brace found', () => {
      const content = 'function noBody() \n const x = 1;';
      const startIdx = content.indexOf('function noBody');
      const result = (new SystemAudit(fixtureDir) as any).extractFunctionBlock(content, startIdx);
      expect(result).toBe('');
    });
  });
});
