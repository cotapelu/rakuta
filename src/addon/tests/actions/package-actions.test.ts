import { describe, it, expect, vi, beforeEach } from 'vitest';
import { npmAction, aptAction } from '../../extensions/tools/actions/package-actions.js';
import type { ExtensionContext } from './types.js';

function mockPkgCtx(cmdExpected: string, result: { stdout: string; stderr: string; code: number; killed: boolean }) {
  return {
    exec: vi.fn(async (cmd: string, args: string[], opts: any) => {
      expect(cmd).toBe(cmdExpected);
      return { ...result, signal: undefined };
    }),
  } as unknown as ExtensionContext;
}

describe('Package Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('npmAction', () => {
    it('should require an operation', async () => {
      const ctx = mockPkgCtx('npm', { stdout: '', stderr: '', code: 0, killed: false });
      await expect(npmAction.execute({}, '/cwd', undefined, ctx)).rejects.toThrow('npm requires an operation');
    });

    it('should install packages locally', async () => {
      const ctx = mockPkgCtx('npm', { stdout: 'added 50 packages', stderr: '', code: 0, killed: false });
      const result = await npmAction.execute({ install: true, packages: ['lodash', 'axios'] }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('npm', ['install', 'lodash', 'axios'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.details.install).toBe(true);
      expect(result.details.packages).toEqual(['lodash', 'axios']);
    });

    it('should install globally', async () => {
      const ctx = mockPkgCtx('npm', { stdout: 'global install', stderr: '', code: 0, killed: false });
      const result = await npmAction.execute({ install: true, global: true, packages: ['typescript'] }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('npm', ['install', '-g', 'typescript'], { cwd: '/cwd', signal: undefined });
      expect(result.details.global).toBe(true);
    });

    it('should handle npm error', async () => {
      const ctx = mockPkgCtx('npm', { stdout: '', stderr: 'E404 Not found', code: 1, killed: false });
      const result = await npmAction.execute({ install: true, packages: ['nonexistent'] }, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(1);
    });
  });

  describe('aptAction', () => {
    it('should require an operation', async () => {
      const ctx = mockPkgCtx('apt-get', { stdout: '', stderr: '', code: 0, killed: false });
      await expect(aptAction.execute({}, '/cwd', undefined, ctx)).rejects.toThrow('apt requires an operation');
    });

    it('should update package lists', async () => {
      const ctx = mockPkgCtx('apt-get', { stdout: 'Fetched 1000 kB', stderr: '', code: 0, killed: false });
      const result = await aptAction.execute({ update: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('apt-get', ['update'], { cwd: '/cwd', signal: undefined });
      expect(result.details.update).toBe(true);
    });

    it('should install packages', async () => {
      const ctx = mockPkgCtx('apt-get', { stdout: 'Installing...', stderr: '', code: 0, killed: false });
      const result = await aptAction.execute({ install: ['curl', 'wget'] }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('apt-get', ['install', 'curl', 'wget'], { cwd: '/cwd', signal: undefined });
      expect(result.details.install).toEqual(['curl', 'wget']);
    });

    it('should combine update and install', async () => {
      const ctx = mockPkgCtx('apt-get', { stdout: 'Updated and installed', stderr: '', code: 0, killed: false });
      const result = await aptAction.execute({ update: true, install: ['git'] }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('apt-get', ['update', 'install', 'git'], { cwd: '/cwd', signal: undefined });
    });

    it('should handle apt error', async () => {
      const ctx = mockPkgCtx('apt-get', { stdout: '', stderr: 'Unable to locate package', code: 100, killed: false });
      const result = await aptAction.execute({ install: ['unknown'] }, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(100);
    });
  });

  describe('getParameters', () => {
    it('npmAction schema', () => {
      const params = npmAction.getParameters();
      expect(params.properties).toMatchObject({
        install: { type: 'boolean', description: 'Install packages' },
        global: { type: 'boolean', description: 'Global install' },
        packages: { type: 'array', items: { type: 'string' }, description: 'Package names' }
      });
      expect(params.required).toEqual([]);
    });

    it('aptAction schema', () => {
      const params = aptAction.getParameters();
      expect(params.properties).toMatchObject({
        update: { type: 'boolean', description: 'Update package lists' },
        install: { type: 'array', items: { type: 'string' }, description: 'Packages to install' }
      });
      expect(params.required).toEqual([]);
    });
  });
});
