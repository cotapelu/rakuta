import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  gitStatusAction,
  gitLogAction,
  gitDiffAction,
  gitAddAction,
  gitCommitAction,
  gitPushAction,
  gitPullAction,
} from '../../extensions/tools/actions/git-actions.js';
import type { ExtensionContext } from './types.js';

function mockGitCtx(result: { stdout: string; stderr: string; code: number; killed: boolean }) {
  return {
    exec: vi.fn(async (cmd: string, args: string[], opts: any) => {
      expect(cmd).toBe('git');
      return { ...result, signal: undefined };
    }),
  } as unknown as ExtensionContext;
}

describe('Git Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('gitStatusAction', () => {
    it('should show status default', async () => {
      const ctx = mockGitCtx({ stdout: 'On branch main', stderr: '', code: 0, killed: false });
      const result = await gitStatusAction.execute({}, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['status'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
    });

    it('should show short format', async () => {
      const ctx = mockGitCtx({ stdout: 'M file.ts', stderr: '', code: 0, killed: false });
      const result = await gitStatusAction.execute({ short: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['status', '-s'], { cwd: '/cwd', signal: undefined });
      expect(result.details.short).toBe(true);
    });

    it('should show branch info', async () => {
      const ctx = mockGitCtx({ stdout: 'On branch main', stderr: '', code: 0, killed: false });
      const result = await gitStatusAction.execute({ branch: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['status', '-b'], { cwd: '/cwd', signal: undefined });
      expect(result.details.branch).toBe(true);
    });

    it('should combine short and branch', async () => {
      const ctx = mockGitCtx({ stdout: '## main...origin/main', stderr: '', code: 0, killed: false });
      await gitStatusAction.execute({ short: true, branch: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['status', '-s', '-b'], { cwd: '/cwd', signal: undefined });
    });

    it('should handle error', async () => {
      const ctx = mockGitCtx({ stdout: '', stderr: 'fatal: not a git repository', code: 128, killed: false });
      const result = await gitStatusAction.execute({}, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(128);
    });
  });

  describe('gitLogAction', () => {
    it('should show log default', async () => {
      const ctx = mockGitCtx({ stdout: 'commit abc123', stderr: '', code: 0, killed: false });
      const result = await gitLogAction.execute({}, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['log'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
    });

    it('should use oneline format', async () => {
      const ctx = mockGitCtx({ stdout: 'abc123 Fix bug', stderr: '', code: 0, killed: false });
      await gitLogAction.execute({ oneline: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['log', '--oneline'], { cwd: '/cwd', signal: undefined });
    });

    it('should use graph format', async () => {
      const ctx = mockGitCtx({ stdout: 'graph', stderr: '', code: 0, killed: false });
      await gitLogAction.execute({ graph: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['log', '--graph'], { cwd: '/cwd', signal: undefined });
    });

    it('should limit by maxCount', async () => {
      const ctx = mockGitCtx({ stdout: 'limited', stderr: '', code: 0, killed: false });
      await gitLogAction.execute({ maxCount: 5 }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['log', '-n5'], { cwd: '/cwd', signal: undefined });
    });

    it('should combine all options', async () => {
      const ctx = mockGitCtx({ stdout: 'output', stderr: '', code: 0, killed: false });
      await gitLogAction.execute({ oneline: true, graph: true, maxCount: 10 }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['log', '--oneline', '--graph', '-n10'], { cwd: '/cwd', signal: undefined });
    });
  });

  describe('gitDiffAction', () => {
    it('should show diff default', async () => {
      const ctx = mockGitCtx({ stdout: 'diff --git a/file.ts b/file.ts', stderr: '', code: 0, killed: false });
      const result = await gitDiffAction.execute({}, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['diff'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(false);
    });

    it('should show staged changes', async () => {
      const ctx = mockGitCtx({ stdout: 'staged diff', stderr: '', code: 0, killed: false });
      await gitDiffAction.execute({ staged: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['diff', '--staged'], { cwd: '/cwd', signal: undefined });
    });

    it('should show name only', async () => {
      const ctx = mockGitCtx({ stdout: 'file.ts', stderr: '', code: 0, killed: false });
      await gitDiffAction.execute({ nameOnly: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['diff', '--name-only'], { cwd: '/cwd', signal: undefined });
    });

    it('should combine staged and nameOnly', async () => {
      const ctx = mockGitCtx({ stdout: 'names', stderr: '', code: 0, killed: false });
      await gitDiffAction.execute({ staged: true, nameOnly: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['diff', '--staged', '--name-only'], { cwd: '/cwd', signal: undefined });
    });
  });

  describe('gitAddAction', () => {
    it('should add specific files', async () => {
      const ctx = mockGitCtx({ stdout: '', stderr: '', code: 0, killed: false });
      const result = await gitAddAction.execute({ files: ['a.ts', 'b.ts'] }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['add', 'a.ts', 'b.ts'], { cwd: '/cwd', signal: undefined });
      expect(result.details.files).toEqual(['a.ts', 'b.ts']);
    });

    it('should add all with -A', async () => {
      const ctx = mockGitCtx({ stdout: '', stderr: '', code: 0, killed: false });
      const result = await gitAddAction.execute({ all: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['add', '-A'], { cwd: '/cwd', signal: undefined });
      expect(result.details.all).toBe(true);
    });

    it('should handle empty args (no-op?)', async () => {
      const ctx = mockGitCtx({ stdout: '', stderr: 'nothing added', code: 1, killed: false });
      const result = await gitAddAction.execute({}, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['add'], { cwd: '/cwd', signal: undefined });
      expect(result.isError).toBe(true);
    });
  });

  describe('gitCommitAction', () => {
    it('should commit with message', async () => {
      const ctx = mockGitCtx({ stdout: '[main 1a2b3c]', stderr: '', code: 0, killed: false });
      const result = await gitCommitAction.execute({ message: 'Fix bug' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['commit', '-m', 'Fix bug'], { cwd: '/cwd', signal: undefined });
      expect(result.details.hasMessage).toBe(true);
    });

    it('should commit all (-a)', async () => {
      const ctx = mockGitCtx({ stdout: 'committed', stderr: '', code: 0, killed: false });
      await gitCommitAction.execute({ all: true, message: 'Update' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['commit', '-a', '-m', 'Update'], { cwd: '/cwd', signal: undefined });
    });

    it('should amend previous commit', async () => {
      const ctx = mockGitCtx({ stdout: 'amend', stderr: '', code: 0, killed: false });
      await gitCommitAction.execute({ amend: true, message: 'Amend' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['commit', '--amend', '-m', 'Amend'], { cwd: '/cwd', signal: undefined });
    });

    it('should combine all flags', async () => {
      const ctx = mockGitCtx({ stdout: 'combined', stderr: '', code: 0, killed: false });
      await gitCommitAction.execute({ all: true, amend: true, message: 'All in one' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['commit', '-a', '--amend', '-m', 'All in one'], { cwd: '/cwd', signal: undefined });
    });

    it('should handle commit error', async () => {
      const ctx = mockGitCtx({ stdout: '', stderr: 'nothing to commit', code: 1, killed: false });
      const result = await gitCommitAction.execute({ message: 'Oops' }, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
    });
  });

  describe('gitPushAction', () => {
    it('should push to default origin', async () => {
      const ctx = mockGitCtx({ stdout: '', stderr: '', code: 0, killed: false });
      const result = await gitPushAction.execute({}, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['push', 'origin'], { cwd: '/cwd', signal: undefined });
      expect(result.details.remote).toBe('origin');
    });

    it('should push with branch', async () => {
      const ctx = mockGitCtx({ stdout: '', stderr: '', code: 0, killed: false });
      await gitPushAction.execute({ branch: 'feature' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['push', 'origin', 'feature'], { cwd: '/cwd', signal: undefined });
    });

    it('should force push', async () => {
      const ctx = mockGitCtx({ stdout: '', stderr: '', code: 0, killed: false });
      await gitPushAction.execute({ force: true, branch: 'main' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['push', '-f', 'origin', 'main'], { cwd: '/cwd', signal: undefined });
    });
  });

  describe('gitPullAction', () => {
    it('should pull from default origin', async () => {
      const ctx = mockGitCtx({ stdout: 'Updating', stderr: '', code: 0, killed: false });
      const result = await gitPullAction.execute({}, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['pull', 'origin'], { cwd: '/cwd', signal: undefined });
      expect(result.details.remote).toBe('origin');
    });

    it('should pull with branch', async () => {
      const ctx = mockGitCtx({ stdout: '', stderr: '', code: 0, killed: false });
      await gitPullAction.execute({ branch: 'develop' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['pull', 'origin', 'develop'], { cwd: '/cwd', signal: undefined });
    });

    it('should pull with rebase', async () => {
      const ctx = mockGitCtx({ stdout: '', stderr: '', code: 0, killed: false });
      await gitPullAction.execute({ rebase: true }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['pull', '--rebase', 'origin'], { cwd: '/cwd', signal: undefined });
    });

    it('should combine rebase and branch', async () => {
      const ctx = mockGitCtx({ stdout: '', stderr: '', code: 0, killed: false });
      await gitPullAction.execute({ rebase: true, branch: 'main' }, '/cwd', undefined, ctx);

      expect(ctx.exec).toHaveBeenCalledWith('git', ['pull', '--rebase', 'origin', 'main'], { cwd: '/cwd', signal: undefined });
    });

    it('should handle pull error', async () => {
      const ctx = mockGitCtx({ stdout: '', stderr: 'fatal: Could not fetch', code: 128, killed: false });
      const result = await gitPullAction.execute({ branch: 'missing' }, '/cwd', undefined, ctx);

      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(128);
    });
  });

  describe('getParameters', () => {
    it('gitStatusAction schema', () => {
      const params = gitStatusAction.getParameters();
      expect(params.properties).toMatchObject({
        short: { type: 'boolean', description: 'Short format' },
        branch: { type: 'boolean', description: 'Show branch info' },
      });
      expect(params.required).toEqual([]);
    });

    it('gitLogAction schema', () => {
      const params = gitLogAction.getParameters();
      expect(params.properties).toMatchObject({
        oneline: { type: 'boolean', description: 'One line per commit' },
        graph: { type: 'boolean', description: 'Show ASCII graph' },
        maxCount: { type: 'number', description: 'Limit number of commits' },
      });
      expect(params.required).toEqual([]);
    });

    it('gitDiffAction schema', () => {
      const params = gitDiffAction.getParameters();
      expect(params.properties).toMatchObject({
        staged: { type: 'boolean', description: 'Show staged changes' },
        nameOnly: { type: 'boolean', description: 'Show only file names' },
      });
      expect(params.required).toEqual([]);
    });

    it('gitAddAction schema', () => {
      const params = gitAddAction.getParameters();
      expect(params.properties).toMatchObject({
        files: { type: 'array', items: { type: 'string' }, description: 'Files to add' },
        all: { type: 'boolean', description: 'Add all changes (including deletions)' },
      });
      expect(params.required).toEqual([]);
    });

    it('gitCommitAction schema', () => {
      const params = gitCommitAction.getParameters();
      expect(params.properties).toMatchObject({
        message: { type: 'string', description: 'Commit message' },
        all: { type: 'boolean', description: 'Commit all changed files (-a)' },
        amend: { type: 'boolean', description: 'Amend previous commit' },
      });
      expect(params.required).toEqual([]);
    });

    it('gitPushAction schema', () => {
      const params = gitPushAction.getParameters();
      expect(params.properties).toMatchObject({
        remote: { type: 'string', description: 'Remote name (default: origin)' },
        branch: { type: 'string', description: 'Branch to push (e.g., \'main\', \'feature:main\')' },
        force: { type: 'boolean', description: 'Force push (-f)' },
      });
      expect(params.required).toEqual([]);
    });

    it('gitPullAction schema', () => {
      const params = gitPullAction.getParameters();
      expect(params.properties).toMatchObject({
        remote: { type: 'string', description: 'Remote name', default: 'origin' },
        branch: { type: 'string', description: 'Branch to pull' },
        rebase: { type: 'boolean', description: 'Rebase instead of merge' },
      });
      expect(params.required).toEqual([]);
    });
  });
});
