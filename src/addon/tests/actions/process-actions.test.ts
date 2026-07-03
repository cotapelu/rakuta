import { describe, it, expect, vi, beforeEach } from 'vitest';
import { psAction, killAction } from '../../extensions/tools/actions/process-actions.js';
import type { ExtensionContext } from './types.js';

function mockCtxExec(result: { stdout: string; stderr: string; code: number; killed: boolean } = { stdout: '', stderr: '', code: 0, killed: false }) {
  return {
    exec: vi.fn(async (cmd: string, args: string[], opts: any) => {
      if (cmd === 'ps') {
        return { ...result, signal: undefined };
      } else if (cmd === 'kill') {
        return { ...result, signal: undefined };
      }
      throw new Error('unexpected cmd');
    }),
  } as unknown as ExtensionContext;
}

describe('Process Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('psAction', () => {
    it('should list processes with default aux format', async () => {
      const ctx = mockCtxExec({ stdout: 'PID TT  STAT', stderr: '', code: 0, killed: false });
      const result = await psAction.execute({}, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('ps', ['aux'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.details).toMatchObject({ exitCode: 0, killed: false, format: 'aux' });
    });

    it('should use custom format', async () => {
      const ctx = mockCtxExec({ stdout: 'output', stderr: '', code: 0, killed: false });
      const result = await psAction.execute({ format: 'ef' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('ps', ['ef'], { cwd: '/cwd', signal: undefined });
      expect(result.details.format).toBe('ef');
    });

    it('should handle ps error', async () => {
      const ctx = mockCtxExec({ stdout: '', stderr: 'Error', code: 1, killed: false });
      const result = await psAction.execute({}, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(1);
    });
  });

  describe('killAction', () => {
    it('should kill process with default TERM signal', async () => {
      const ctx = mockCtxExec({ stdout: '', stderr: '', code: 0, killed: false });
      const result = await killAction.execute({ pid: 1234 }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('kill', ['-TERM', '1234'], { cwd: '/cwd', signal: undefined });
      expect(result.details).toMatchObject({ exitCode: 0, killed: false, pid: 1234, signal: 'TERM' });
    });

    it('should use custom signal', async () => {
      const ctx = mockCtxExec({ stdout: '', stderr: '', code: 0, killed: false });
      const result = await killAction.execute({ pid: 999, signal: 'KILL' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('kill', ['-KILL', '999'], { cwd: '/cwd', signal: undefined });
      expect(result.details.signal).toBe('KILL');
    });

    it('should handle missing pid gracefully (returns error result)', async () => {
      const ctx = mockCtxExec({ stdout: '', stderr: 'kill: usage: kill -s signal_name pid ...', code: 1, killed: false });
      // Passing empty args results in pid undefined; kill command will likely fail
      const result = await killAction.execute({} as any, '/cwd', undefined, ctx);
      expect(result.isError).toBe(true);
    });

    it('should handle kill error', async () => {
      const ctx = mockCtxExec({ stdout: '', stderr: 'No such process', code: 1, killed: false });
      const result = await killAction.execute({ pid: 99999 }, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(1);
    });
  });

  describe('getParameters', () => {
    it('psAction should have optional format', () => {
      const params = psAction.getParameters();
      expect(params.properties.format).toEqual({ type: 'string', description: 'ps format options (e.g., \'aux\', \'ef\')' });
      expect(params.required).toEqual([]);
    });

    it('killAction should have required pid and optional signal', () => {
      const params = killAction.getParameters();
      expect(params.required).toContain('pid');
      expect(params.properties.pid).toEqual({ type: 'number', description: 'Process ID to kill' });
      expect(params.properties.signal).toEqual({ type: 'string', description: 'Signal to send (TERM, KILL, HUP, etc.)' });
    });
  });
});
