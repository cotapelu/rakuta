import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pingAction, curlAction } from '../../extensions/tools/actions/network-actions.js';
import type { ExtensionContext } from './types.js';

function mockExec(expectedCmd: string, result: { stdout: string; stderr: string; code: number; killed?: boolean } = { stdout: '', stderr: '', code: 0 }) {
  return {
    exec: vi.fn(async (cmd: string, args: string[], opts: any) => {
      expect(cmd).toBe(expectedCmd);
      return { ...result, signal: undefined, killed: result.killed ?? false };
    }),
  } as unknown as ExtensionContext;
}

describe('Network Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pingAction', () => {
    it('should ping host with default count and timeout', async () => {
      const ctx = mockExec('ping', { stdout: '64 bytes from ...', code: 0, killed: false });
      const result = await pingAction.execute({ host: 'example.com' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('ping', ['-c4', '-W2', 'example.com'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.details).toMatchObject({ exitCode: 0, killed: false, host: 'example.com', count: 4, timeout: 2 });
    });

    it('should respect custom count and timeout', async () => {
      const ctx = mockExec('ping', { stdout: 'ping ...', code: 0, killed: false });
      const result = await pingAction.execute({ host: '1.2.3.4', count: 10, timeout: 5 }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('ping', ['-c10', '-W5', '1.2.3.4'], { cwd: '/cwd', signal: undefined });
      expect(result.details.count).toBe(10);
      expect(result.details.timeout).toBe(5);
    });

    it('should handle ping failure', async () => {
      const ctx = mockExec('ping', { stderr: 'ping: unknown host', code: 2, killed: false });
      const result = await pingAction.execute({ host: 'badhost' }, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(2);
    });

    it('should handle killed', async () => {
      const ctx = mockExec('ping', { code: 0, killed: true });
      const result = await pingAction.execute({ host: 'example.com' }, '/cwd', undefined, ctx);

      expect(result.details.killed).toBe(true);
    });
  });

  describe('curlAction', () => {
    it('should GET URL by default', async () => {
      const ctx = mockExec('curl', { stdout: 'response body', code: 0, killed: false });
      const result = await curlAction.execute({ url: 'https://api.test' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('curl', ['https://api.test'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.details).toMatchObject({ exitCode: 0, killed: false, url: 'https://api.test', method: 'GET', output: undefined });
    });

    it('should set custom method', async () => {
      const ctx = mockExec('curl', { stdout: 'updated', code: 0, killed: false });
      const result = await curlAction.execute({ url: 'https://api.test', method: 'POST' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('curl', ['-X', 'POST', 'https://api.test'], { cwd: '/cwd', signal: undefined });
      expect(result.details.method).toBe('POST');
    });

    it('should add headers', async () => {
      const ctx = mockExec('curl', { stdout: 'ok', code: 0, killed: false });
      const result = await curlAction.execute({ url: 'https://api.test', headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' } }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('curl', ['-H', 'Authorization: Bearer token', '-H', 'Content-Type: application/json', 'https://api.test'], { cwd: '/cwd', signal: undefined });
    });

    it('should add data for POST/PUT', async () => {
      const ctx = mockExec('curl', { stdout: 'created', code: 0, killed: false });
      const result = await curlAction.execute({ url: 'https://api.test', method: 'POST', data: '{"key":"value"}' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('curl', ['-X', 'POST', '-d', '{"key":"value"}', 'https://api.test'], { cwd: '/cwd', signal: undefined });
    });

    it('should add output flag', async () => {
      const ctx = mockExec('curl', { stdout: 'saved', code: 0, killed: false });
      const result = await curlAction.execute({ url: 'https://file', output: '/tmp/out' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('curl', ['-o', '/tmp/out', 'https://file'], { cwd: '/cwd', signal: undefined });
      expect(result.details.output).toBe('/tmp/out');
    });

    it('should combine multiple options', async () => {
      const ctx = mockExec('curl', { stdout: 'done', code: 0, killed: false });
      const result = await curlAction.execute({
        url: 'https://api.test',
        method: 'PATCH',
        headers: { 'X-ID': '123' },
        data: 'patch',
        output: '/out'
      }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('curl', ['-X', 'PATCH', '-H', 'X-ID: 123', '-d', 'patch', '-o', '/out', 'https://api.test'], { cwd: '/cwd', signal: undefined });
    });

    it('should handle error', async () => {
      const ctx = mockExec('curl', { stderr: 'curl: (6) Could not resolve host', code: 6, killed: false });
      const result = await curlAction.execute({ url: 'https://bad' }, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(6);
    });

    it('should handle killed', async () => {
      const ctx = mockExec('curl', { code: 0, killed: true });
      const result = await curlAction.execute({ url: 'https://test' }, '/cwd', undefined, ctx);

      expect(result.details.killed).toBe(true);
    });
  });
});
