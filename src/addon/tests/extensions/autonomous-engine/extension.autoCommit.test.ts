import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  appendFileSync: vi.fn(),
  mkdirSync: vi.fn()
}));

vi.mock('../utils/logger.js', () => ({
  createLogger: () => ({
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}));

import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { autoCommit, updateProjectState, updateEvolutionDocs, updateAgentProfile } from '../../../extensions/autonomous-engine/extension.js';
import type { TaskQueueItem, EngineState, AutonomousEngineConfig } from '../../../extensions/autonomous-engine/types.js';

const makeTask = (overrides: Partial<TaskQueueItem> = {}): TaskQueueItem => ({
  id: 't1',
  action: 'test',
  module: 'core',
  cycle: 1,
  timestamp: new Date().toISOString(),
  success: true,
  coverageDelta: null,
  priority: 1,
  ...overrides
});

const makeState = (overrides: Partial<EngineState> = {}): EngineState => ({
  config: { cycleInterval: 60, maxConcurrentTasks: 1, autoCommit: true, autoPush: false, updateDocs: true, qualityGate: { requireAllGreen: true } } as AutonomousEngineConfig,
  isRunning: true,
  taskQueue: [],
  currentTask: null,
  lastDiscoveryTime: 0,
  cycleCount: 1,
  tasksCompleted: 0,
  tasksFailed: 0,
  consecutiveFailures: 0,
  lastGitCommit: null,
  ...overrides
});

describe('AutonomousEngine File Operations', () => {
  let cwd: string;

  beforeEach(() => {
    vi.clearAllMocks();
    cwd = '/workspace';
    existsSync.mockReturnValue(false);
  });

  describe('autoCommit', () => {
    it('commits when there are staged changes', async () => {
      // Mock runGitCommand
      const mockRunGit = vi.mocked(require('../../../extensions/autonomous-engine/extension.js').runGitCommand as any);
      mockRunGit.mockResolvedValueOnce({ stdout: 'M  file1.js', stderr: '' }); // status
      mockRunGit.mockResolvedValueOnce({ stdout: '', stderr: '' }); // add
      mockRunGit.mockResolvedValueOnce({ stdout: '', stderr: '' }); // commit

      const state = makeState();
      const task = makeTask();
      await autoCommit(cwd, task, state);

      expect(state.lastGitCommit).toContain('Cycle 1');
      expect(mockRunGit).toHaveBeenNthCalledWith(1, cwd, ['status', '--porcelain']);
    });

    it('does not commit when no files changed', async () => {
      const mockRunGit = vi.mocked(require('../../../extensions/autonomous-engine/extension.js').runGitCommand as any);
      mockRunGit.mockResolvedValueOnce({ stdout: '', stderr: '' });

      const state = makeState();
      await autoCommit(cwd, makeTask(), state);

      expect(state.lastGitCommit).toBeNull();
      expect(mockRunGit).not.toHaveBeenNthCalledWith(2, cwd, ['add']);
    });
  });

  describe('updateProjectState', () => {
    it('creates new project state file if not exists', () => {
      existsSync.mockReturnValue(false);
      const state = makeState();
      updateProjectState(cwd, state, makeTask(), true, { statements: 80, branches: 75 });

      expect(writeFileSync).toHaveBeenCalled();
    });

    it('appends to existing project state', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue(JSON.stringify({ lastUpdate: '', tasksCompleted: [] }));
      const state = makeState();
      updateProjectState(cwd, state, makeTask(), true, { statements: 80, branches: 75 });

      expect(appendFileSync).toHaveBeenCalled();
    });
  });

  describe('updateEvolutionDocs', () => {
    it('appends new cycle entry', () => {
      existsSync.mockReturnValue(false);
      const state = makeState();
      updateEvolutionDocs(cwd, state, makeTask(), true);

      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('EVOLUTION.md'),
        expect.stringContaining('Cycle 1')
      );
    });
  });

  describe('updateAgentProfile', () => {
    it('creates profile on first run', () => {
      existsSync.mockReturnValue(false);
      const state = makeState();
      updateAgentProfile(cwd, makeTask(), true);

      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('AGENT_PROFILE.md'),
        expect.stringContaining('weaknesses')
      );
    });

    it('records failure on error', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue(JSON.stringify({ weaknesses: [] }));
      const state = makeState();
      updateAgentProfile(cwd, makeTask(), false, 'network timeout');

      expect(appendFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('network timeout')
      );
    });
  });
});
