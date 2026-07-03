import { describe, it, expect, vi, beforeEach } from 'vitest';
import { npmAction, aptAction } from '../../extensions/tools/actions/package-actions.js';
import type { ExtensionContext } from './types.js';

function mockExec(expectedCmd: string, result: { stdout: string; stderr: string; code: number; killed?: boolean } = { stdout: '', stderr: '', code: 0 }) {
  return {
    exec: vi.fn(async (cmd: string, args: string[], opts: any) => {
      expect(cmd).toBe(expectedCmd);
      return { ...result, signal: undefined, killed: result.killed ?? false };
    }),
  } as unknown as ExtensionContext;
}

describe('Package Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('npmAction', () => {
    it('should install packages locally', async () => {
      const ctx = mockExec('npm', { stdout: 'added 5 packages', code: 0, killed: false });
      const result = await npmAction.execute({ install: true, packages: ['lodash'] }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('npm', ['install', 'lodash'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.details).toMatchObject({ exitCode: 0, killed: false, install: true, global: false, packages: ['lodash'] });
    });

    it('should install globally', async () => {
      const ctx = mockExec('npm', { stdout: 'global install ok', code: 0, killed: false });
      const result = await npmAction.execute({ install: true, global: true, packages: ['typescript'] }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('npm', ['install', '-g', 'typescript'], { cwd: '/cwd', signal: undefined });
      expect(result.details.global).toBe(true);
    });

    it('should install multiple packages', async () => {
      const ctx = mockExec('npm', { stdout: 'ok', code: 0, killed: false });
      const result = await npmAction.execute({ install: true, packages: ['pkg1', 'pkg2'] }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('npm', ['install', 'pkg1', 'pkg2'], { cwd: '/cwd', signal: undefined });
      expect(result.details.packages).toEqual(['pkg1', 'pkg2']);
    });

    it('should throw if no operation specified', async () => {
      // npmAction execute will throw if npmArgs empty
      await expect(npmAction.execute({}, '/cwd', undefined, mockExec('npm'))).rejects.toThrow('npm requires an operation');
    });

    it('should handle error', async () => {
      const ctx = mockExec('npm', { stderr: 'npm ERR!', code: 1, killed: false });
      const result = await npmAction.execute({ install: true, packages: ['bad'] }, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(1);
    });

    it('should handle killed', async () => {
      const ctx = mockExec('npm', { code: 0, killed: true });
      const result = await npmAction.execute({ install: true, packages: ['x'] }, '/cwd', undefined, ctx);

      expect(result.details.killed).toBe(true);
    });
  });

  describe('aptAction', () => {
    it('should update package lists', async () => {
      const ctx = mockExec('apt-get', { stdout: 'Get:1 http://...', code: 0, killed: false });
      const result = await aptAction.execute({ update: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('apt-get', ['update'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.details).toMatchObject({ exitCode: 0, killed: false, update: true, install: [] });
    });

    it('should install packages', async () => {
      const ctx = mockExec('apt-get', { stdout: 'Setting up ...', code: 0, killed: false });
      const result = await aptAction.execute({ install: ['git', 'curl'] }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('apt-get', ['install', 'git', 'curl'], { cwd: '/cwd', signal: undefined });
      expect(result.details.install).toEqual(['git', 'curl']);
    });

    it('should combine update and install', async () => {
      const ctx = mockExec('apt-get', { stdout: '...', code: 0, killed: false });
      const result = await aptAction.execute({ update: true, install: ['vim'] }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('apt-get', ['update', 'install', 'vim'], { cwd: '/cwd', signal: undefined });
    });

    it('should throw if no operation specified', async () => {
      await expect(aptAction.execute({}, '/cwd', undefined, mockExec('apt-get'))).rejects.toThrow('apt requires an operation');
    });

    it('should handle error', async () => {
      const ctx = mockExec('apt-get', { stderr: 'E: Unable', code: 1, killed: false });
      const result = await aptAction.execute({ install: ['bad'] }, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(1);
    });

    it('should handle killed', async () => {
      const ctx = mockExec('apt-get', { code: 0, killed: true });
      const result = await aptAction.execute({ update: true, install: [] }, '/cwd', undefined, ctx);

      expect(result.details.killed).toBe(true);
    });
  });
});
