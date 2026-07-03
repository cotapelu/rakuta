import { describe, it, expect, vi, beforeEach } from 'vitest';
import { grepAction, findAction } from '../../extensions/tools/actions/search-actions.js';
import type { ExtensionContext } from './types.js';

function mockExec(expectedCmd: string, result: { stdout: string; stderr: string; code: number; killed?: boolean } = { stdout: '', stderr: '', code: 0 }) {
  return {
    exec: vi.fn(async (cmd: string, args: string[], opts: any) => {
      expect(cmd).toBe(expectedCmd);
      return { ...result, signal: undefined, killed: result.killed ?? false };
    }),
  } as unknown as ExtensionContext;
}

describe('Search Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('grepAction', () => {
    it('should search with pattern and defaults', async () => {
      const ctx = mockExec('grep', { stdout: 'match1\nmatch2', code: 0, killed: false });
      const result = await grepAction.execute({ pattern: 'test' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('grep', ['-r', 'test', '/cwd'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.details).toMatchObject({ exitCode: 0, killed: false, pattern: 'test', path: '/cwd', ignoreCase: false, recursive: true });
    });

    it('should handle custom path and flags', async () => {
      const ctx = mockExec('grep', { stdout: 'found', code: 0, killed: false });
      const result = await grepAction.execute({ pattern: 'foo', path: '/src', ignoreCase: true, recursive: false }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('grep', ['-i', 'foo', '/src'], { cwd: '/cwd', signal: undefined });
      expect(result.details.path).toBe('/src');
      expect(result.details.ignoreCase).toBe(true);
      expect(result.details.recursive).toBe(false);
    });

    it('should handle error', async () => {
      const ctx = mockExec('grep', { stdout: '', stderr: 'grep: No such file', code: 1, killed: false });
      const result = await grepAction.execute({ pattern: 'test' }, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(1);
    });

    it('should handle killed', async () => {
      const ctx = mockExec('grep', { stdout: '', code: 0, killed: true });
      const result = await grepAction.execute({ pattern: 'test' }, '/cwd', undefined, ctx);

      expect(result.details.killed).toBe(true);
    });
  });

  describe('findAction', () => {
    it('should find from current directory by default', async () => {
      const ctx = mockExec('find', { stdout: 'file1\nfile2', code: 0, killed: false });
      const result = await findAction.execute({}, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('find', ['/cwd'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.details).toMatchObject({ exitCode: 0, killed: false, path: '/cwd', name: undefined });
    });

    it('should use custom path and name', async () => {
      const ctx = mockExec('find', { stdout: 'app.js', code: 0, killed: false });
      const result = await findAction.execute({ path: '/src', name: '*.ts' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('find', ['/src', '-name', '*.ts'], { cwd: '/cwd', signal: undefined });
      expect(result.details.path).toBe('/src');
      expect(result.details.name).toBe('*.ts');
    });

    it('should handle error', async () => {
      const ctx = mockExec('find', { stdout: '', stderr: 'find: unknown path', code: 1, killed: false });
      const result = await findAction.execute({ path: '/nonexistent' }, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(1);
    });

    it('should handle killed', async () => {
      const ctx = mockExec('find', { stdout: '', code: 0, killed: true });
      const result = await findAction.execute({}, '/cwd', undefined, ctx);

      expect(result.details.killed).toBe(true);
    });
  });
});
