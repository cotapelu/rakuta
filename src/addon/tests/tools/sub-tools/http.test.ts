import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeHttp } from '../../../extensions/tools/sub-tools/http.js';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

function mockExec(stdout = 'response body', code = 0) {
  return { stdout, stderr: '', code, killed: false };
}

function mockCtx(result: ReturnType<typeof mockExec>) {
  return {
    exec: vi.fn(async (cmd: string, args: string[], opts: any) => {
      expect(cmd).toBe('curl');
      return result;
    }),
  };
}

describe('Http Sub-Tool', () => {
  let ctx: ReturnType<typeof mockCtx>;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = mockCtx(mockExec());
    vi.mocked(fs.unlink).mockResolvedValue(undefined);
  });

  it('should execute default GET request', async () => {
    const result = await executeHttp({ url: 'https://api.example.com' }, '/cwd', undefined, ctx);
    expect(ctx.exec).toHaveBeenCalledWith('curl', ['--max-time', '30', 'https://api.example.com'], { cwd: '/cwd', signal: undefined });
    expect(result.isError).toBe(false);
  });

  it('should use custom method', async () => {
    await executeHttp({ method: 'POST', url: 'https://api.example.com' }, '/cwd', undefined, ctx);
    expect(ctx.exec).toHaveBeenCalledWith('curl', ['-X', 'POST', '--max-time', '30', 'https://api.example.com'], { cwd: '/cwd', signal: undefined });
  });

  it('should add headers', async () => {
    await executeHttp({
      url: 'https://api.example.com',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
    }, '/cwd', undefined, ctx);
    expect(ctx.exec).toHaveBeenCalledWith('curl', [
      '-H', 'Authorization: Bearer token',
      '-H', 'Content-Type: application/json',
      '--max-time', '30',
      'https://api.example.com',
    ], { cwd: '/cwd', signal: undefined });
  });

  it('should include body for POST as string and create temp file', async () => {
    const body = 'raw body';
    await executeHttp({
      method: 'POST',
      url: 'https://api.example.com',
      body,
    }, '/cwd', undefined, ctx);
    // Should have called fs.writeFile
    expect(fs.writeFile).toHaveBeenCalledWith(expect.stringMatching(/^.*\/curl-data-.*\.txt$/), body, 'utf8');
    // Should pass --data @file before --max-time
    const args = ctx.exec.mock.calls[0][1];
    const dataIndex = args.indexOf('--data');
    expect(dataIndex).toBeGreaterThan(-1);
    expect(args[dataIndex + 1]).toMatch(/^@.*\.txt$/);
    // Ensure --max-time comes after --data and before url
    const maxTimeIdx = args.indexOf('--max-time');
    expect(maxTimeIdx).toBe(dataIndex + 2); // right after --data arg
    expect(args[maxTimeIdx + 1]).toBe('30');
    // Cleanup
    expect(fs.unlink).toHaveBeenCalledWith(expect.stringMatching(/^.*\.txt$/));
  });

  it('should include body for POST as object and JSON.stringify', async () => {
    const body = { key: 'value' };
    await executeHttp({
      method: 'POST',
      url: 'https://api.example.com',
      body,
    }, '/cwd', undefined, ctx);
    expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), JSON.stringify(body), 'utf8');
  });

  it('should set timeout', async () => {
    await executeHttp({ url: 'https://api.example.com', timeout: 15 }, '/cwd', undefined, ctx);
    const args = ctx.exec.mock.calls[0][1];
    const idx = args.indexOf('--max-time');
    expect(idx).toBeGreaterThan(-1);
    expect(args[idx + 1]).toBe('15');
  });

  it('should add -k for insecure', async () => {
    await executeHttp({ url: 'https://api.example.com', insecure: true }, '/cwd', undefined, ctx);
    const args = ctx.exec.mock.calls[0][1];
    expect(args).toContain('-k');
    // Check ordering: -k after --max-time, before url
    const maxIdx = args.indexOf('--max-time');
    const kIdx = args.indexOf('-k');
    const urlIdx = args.indexOf('https://api.example.com');
    expect(maxIdx).toBeLessThan(kIdx);
    expect(kIdx).toBeLessThan(urlIdx);
  });

  it('should add -u for user', async () => {
    await executeHttp({ url: 'https://api.example.com', user: 'user:pass' }, '/cwd', undefined, ctx);
    const args = ctx.exec.mock.calls[0][1];
    expect(args).toContain('-u');
    expect(args[args.indexOf('-u') + 1]).toBe('user:pass');
  });

  it('should add -v for verbose', async () => {
    await executeHttp({ url: 'https://api.example.com', verbose: true }, '/cwd', undefined, ctx);
    const args = ctx.exec.mock.calls[0][1];
    expect(args).toContain('-v');
  });

  it('should handle curl error', async () => {
    ctx = mockCtx({ stdout: '', stderr: 'error', code: 22, killed: false });
    const result = await executeHttp({ url: 'https://api.example.com' }, '/cwd', undefined, ctx);
    expect(result.isError).toBe(true);
  });

  it('should cleanup temp file on success', async () => {
    await executeHttp({ method: 'POST', url: 'https://api.example.com', body: 'data' }, '/cwd', undefined, ctx);
    expect(fs.unlink).toHaveBeenCalled();
  });

  it('should not create temp file for GET', async () => {
    await executeHttp({ method: 'GET', url: 'https://api.example.com' }, '/cwd', undefined, ctx);
    expect(fs.writeFile).not.toHaveBeenCalled();
    expect(fs.unlink).not.toHaveBeenCalled();
  });
});
