import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lsAction, catAction } from '../../extensions/tools/actions/file-actions.js';
import type { ActionExecuteResult, ExtensionContext } from './types.js';

// Mock ExtensionContext with exec
function mockExec(expectedCmd: string, result: { stdout: string; stderr: string; code: number; killed: boolean } = { stdout: '', stderr: '', code: 0, killed: false }) {
  return {
    exec: vi.fn(async (cmd: string, args: string[], opts: any) => {
      expect(cmd).toBe(expectedCmd);
      return { ...result, signal: undefined };
    }),
  } as unknown as ExtensionContext;
}

describe('File Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('lsAction', () => {
    it('should list directory with default -l', async () => {
      const ctx = mockExec('ls', { stdout: 'file1\nfile2', stderr: '', code: 0, killed: false });
      const result = await lsAction.execute({}, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('ls', ['-l'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe('file1\nfile2');
      expect(result.details).toMatchObject({ exitCode: 0, killed: false, path: '/cwd', all: false, recursive: false });
    });

    it('should list with -la when all=true', async () => {
      const ctx = mockExec('ls', { stdout: '.hidden', stderr: '', code: 0, killed: false });
      const result = await lsAction.execute({ all: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('ls', ['-la'], { cwd: '/cwd', signal: undefined });
      expect(result.details.all).toBe(true);
    });

    it('should list with -lR when recursive=true', async () => {
      const ctx = mockExec('ls', { stdout: 'subdir:', stderr: '', code: 0, killed: false });
      const result = await lsAction.execute({ recursive: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('ls', ['-lR'], { cwd: '/cwd', signal: undefined });
      expect(result.details.recursive).toBe(true);
    });

    it('should use custom path', async () => {
      const ctx = mockExec('ls', { stdout: 'custom', stderr: '', code: 0, killed: false });
      const result = await lsAction.execute({ path: '/custom/path' }, '/cwd', undefined, ctx);

      // Verify the actual call
      const calls = (ctx.exec as any).mock.calls;
      expect(calls.length).toBe(1);
      const [cmd, args, opts] = calls[0];
      expect(cmd).toBe('ls');
      expect(args).toEqual(['-l', '/custom/path']); // path appended to args
      expect(opts.cwd).toBe('/custom/path'); // cwd opts set to custom path
      expect(opts.signal).toBeUndefined();
      expect(result.details.path).toBe('/custom/path');
    });

    it('should handle ls error (non-zero exit)', async () => {
      const ctx = mockExec('ls', { stdout: '', stderr: 'No such file', code: 1, killed: false });
      const result = await lsAction.execute({ path: '/nonexistent' }, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(1);
    });

    it('should handle ls killed', async () => {
      const ctx = mockExec('ls', { stdout: '', stderr: '', code: 0, killed: true });
      const result = await lsAction.execute({}, '/cwd', undefined, ctx);

      expect(result.details.killed).toBe(true);
    });

    it('should prioritize all over recursive (bug: else if prevents combining)', async () => {
      const ctx = mockExec('ls', { stdout: 'all recursive', stderr: '', code: 0, killed: false });
      const result = await lsAction.execute({ all: true, recursive: true }, '/cwd', undefined, ctx);

      // Due to else-if, only -la is used when both flags true
      expect(ctx.exec).toHaveBeenCalledWith('ls', ['-la'], { cwd: '/cwd', signal: undefined });
      expect(result.details.all).toBe(true);
      expect(result.details.recursive).toBe(true); // args preserved but ineffective
    });
  });

  describe('catAction', () => {
    it('should read file successfully', async () => {
      const ctx = mockExec('cat', { stdout: 'file content\nline2', stderr: '', code: 0, killed: false });
      const result = await catAction.execute({ path: 'test.txt' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('cat', ['test.txt'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe('file content\nline2');
      expect(result.details.path).toBe('test.txt');
    });

    it('should throw if path missing', async () => {
      const ctx = mockExec('cat');
      await expect(catAction.execute({}, '/cwd', undefined, ctx)).rejects.toThrow('Missing required parameter: path');
    });

    it('should handle cat error', async () => {
      const ctx = mockExec('cat', { stdout: '', stderr: 'Permission denied', code: 1, killed: false });
      const result = await catAction.execute({ path: '/protected/file' }, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(1);
    });

    it('should pass cwd correctly', async () => {
      const ctx = mockExec('cat', { stdout: 'content', stderr: '', code: 0, killed: false });
      await catAction.execute({ path: 'relative.txt' }, '/my/cwd', undefined, ctx);
      expect(ctx.exec).toHaveBeenCalledWith('cat', ['relative.txt'], { cwd: '/my/cwd', signal: undefined });
    });
  });

  describe('getParameters', () => {
    it('lsAction should have correct parameter schema', () => {
      const params = lsAction.getParameters();
      expect(params.type).toBe('object');
      expect(params.properties).toMatchObject({
        path: { type: 'string', description: 'Directory path to list' },
        all: { type: 'boolean', description: 'Show hidden files' },
        recursive: { type: 'boolean', description: 'List recursively' },
      });
      expect(params.required).toEqual([]);
    });

    it('catAction should have required path', () => {
      const params = catAction.getParameters();
      expect(params.required).toContain('path');
    });
  });
});
