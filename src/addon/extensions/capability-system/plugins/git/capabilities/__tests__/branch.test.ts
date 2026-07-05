import { describe, it, expect, vi, beforeEach } from 'vitest';
import branch from '../branch.ts';

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

describe('git.branch capability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list all branches when action=list', async () => {
    const ctx = mockCtx({ stdout: '* main\n  feature\n', code: 0 });
    const result = await branch.execute({ action: 'list' }, ctx);
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('* main');
    expect(ctx.exec).toHaveBeenCalledWith('git', ['branch', '-a'], expect.anything());
    expect(result.details).toEqual({ action: 'list', branch: undefined });
  });

  it('should create a new branch when action=create with name', async () => {
    const ctx = mockCtx({ stdout: 'Switched to a new branch \'feature\'\n', code: 0 });
    const result = await branch.execute({ action: 'create', name: 'feature' }, ctx);
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Switched to');
    expect(ctx.exec).toHaveBeenCalledWith('git', ['branch', 'feature'], expect.anything());
    expect(result.details).toEqual({ action: 'create', branch: 'feature' });
  });

  it('should return error when creating branch without name', async () => {
    const ctx = mockCtx();
    const result = await branch.execute({ action: 'create' }, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("name required for create");
    expect(ctx.exec).not.toHaveBeenCalled();
  });

  it('should delete a branch when action=delete with name', async () => {
    const ctx = mockCtx({ stdout: 'Deleted branch feature (was 123abc).\n', code: 0 });
    const result = await branch.execute({ action: 'delete', name: 'feature' }, ctx);
    expect(result.isError).toBe(false);
    expect(ctx.exec).toHaveBeenCalledWith('git', ['branch', '-d', 'feature'], expect.anything());
    expect(result.details).toEqual({ action: 'delete', branch: 'feature' });
  });

  it('should return error when deleting branch without name', async () => {
    const ctx = mockCtx();
    const result = await branch.execute({ action: 'delete' }, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("name required for delete");
    expect(ctx.exec).not.toHaveBeenCalled();
  });

  it('should return error when git command fails', async () => {
    const ctx = mockCtx({ stderr: 'error: branch \'main\' already exists', code: 1 });
    const result = await branch.execute({ action: 'create', name: 'main' }, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('❌ git branch failed');
    expect(result.details.exitCode).toBe(1);
    expect(result.details.error).toContain('error: branch');
  });

  it('should handle exec exception gracefully', async () => {
    const ctx = mockCtx();
    (ctx.exec as any).mockRejectedValue(new Error('git not found'));
    const result = await branch.execute({ action: 'list' }, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('❌ Error: git not found');
    expect(result.details.error).toBe('git not found');
  });
});
