import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dfAction, duAction } from '../../extensions/tools/actions/system-actions.js';
import type { ExtensionContext } from './types.js';

function mockCtxExec(cmd: string, result: { stdout: string; stderr: string; code: number; killed: boolean }) {
  return {
    exec: vi.fn(async (c: string, args: string[], opts: any) => {
      expect(c).toBe(cmd);
      return { ...result, signal: undefined };
    }),
  } as unknown as ExtensionContext;
}

describe('System Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('dfAction', () => {
    it('should report disk usage with default -h', async () => {
      const ctx = mockCtxExec('df', { stdout: 'FilesystemSize', stderr: '', code: 0, killed: false });
      const result = await dfAction.execute({}, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('df', ['-h'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.details).toMatchObject({ human: true, all: false });
    });

    it('should include -a when all=true', async () => {
      const ctx = mockCtxExec('df', { stdout: 'all fs', stderr: '', code: 0, killed: false });
      const result = await dfAction.execute({ all: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('df', ['-a', '-h'], { cwd: '/cwd', signal: undefined });
      expect(result.details.all).toBe(true);
    });

    it('should support human=false', async () => {
      const ctx = mockCtxExec('df', { stdout: 'raw sizes', stderr: '', code: 0, killed: false });
      const result = await dfAction.execute({ human: false }, '/cwd', undefined, ctx);

      // With human=false and all default false, no flags passed
      expect(ctx.exec).toHaveBeenCalledWith('df', [], { cwd: '/cwd', signal: undefined });
      expect(result.details.human).toBe(false);
    });

    it('should handle error', async () => {
      const ctx = mockCtxExec('df', { stdout: '', stderr: 'Permission denied', code: 1, killed: false });
      const result = await dfAction.execute({}, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
    });
  });

  describe('duAction', () => {
    it('should estimate usage with default -h', async () => {
      const ctx = mockCtxExec('du', { stdout: 'size\t.', stderr: '', code: 0, killed: false });
      const result = await duAction.execute({}, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('du', ['-h'], { cwd: '/cwd', signal: undefined });
      expect(result.details.human).toBe(true);
      expect(result.details.path).toBe('/cwd');
    });

    it('should use custom path', async () => {
      const ctx = mockCtxExec('du', { stdout: 'size\t/tmp', stderr: '', code: 0, killed: false });
      const result = await duAction.execute({ path: '/tmp' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('du', ['-h', '/tmp'], { cwd: '/cwd', signal: undefined });
      expect(result.details.path).toBe('/tmp');
    });

    it('should include -s when summarize=true', async () => {
      const ctx = mockCtxExec('du', { stdout: 'total', stderr: '', code: 0, killed: false });
      const result = await duAction.execute({ summarize: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('du', ['-h', '-s'], { cwd: '/cwd', signal: undefined });
      expect(result.details.summarize).toBe(true);
    });

    it('should combine multiple flags', async () => {
      const ctx = mockCtxExec('du', { stdout: 'summarized human', stderr: '', code: 0, killed: false });
      await duAction.execute({ path: '/var', human: true, summarize: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('du', ['-h', '-s', '/var'], { cwd: '/cwd', signal: undefined });
    });

    it('should handle error', async () => {
      const ctx = mockCtxExec('du', { stdout: '', stderr: 'No such file', code: 1, killed: false });
      const result = await duAction.execute({ path: '/none' }, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
    });
  });

  describe('getParameters', () => {
    it('dfAction schema', () => {
      const params = dfAction.getParameters();
      expect(params.properties).toMatchObject({
        human: { type: 'boolean', description: 'Human readable sizes' },
        all: { type: 'boolean', description: 'Include dummy file systems' },
      });
      expect(params.required).toEqual([]);
    });

    it('duAction schema', () => {
      const params = duAction.getParameters();
      expect(params.properties).toMatchObject({
        path: { type: 'string', description: 'Target path' },
        human: { type: 'boolean', description: 'Human readable sizes' },
        summarize: { type: 'boolean', description: 'Show total only' },
      });
      expect(params.required).toEqual([]);
    });
  });
});
