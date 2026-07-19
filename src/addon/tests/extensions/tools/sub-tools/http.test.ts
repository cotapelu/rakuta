import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeHttp } from '../../../../extensions/tools/sub-tools/http';

// Mock fs/promises unlink
vi.mock('fs/promises', async () => {
  const actual = await vi.importActual('fs/promises');
  return {
    ...actual as any,
    unlink: vi.fn().mockResolvedValue(undefined),
  };
});

describe('executeHttp', () => {
  let mockExec: any;
  let cwd: string;

  beforeEach(() => {
    mockExec = vi.fn().mockResolvedValue({ stdout: 'ok', stderr: '', code: 0 });
    cwd = '/work';
  });

  function call(args: any, signal?: any) {
    const ctx = { exec: mockExec };
    return executeHttp(args, cwd, signal, ctx);
  }

  it('uses GET by default', async () => {
    const res = await call({ url: 'https://example.com' });
    expect(res.isError).toBe(false);
    expect(mockExec).toHaveBeenCalled();
  });

  it('overrides method when not GET', async () => {
    const res = await call({ url: 'https://example.com', method: 'POST' });
    expect(res.isError).toBe(false);
  });

  it('adds headers', async () => {
    const res = await call({ url: 'https://example.com', headers: { 'X-Test': '123' } });
    expect(res.isError).toBe(false);
  });

  it('creates temp file for body in POST', async () => {
    const res = await call({ url: 'https://example.com', method: 'POST', body: { k: 'v' } });
    expect(res.isError).toBe(false);
  });

  it('does not create temp file for GET', async () => {
    await call({ url: 'https://example.com' });
    const [, cmdArgs] = mockExec.mock.calls[0];
    // Ensure '--data' not used
    expect(cmdArgs.some((a: string) => a === '--data')).toBe(false);
  });

  it('includes timeout', async () => {
    await call({ url: 'https://example.com', timeout: 15 });
    const [, cmdArgs] = mockExec.mock.calls[0];
    expect(cmdArgs).toContain('--max-time');
    expect(cmdArgs).toContain('15');
  });

  it('includes insecure flag', async () => {
    await call({ url: 'https://example.com', insecure: true });
    const [, cmdArgs] = mockExec.mock.calls[0];
    expect(cmdArgs).toContain('-k');
  });

  it('includes user credentials', async () => {
    await call({ url: 'https://example.com', user: 'user:pass' });
    const [, cmdArgs] = mockExec.mock.calls[0];
    expect(cmdArgs).toContain('-u');
    expect(cmdArgs).toContain('user:pass');
  });

  it('includes verbose flag', async () => {
    await call({ url: 'https://example.com', verbose: true });
    const [, cmdArgs] = mockExec.mock.calls[0];
    expect(cmdArgs).toContain('-v');
  });

  it('returns error when exit code non-zero', async () => {
    mockExec.mockResolvedValueOnce({ stdout: '', stderr: 'fail', code: 22 });
    const res = await call({ url: 'https://fail' });
    expect(res.isError).toBe(true);
    expect(res.details.exitCode).toBe(22);
  });

  it('handles thrown exception', async () => {
    mockExec.mockRejectedValueOnce(new Error('network down'));
    const res = await call({ url: 'https://fail' });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('HTTP error');
  });
});
