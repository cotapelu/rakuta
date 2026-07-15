import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../../extensions/autonomous-engine/services/git-service.js', () => ({
  runGitCommand: vi.fn(),
}));

vi.mock('../../../extensions/autonomous-engine/helpers/metrics-helpers.js', () => ({
  computeCoverageDelta: vi.fn(),
  computeFailureRate: vi.fn(),
  computeTestDelta: vi.fn(),
  hasRegression: vi.fn(),
  buildMetricsLog: vi.fn().mockReturnValue('log content'),
  mapPriority: vi.fn().mockImplementation((p) => {
    switch (p) {
      case 1: return 'CRITICAL';
      case 2: return 'HIGH';
      case 3: return 'MEDIUM';
      default: return 'LOW';
    }
  }),
}));

vi.mock('../../../extensions/autonomous-engine/services/fs-service.js', () => ({
  saveState: vi.fn(),
  loadState: vi.fn(),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  appendFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('node:path', () => ({
  join: vi.fn((...args) => args.join('/')),
}));

import { autoCommit } from '../../../extensions/autonomous-engine/extension';
import { runGitCommand } from '../../../extensions/autonomous-engine/services/git-service.js';
import { saveState, loadState } from '../../../extensions/autonomous-engine/services/fs-service.js';
import { existsSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { EngineState, TaskQueueItem } from '../../../extensions/autonomous-engine/types';

const CWD = '/test/cwd';

function createState(overrides: Partial<EngineState> = {}): EngineState {
  return {
    config: { discoveryIntervalMs: 1000, maxQueueSize: 30, failFast: false, autoCommit: true, autoPush: false },
    taskQueue: [],
    isRunning: true,
    cycleCount: 1,
    tasksCompleted: 0,
    tasksFailed: 0,
    currentTask: null,
    lastDiscoveryTime: 0,
    consecutiveFailures: 0,
    lastGitCommit: null,
    ...overrides,
  };
}

function createTask(overrides: Partial<TaskQueueItem> = {}): TaskQueueItem {
  return {
    id: 'task-1',
    priority: 1,
    action: 'Test action',
    module: 'test',
    type: 'TEST',
    context: { file: 'test.ts', line: 1, message: 'test' },
    discoveredAt: Date.now(),
    ...overrides,
  };
}

describe('autoCommit (edge cases)', () => {
  let state: EngineState;
  let task: TaskQueueItem;
  let runGitCommandSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (existsSync as any).mockReturnValue(true);
    (readFileSync as any).mockReturnValue(JSON.stringify({ lastUpdate: new Date().toISOString(), tasksCompleted: [], recentFailures: [] }));
    runGitCommandSpy = runGitCommand as any;
    state = createState({ cycleCount: 5 });
    task = createTask({ id: 't123', action: 'Fix bug', module: 'core' });
  });

  it('should warn and return if no files to commit', async () => {
    runGitCommandSpy.mockResolvedValueOnce({ stdout: '' }); // status returns empty
    await autoCommit(CWD, task, state);
    expect(runGitCommandSpy).toHaveBeenCalledWith(CWD, ['status', '--porcelain']);
    // Should not proceed to add/commit
    expect(runGitCommandSpy).toHaveBeenCalledTimes(1);
    expect(state.lastGitCommit).toBeNull();
  });

  it('should handle runGitCommand error on status', async () => {
    runGitCommandSpy.mockRejectedValueOnce(new Error('git status failed'));
    await autoCommit(CWD, task, state);
    expect(runGitCommandSpy).toHaveBeenCalledWith(CWD, ['status', '--porcelain']);
    // Should catch and log error, not throw
    expect(state.lastGitCommit).toBeNull();
  });

  it('should handle runGitCommand error on add', async () => {
    runGitCommandSpy.mockResolvedValueOnce({ stdout: 'M file1.ts\n' }); // status returns file
    runGitCommandSpy.mockRejectedValueOnce(new Error('git add failed'));
    await autoCommit(CWD, task, state);
    expect(runGitCommandSpy).toHaveBeenCalledWith(CWD, ['add', 'file1.ts']);
    expect(state.lastGitCommit).toBeNull();
  });

  it('should handle runGitCommand error on commit', async () => {
    runGitCommandSpy.mockResolvedValueOnce({ stdout: 'M file1.ts\n' });
    runGitCommandSpy.mockResolvedValueOnce(undefined); // add success
    runGitCommandSpy.mockRejectedValueOnce(new Error('git commit failed'));
    await autoCommit(CWD, task, state);
    expect(runGitCommandSpy).toHaveBeenCalledWith(CWD, ['commit', '-m', expect.stringContaining('chore: evolution round')]);
    expect(state.lastGitCommit).toBeNull();
  });

  it('should commit successfully without push when autoPush is false', async () => {
    runGitCommandSpy.mockResolvedValueOnce({ stdout: 'M file1.ts\nA file2.ts' });
    runGitCommandSpy.mockResolvedValueOnce(undefined); // add
    runGitCommandSpy.mockResolvedValueOnce(undefined); // commit
    await autoCommit(CWD, task, state);
    expect(runGitCommandSpy).toHaveBeenCalledWith(CWD, ['commit', '-m', expect.stringContaining('Cycle: 5')]);
    expect(state.lastGitCommit).toBe('Cycle 5: Fix bug');
    expect(runGitCommandSpy).not.toHaveBeenCalledWith(CWD, ['push']);
  });

  it('should commit and push when autoPush is true', async () => {
    state.config.autoPush = true;
    runGitCommandSpy.mockResolvedValueOnce({ stdout: 'M file1.ts' });
    runGitCommandSpy.mockResolvedValueOnce(undefined);
    runGitCommandSpy.mockResolvedValueOnce(undefined);
    runGitCommandSpy.mockResolvedValueOnce(undefined); // push
    await autoCommit(CWD, task, state);
    expect(runGitCommandSpy).toHaveBeenCalledWith(CWD, ['push']);
    expect(state.lastGitCommit).toBe('Cycle 5: Fix bug');
  });

  it('should handle push failure after successful commit', async () => {
    state.config.autoPush = true;
    runGitCommandSpy.mockResolvedValueOnce({ stdout: 'M file1.ts' });
    runGitCommandSpy.mockResolvedValueOnce(undefined);
    runGitCommandSpy.mockResolvedValueOnce(undefined);
    runGitCommandSpy.mockRejectedValueOnce(new Error('push failed'));
    await autoCommit(CWD, task, state);
    // Should still have lastGitCommit set
    expect(state.lastGitCommit).toBe('Cycle 5: Fix bug');
    // Error should be logged but not thrown
  });

  it('should filter and stage only listed files', async () => {
    runGitCommandSpy.mockResolvedValueOnce({ stdout: 'M file1.ts\n?? untracked.txt\nA file2.ts\n' });
    runGitCommandSpy.mockResolvedValueOnce(undefined);
    runGitCommandSpy.mockResolvedValueOnce(undefined);
    await autoCommit(CWD, task, state);
    // Should call add with file1.ts and file2.ts (untracked.txt should be included? Actually code uses line.slice(3).trim() which includes untracked)
    // Porcelain format: "XY path" where X status, Y status, then space, then path. So line.slice(3).trim() gets path.
    // For "?? untracked.txt", slice(3) gives "untracked.txt". So all non-empty lines included.
    expect(runGitCommandSpy).toHaveBeenCalledWith(CWD, ['add', 'file1.ts', 'untracked.txt', 'file2.ts']);
  });

  it('should not call add if status call returns nullish', async () => {
    runGitCommandSpy.mockResolvedValueOnce({ stdout: null });
    await autoCommit(CWD, task, state);
    expect(runGitCommandSpy).not.toHaveBeenCalledWith(CWD, ['add']);
  });

  it('should build commit message with correct metadata', async () => {
    runGitCommandSpy.mockResolvedValueOnce({ stdout: 'M test.ts' });
    runGitCommandSpy.mockResolvedValueOnce(undefined);
    const commitCall = runGitCommandSpy.mockImplementation((cwd, args) => {
      if (args[0] === 'commit') return Promise.resolve(undefined);
      return Promise.resolve({ stdout: '' });
    });
    await autoCommit(CWD, task, state);
    const commitArgs = commitCall.mock.calls.find((call: any) => call[1][0] === 'commit');
    const message = commitArgs[1][2]; // -m message
    expect(message).toContain('chore: evolution round - Fix bug (core)');
    expect(message).toContain('Cycle: 5');
    expect(message).toContain('Task ID: t123');
    expect(message).toContain('Type: TEST');
    expect(message).toContain('Priority: CRITICAL');
  });
});
