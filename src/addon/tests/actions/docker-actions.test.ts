import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dockerPsAction, dockerImagesAction } from '../../extensions/tools/actions/docker-actions.js';
import type { ExtensionContext } from './types.js';

function mockExec(expectedCmd: string, result: { stdout: string; stderr: string; code: number; killed?: boolean } = { stdout: '', stderr: '', code: 0 }) {
  return {
    exec: vi.fn(async (cmd: string, args: string[], opts: any) => {
      expect(cmd).toBe(expectedCmd);
      return { ...result, signal: undefined, killed: result.killed ?? false };
    }),
  } as unknown as ExtensionContext;
}

describe('Docker Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('dockerPsAction', () => {
    it('should list containers with default flags', async () => {
      const ctx = mockExec('docker', { stdout: 'CONTAINER ID   IMAGE ...', code: 0, killed: false });
      const result = await dockerPsAction.execute({}, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('docker', ['ps'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.details).toMatchObject({ exitCode: 0, killed: false, all: false, quiet: false });
    });

    it('should include -a when all=true', async () => {
      const ctx = mockExec('docker', { stdout: 'all containers', code: 0, killed: false });
      const result = await dockerPsAction.execute({ all: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('docker', ['ps', '-a'], { cwd: '/cwd', signal: undefined });
      expect(result.details.all).toBe(true);
    });

    it('should include -q when quiet=true', async () => {
      const ctx = mockExec('docker', { stdout: 'ids', code: 0, killed: false });
      const result = await dockerPsAction.execute({ quiet: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('docker', ['ps', '-q'], { cwd: '/cwd', signal: undefined });
      expect(result.details.quiet).toBe(true);
    });

    it('should combine -a and -q', async () => {
      const ctx = mockExec('docker', { stdout: 'ids of all', code: 0, killed: false });
      const result = await dockerPsAction.execute({ all: true, quiet: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('docker', ['ps', '-a', '-q'], { cwd: '/cwd', signal: undefined });
    });

    it('should handle error', async () => {
      const ctx = mockExec('docker', { stderr: 'docker: error', code: 1, killed: false });
      const result = await dockerPsAction.execute({}, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(1);
    });

    it('should handle killed', async () => {
      const ctx = mockExec('docker', { code: 0, killed: true });
      const result = await dockerPsAction.execute({}, '/cwd', undefined, ctx);

      expect(result.details.killed).toBe(true);
    });
  });

  describe('dockerImagesAction', () => {
    it('should list images with default flags', async () => {
      const ctx = mockExec('docker', { stdout: 'REPOSITORY   TAG   IMAGE ID', code: 0, killed: false });
      const result = await dockerImagesAction.execute({}, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('docker', ['images'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.details).toMatchObject({ exitCode: 0, killed: false, all: false, quiet: false });
    });

    it('should include -a when all=true', async () => {
      const ctx = mockExec('docker', { stdout: 'all images', code: 0, killed: false });
      const result = await dockerImagesAction.execute({ all: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('docker', ['images', '-a'], { cwd: '/cwd', signal: undefined });
      expect(result.details.all).toBe(true);
    });

    it('should include -q when quiet=true', async () => {
      const ctx = mockExec('docker', { stdout: 'image ids', code: 0, killed: false });
      const result = await dockerImagesAction.execute({ quiet: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('docker', ['images', '-q'], { cwd: '/cwd', signal: undefined });
      expect(result.details.quiet).toBe(true);
    });

    it('should combine -a and -q', async () => {
      const ctx = mockExec('docker', { stdout: 'ids of all images', code: 0, killed: false });
      const result = await dockerImagesAction.execute({ all: true, quiet: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('docker', ['images', '-a', '-q'], { cwd: '/cwd', signal: undefined });
    });

    it('should handle error', async () => {
      const ctx = mockExec('docker', { stderr: 'docker: error', code: 1, killed: false });
      const result = await dockerImagesAction.execute({}, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(1);
    });

    it('should handle killed', async () => {
      const ctx = mockExec('docker', { code: 0, killed: true });
      const result = await dockerImagesAction.execute({}, '/cwd', undefined, ctx);

      expect(result.details.killed).toBe(true);
    });
  });
});
