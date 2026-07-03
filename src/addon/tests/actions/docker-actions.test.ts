import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dockerPsAction, dockerImagesAction } from '../../extensions/tools/actions/docker-actions.js';
import type { ExtensionContext } from './types.js';

function mockDockerCtx(result: { stdout: string; stderr: string; code: number; killed: boolean }) {
  return {
    exec: vi.fn(async (cmd: string, args: string[], opts: any) => {
      expect(cmd).toBe('docker');
      return { ...result, signal: undefined };
    }),
  } as unknown as ExtensionContext;
}

describe('Docker Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('dockerPsAction', () => {
    it('should list containers with default options', async () => {
      const ctx = mockDockerCtx({ stdout: 'CONTAINER ID', stderr: '', code: 0, killed: false });
      const result = await dockerPsAction.execute({}, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('docker', ['ps'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.details).toMatchObject({ all: false, quiet: false });
    });

    it('should include -a when all=true', async () => {
      const ctx = mockDockerCtx({ stdout: 'all containers', stderr: '', code: 0, killed: false });
      const result = await dockerPsAction.execute({ all: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('docker', ['ps', '-a'], { cwd: '/cwd', signal: undefined });
      expect(result.details.all).toBe(true);
    });

    it('should include -q when quiet=true', async () => {
      const ctx = mockDockerCtx({ stdout: '12345', stderr: '', code: 0, killed: false });
      const result = await dockerPsAction.execute({ quiet: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('docker', ['ps', '-q'], { cwd: '/cwd', signal: undefined });
      expect(result.details.quiet).toBe(true);
    });

    it('should combine all and quiet', async () => {
      const ctx = mockDockerCtx({ stdout: 'ids', stderr: '', code: 0, killed: false });
      await dockerPsAction.execute({ all: true, quiet: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('docker', ['ps', '-a', '-q'], { cwd: '/cwd', signal: undefined });
    });

    it('should handle error', async () => {
      const ctx = mockDockerCtx({ stdout: '', stderr: 'Docker daemon not running', code: 1, killed: false });
      const result = await dockerPsAction.execute({}, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(1);
    });
  });

  describe('dockerImagesAction', () => {
    it('should list images with default options', async () => {
      const ctx = mockDockerCtx({ stdout: 'REPOSITORY', stderr: '', code: 0, killed: false });
      const result = await dockerImagesAction.execute({}, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('docker', ['images'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
    });

    it('should list all images', async () => {
      const ctx = mockDockerCtx({ stdout: 'all images', stderr: '', code: 0, killed: false });
      const result = await dockerImagesAction.execute({ all: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('docker', ['images', '-a'], { cwd: '/cwd', signal: undefined });
      expect(result.details.all).toBe(true);
    });

    it('should handle quiet mode', async () => {
      const ctx = mockDockerCtx({ stdout: 'sha256:abc', stderr: '', code: 0, killed: false });
      const result = await dockerImagesAction.execute({ quiet: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('docker', ['images', '-q'], { cwd: '/cwd', signal: undefined });
      expect(result.details.quiet).toBe(true);
    });

    it('should handle error', async () => {
      const ctx = mockDockerCtx({ stdout: '', stderr: 'error', code: 1, killed: false });
      const result = await dockerImagesAction.execute({ all: true, quiet: true }, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
    });
  });

  describe('getParameters', () => {
    it('dockerPsAction should have correct schema', () => {
      const params = dockerPsAction.getParameters();
      expect(params.properties).toMatchObject({
        all: { type: 'boolean', description: 'Show all containers (including stopped)' },
        quiet: { type: 'boolean', description: 'Only display numeric IDs' },
      });
      expect(params.required).toEqual([]);
    });

    it('dockerImagesAction should have correct schema', () => {
      const params = dockerImagesAction.getParameters();
      expect(params.properties.all.description).toContain('intermediate');
    });
  });
});
