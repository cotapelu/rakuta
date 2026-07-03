import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pingAction, curlAction } from '../../extensions/tools/actions/network-actions.js';
import type { ExtensionContext } from './types.js';

function mockCtxExec(cmd: string, result: { stdout: string; stderr: string; code: number; killed: boolean }) {
  return {
    exec: vi.fn(async (c: string, args: string[], opts: any) => {
      expect(c).toBe(cmd);
      return { ...result, signal: undefined };
    }),
  } as unknown as ExtensionContext;
}

describe('Network Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pingAction', () => {
    it('should ping host with defaults', async () => {
      const ctx = mockCtxExec('ping', { stdout: '64 bytes from', stderr: '', code: 0, killed: false });
      const result = await pingAction.execute({ host: 'example.com' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('ping', ['-c4', '-W2', 'example.com'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.details).toMatchObject({ host: 'example.com', count: 4, timeout: 2 });
    });

    it('should use custom count and timeout', async () => {
      const ctx = mockCtxExec('ping', { stdout: 'bytes', stderr: '', code: 0, killed: false });
      const result = await pingAction.execute({ host: '1.2.3.4', count: 10, timeout: 5 }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('ping', ['-c10', '-W5', '1.2.3.4'], { cwd: '/cwd', signal: undefined });
      expect(result.details.count).toBe(10);
      expect(result.details.timeout).toBe(5);
    });

    it('should handle missing host (execution error)', async () => {
      const ctx = mockCtxExec('ping', { stdout: '', stderr: '', code: 1, killed: false });
      const result = await pingAction.execute({} as any, '/cwd', undefined, ctx);
      expect(result.isError).toBe(true);
    });

    it('should handle ping failure', async () => {
      const ctx = mockCtxExec('ping', { stdout: '', stderr: '100% packet loss', code: 2, killed: false });
      const result = await pingAction.execute({ host: 'down' }, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(2);
    });
  });

  describe('curlAction', () => {
    it('should perform GET request by default', async () => {
      const ctx = mockCtxExec('curl', { stdout: 'response body', stderr: '', code: 0, killed: false });
      const result = await curlAction.execute({ url: 'https://api.test' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('curl', ['https://api.test'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
      expect(result.details.url).toBe('https://api.test');
    });

    it('should use custom method', async () => {
      const ctx = mockCtxExec('curl', { stdout: 'ok', stderr: '', code: 0, killed: false });
      const result = await curlAction.execute({ url: 'https://api.test', method: 'POST' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('curl', ['-X', 'POST', 'https://api.test'], { cwd: '/cwd', signal: undefined });
      expect(result.details.method).toBe('POST');
    });

    it('should include headers', async () => {
      const ctx = mockCtxExec('curl', { stdout: 'ok', stderr: '', code: 0, killed: false });
      const result = await curlAction.execute({
        url: 'https://api.test',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' }
      }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('curl', ['-H', 'Authorization: Bearer token', '-H', 'Content-Type: application/json', 'https://api.test'], { cwd: '/cwd', signal: undefined });
    });

    it('should include data payload', async () => {
      const ctx = mockCtxExec('curl', { stdout: 'ok', stderr: '', code: 0, killed: false });
      await curlAction.execute({ url: 'https://api.test', method: 'POST', data: '{"key":"value"}' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('curl', ['-X', 'POST', '-d', '{"key":"value"}', 'https://api.test'], { cwd: '/cwd', signal: undefined });
    });

    it('should write output to file', async () => {
      const ctx = mockCtxExec('curl', { stdout: 'saved', stderr: '', code: 0, killed: false });
      const result = await curlAction.execute({ url: 'https://api.test', output: 'out.json' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('curl', ['-o', 'out.json', 'https://api.test'], { cwd: '/cwd', signal: undefined });
      expect(result.details.output).toBe('out.json');
    });

    it('should combine multiple options', async () => {
      const ctx = mockCtxExec('curl', { stdout: 'done', stderr: '', code: 0, killed: false });
      await curlAction.execute({
        url: 'https://api.test',
        method: 'PATCH',
        headers: { 'X-Custom': 'val' },
        data: 'patch',
        output: 'result.txt'
      }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('curl', [
        '-X', 'PATCH',
        '-H', 'X-Custom: val',
        '-d', 'patch',
        '-o', 'result.txt',
        'https://api.test'
      ], { cwd: '/cwd', signal: undefined });
    });

    it('should handle missing url (execution error)', async () => {
      const ctx = mockCtxExec('curl', { stdout: '', stderr: 'curl: no URL specified', code: 1, killed: false });
      const result = await curlAction.execute({} as any, '/cwd', undefined, ctx);
      expect(result.isError).toBe(true);
    });

    it('should handle curl error', async () => {
      const ctx = mockCtxExec('curl', { stdout: '', stderr: 'Connection refused', code: 7, killed: false });
      const result = await curlAction.execute({ url: 'https://down' }, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(7);
    });
  });

  describe('getParameters', () => {
    it('pingAction should have required host and optional count/timeout', () => {
      const params = pingAction.getParameters();
      expect(params.required).toContain('host');
      expect(params.properties.host).toEqual({ type: 'string', description: 'Hostname or IP address to ping' });
      expect(params.properties.count).toMatchObject({ type: 'number', default: 4 });
      expect(params.properties.timeout).toMatchObject({ type: 'number', default: 2 });
    });

    it('curlAction should have required url', () => {
      const params = curlAction.getParameters();
      expect(params.required).toContain('url');
      expect(params.properties.url).toEqual({ type: 'string', description: 'URL to request' });
      expect(params.properties.method).toEqual({ type: 'string', description: 'HTTP method (GET, POST, etc.)', default: 'GET' });
    });
  });
});
