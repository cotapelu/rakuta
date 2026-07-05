import { describe, it, expect, vi, beforeEach } from 'vitest';
import add from '../add.ts';

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

describe('git.add capability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should stage all changes when all=true', async () => {
    const ctx = mockCtx({ stdout: '', code: 0 });
    const result = await add.execute({ all: true }, ctx);
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Staged all changes');
    expect(ctx.exec).toHaveBeenCalledWith('git', ['add', '-A'], expect.anything());
    expect(result.details).toEqual({ all: true, files: undefined });
  });

  it('should stage specific files when files array provided', async () => {
    const ctx = mockCtx({ stdout: '', code: 0 });
    const result = await add.execute({ files: ['a.txt', 'b.js'] }, ctx);
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Staged a.txt, b.js');
    expect(ctx.exec).toHaveBeenCalledWith('git', ['add', 'a.txt', 'b.js'], expect.anything());
    expect(result.details).toEqual({ files: ['a.txt', 'b.js'], all: undefined });
  });

  it('should prefer all=true when both all and files provided', async () => {
    const ctx = mockCtx({ stdout: '', code: 0 });
    const result = await add.execute({ all: true, files: ['a.txt'] }, ctx);
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Staged all changes');
    expect(ctx.exec).toHaveBeenCalledWith('git', ['add', '-A'], expect.anything());
    expect(result.details).toEqual({ all: true, files: ['a.txt'] });
  });

  it('should return error when neither all nor files provided', async () => {
    const ctx = mockCtx();
    const result = await add.execute({}, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Must specify either 'files' array or 'all: true'");
    expect(ctx.exec).not.toHaveBeenCalled();
  });

  it('should return error when git command fails', async () => {
    const ctx = mockCtx({ stderr: 'fatal: pathspec did not match any files', code: 1 });
    const result = await add.execute({ files: ['nonexistent.txt'] }, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('❌ git add failed');
    expect(result.details.exitCode).toBe(1);
    expect(result.details.error).toContain('fatal: pathspec did not match any files');
  });

  it('should handle exec exception gracefully', async () => {
    const ctx = mockCtx();
    (ctx.exec as any).mockRejectedValue(new Error('git not found'));
    const result = await add.execute({ all: true }, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('❌ Error: git not found');
    expect(result.details.error).toBe('git not found');
  });
});
