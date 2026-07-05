import { describe, it, expect, vi, beforeEach } from 'vitest';
import push from '../push.ts';

function mockCtx(opts: { stdout?: string; stderr?: string; code?: number } = {}) {
  return {
    cwd: '/test',
    exec: vi.fn(async () => ({
      stdout: opts.stdout || '',
      stderr: opts.stderr || '',
      code: opts.code ?? 0,
      killed: false,
    })),
  };
}

describe('git.push capability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should push to default remote (origin) without branch', async () => {
    const ctx = mockCtx({ stdout: 'Everything up-to-date', code: 0 });
    const result = await push.execute({}, ctx);
    expect(result.isError).toBe(false);
    expect(ctx.exec).toHaveBeenCalledWith('git', ['push', 'origin'], expect.anything());
    expect(result.details).toEqual({ remote: 'origin', branch: undefined, setUpstream: false });
  });

  it('should push with specific remote and branch', async () => {
    const ctx = mockCtx({ stdout: '', code: 0 });
    const result = await push.execute({ remote: 'upstream', branch: 'main' }, ctx);
    expect(result.isError).toBe(false);
    expect(ctx.exec).toHaveBeenCalledWith('git', ['push', 'upstream', 'main'], expect.anything());
    expect(result.details).toEqual({ remote: 'upstream', branch: 'main', setUpstream: false });
  });

  it('should push with setUpstream flag', async () => {
    const ctx = mockCtx({ stdout: '', code: 0 });
    const result = await push.execute({ remote: 'origin', branch: 'feature', setUpstream: true }, ctx);
    expect(result.isError).toBe(false);
    expect(ctx.exec).toHaveBeenCalledWith('git', ['push', '-u', 'origin', 'feature'], expect.anything());
    expect(result.details).toEqual({ remote: 'origin', branch: 'feature', setUpstream: true });
  });

  it('should return error when git push fails', async () => {
    const ctx = mockCtx({ stderr: 'fatal: unable to access', code: 1 });
    const result = await push.execute({ remote: 'origin' }, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('❌ git push failed');
    expect(result.details.exitCode).toBe(1);
  });

  it('should handle exec exception gracefully', async () => {
    const ctx = mockCtx();
    (ctx.exec as any).mockRejectedValue(new Error('git not found'));
    const result = await push.execute({ remote: 'origin' }, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('❌ Error: git not found');
  });
});
