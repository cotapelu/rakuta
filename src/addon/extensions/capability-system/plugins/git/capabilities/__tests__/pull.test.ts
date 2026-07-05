import { describe, it, expect, vi, beforeEach } from 'vitest';
import pull from '../pull.ts';

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

describe('git.pull capability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pull from default remote (origin) without branch', async () => {
    const ctx = mockCtx({ stdout: 'Already up to date.', code: 0 });
    const result = await pull.execute({}, ctx);
    expect(result.isError).toBe(false);
    expect(ctx.exec).toHaveBeenCalledWith('git', ['pull', 'origin'], expect.anything());
    expect(result.details).toEqual({ remote: 'origin', branch: undefined });
  });

  it('should pull with specific remote and branch', async () => {
    const ctx = mockCtx({ stdout: '', code: 0 });
    const result = await pull.execute({ remote: 'upstream', branch: 'develop' }, ctx);
    expect(result.isError).toBe(false);
    expect(ctx.exec).toHaveBeenCalledWith('git', ['pull', 'upstream', 'develop'], expect.anything());
    expect(result.details).toEqual({ remote: 'upstream', branch: 'develop' });
  });

  it('should return error when git pull fails', async () => {
    const ctx = mockCtx({ stderr: 'fatal: refusing to merge unrelated histories', code: 1 });
    const result = await pull.execute({ remote: 'origin', branch: 'main' }, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('❌ git pull failed');
    expect(result.details.exitCode).toBe(1);
  });

  it('should handle exec exception gracefully', async () => {
    const ctx = mockCtx();
    (ctx.exec as any).mockRejectedValue(new Error('git not available'));
    const result = await pull.execute({ remote: 'origin' }, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('❌ Error: git not available');
  });
});
