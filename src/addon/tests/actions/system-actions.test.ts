import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dfAction, duAction } from '../../extensions/tools/actions/system-actions.js';
import type { ExtensionContext } from './types.js';

function mockExec(expectedCmd: string, result: { stdout: string; stderr: string; code: number; killed?: boolean } = { stdout: '', stderr: '', code: 0 }) {
  return {
    exec: vi.fn(async (cmd: string, args: string[], opts: any) => {
      expect(cmd).toBe(expectedCmd);
      return { ...result, signal: undefined, killed: result.killed ?? false };
    }),
  } as unknown as ExtensionContext;
}

describe('System Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('dfAction', () => {
    it('should report disk usage with defaults -h', async () => {
      const ctx = mockExec('df', { stdout: 'Filesystem Size Used Avail', code: 0, killed: false });
      const result = await dfAction.execute({}, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('df', ['-h'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.details).toMatchObject({ exitCode: 0, killed: false, human: true, all: false });
    });

    it('should include -a when all=true', async () => {
      const ctx = mockExec('df', { stdout: 'all lines', code: 0, killed: false });
      const result = await dfAction.execute({ all: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('df', ['-a', '-h'], { cwd: '/cwd', signal: undefined });
      expect(result.details.all).toBe(true);
    });

    it('should omit -h when human=false', async () => {
      const ctx = mockExec('df', { stdout: 'raw sizes', code: 0, killed: false });
      const result = await dfAction.execute({ human: false }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('df', [], { cwd: '/cwd', signal: undefined });
      expect(result.details.human).toBe(false);
    });

    it('should combine -a and -h', async () => {
      const ctx = mockExec('df', { stdout: 'combined', code: 0, killed: false });
      const result = await dfAction.execute({ all: true, human: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('df', ['-a', '-h'], { cwd: '/cwd', signal: undefined });
    });

    it('should handle error', async () => {
      const ctx = mockExec('df', { stderr: 'df: error', code: 1, killed: false });
      const result = await dfAction.execute({}, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(1);
    });

    it('should handle killed', async () => {
      const ctx = mockExec('df', { code: 0, killed: true });
      const result = await dfAction.execute({}, '/cwd', undefined, ctx);

      expect(result.details.killed).toBe(true);
    });
  });

  describe('duAction', () => {
    it('should estimate with defaults -h (cwd used, no summarize)', async () => {
      const ctx = mockExec('du', { stdout: 'size\t.', code: 0, killed: false });
      const result = await duAction.execute({}, '/cwd', undefined, ctx);

      // human default true -> -h; summarize default false -> no -s; no path -> use cwd as cwd
      expect(ctx.exec).toHaveBeenCalledWith('du', ['-h'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.details).toMatchObject({ exitCode: 0, killed: false, human: true, summarize: false, path: '/cwd' });
    });

    it('should include -s when summarize=true (and -h by default)', async () => {
      const ctx = mockExec('du', { stdout: 'total', code: 0, killed: false });
      const result = await duAction.execute({ summarize: true }, '/cwd', undefined, ctx);

      // human=true -> -h first, then -s
      expect(ctx.exec).toHaveBeenCalledWith('du', ['-h', '-s'], { cwd: '/cwd', signal: undefined });
      expect(result.details.summarize).toBe(true);
    });

    it('should include custom path as argument (cwd remains original)', async () => {
      const ctx = mockExec('du', { stdout: 'usage', code: 0, killed: false });
      const result = await duAction.execute({ path: '/data' }, '/cwd', undefined, ctx);

      // path added to args, cwd stays '/cwd'
      expect(ctx.exec).toHaveBeenCalledWith('du', ['-h', '/data'], { cwd: '/cwd', signal: undefined });
      expect(result.details.path).toBe('/data');
    });

    it('should combine -h -s and path', async () => {
      const ctx = mockExec('du', { stdout: 'total', code: 0, killed: false });
      const result = await duAction.execute({ summarize: true, human: true, path: '/var' }, '/cwd', undefined, ctx);

      // order: human first -> -h, then summarize -> -s, then path argument
      expect(ctx.exec).toHaveBeenCalledWith('du', ['-h', '-s', '/var'], { cwd: '/cwd', signal: undefined });
      expect(result.details.path).toBe('/var');
    });

    it('should omit -h when human=false', async () => {
      const ctx = mockExec('du', { stdout: 'raw', code: 0, killed: false });
      const result = await duAction.execute({ human: false }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('du', [], { cwd: '/cwd', signal: undefined });
      expect(result.details.human).toBe(false);
    });

    it('should handle error', async () => {
      const ctx = mockExec('du', { stderr: 'du: failed', code: 1, killed: false });
      const result = await duAction.execute({}, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(1);
    });
  });
});
