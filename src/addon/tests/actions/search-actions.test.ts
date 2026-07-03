import { describe, it, expect, vi, beforeEach } from 'vitest';
import { grepAction, findAction } from '../../extensions/tools/actions/search-actions.js';
import type { ExtensionContext } from './types.js';

function mockCtxExec(cmd: string, result: { stdout: string; stderr: string; code: number; killed: boolean }) {
  return {
    exec: vi.fn(async (c: string, args: string[], opts: any) => {
      expect(c).toBe(cmd);
      return { ...result, signal: undefined };
    }),
  } as unknown as ExtensionContext;
}

describe('Search Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('grepAction', () => {
    it('should search with required pattern', async () => {
      const ctx = mockCtxExec('grep', { stdout: 'match: test', stderr: '', code: 0, killed: false });
      const result = await grepAction.execute({ pattern: 'test' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('grep', ['-r', 'test', '/cwd'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.details).toMatchObject({ pattern: 'test', path: '/cwd', ignoreCase: false, recursive: true });
    });

    it('should respect custom path and flags', async () => {
      const ctx = mockCtxExec('grep', { stdout: 'found', stderr: '', code: 0, killed: false });
      const result = await grepAction.execute({ pattern: 'foo', path: '/src', ignoreCase: true, recursive: false }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('grep', ['-i', 'foo', '/src'], { cwd: '/cwd', signal: undefined });
      expect(result.details.ignoreCase).toBe(true);
      expect(result.details.recursive).toBe(false);
      expect(result.details.path).toBe('/src');
    });

    it('should handle grep not found', async () => {
      const ctx = mockCtxExec('grep', { stdout: '', stderr: 'No matches', code: 1, killed: false });
      const result = await grepAction.execute({ pattern: 'missing' }, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
    });
  });

  describe('findAction', () => {
    it('should find all files from cwd', async () => {
      const ctx = mockCtxExec('find', { stdout: './file1\n./dir/file2', stderr: '', code: 0, killed: false });
      const result = await findAction.execute({}, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('find', ['/cwd'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('file1');
    });

    it('should find with name pattern', async () => {
      const ctx = mockCtxExec('find', { stdout: './app.ts\n./test.ts', stderr: '', code: 0, killed: false });
      const result = await findAction.execute({ name: '*.ts' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('find', ['/cwd', '-name', '*.ts'], { cwd: '/cwd', signal: undefined });
      expect(result.details.name).toBe('*.ts');
    });

    it('should use custom path', async () => {
      const ctx = mockCtxExec('find', { stdout: '/opt/bin', stderr: '', code: 0, killed: false });
      const result = await findAction.execute({ path: '/opt' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('find', ['/opt'], { cwd: '/cwd', signal: undefined });
      expect(result.details.path).toBe('/opt');
    });

    it('should handle find error', async () => {
      const ctx = mockCtxExec('find', { stdout: '', stderr: 'Permission denied', code: 1, killed: false });
      const result = await findAction.execute({ path: '/root' }, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
    });

    it('should trim stdout', async () => {
      const ctx = mockCtxExec('find', { stdout: '  file1  \n  file2  ', stderr: '', code: 0, killed: false });
      const result = await findAction.execute({}, '/cwd', undefined, ctx);
      expect(result.content[0].text).not.toMatch(/^\s+|\s+$/);
    });
  });

  describe('getParameters', () => {
    it('grepAction schema', () => {
      const params = grepAction.getParameters();
      expect(params.required).toContain('pattern');
      expect(params.properties.pattern).toEqual({ type: 'string', description: 'Search pattern (regex)' });
    });

    it('findAction schema', () => {
      const params = findAction.getParameters();
      expect(params.required).toEqual([]);
      expect(params.properties.name).toEqual({ type: 'string', description: 'Name pattern (e.g., \'*.ts\')' });
    });
  });
});
