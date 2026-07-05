import { describe, it, expect, vi, beforeEach } from 'vitest';
import checkout from '../checkout.ts';

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

describe('git.checkout capability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should checkout existing branch when create=false', async () => {
    const ctx = mockCtx({ stdout: 'Switched to branch \'main\'\n', code: 0 });
    const result = await checkout.execute({ branch: 'main' }, ctx);
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Switched to');
    expect(ctx.exec).toHaveBeenCalledWith('git', ['checkout', 'main'], expect.anything());
    expect(result.details).toEqual({ branch: 'main', created: false });
  });

  it('should create and checkout new branch when create=true', async () => {
    const ctx = mockCtx({ stdout: 'Switched to a new branch \'feature\'\n', code: 0 });
    const result = await checkout.execute({ branch: 'feature', create: true }, ctx);
    expect(result.isError).toBe(false);
    expect(ctx.exec).toHaveBeenCalledWith('git', ['checkout', '-b', 'feature'], expect.anything());
    expect(result.details).toEqual({ branch: 'feature', created: true });
  });

  it('should return error when git command fails', async () => {
    const ctx = mockCtx({ stderr: 'error: pathspec \'nonexistent\' did not match any file(s) known to git', code: 1 });
    const result = await checkout.execute({ branch: 'nonexistent' }, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('❌ git checkout failed');
    expect(result.details.exitCode).toBe(1);
  });

  it('should handle exec exception gracefully', async () => {
    const ctx = mockCtx();
    (ctx.exec as any).mockRejectedValue(new Error('git command not available'));
    const result = await checkout.execute({ branch: 'main' }, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('❌ Error: git command not available');
    expect(result.details.error).toBe('git command not available');
  });
});
