import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs and child_process
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  appendFileSync: vi.fn(),
  mkdirSync: vi.fn()
}));
vi.mock('node:child_process', () => ({
  execFile: vi.fn()
}));

vi.mock('../utils/logger.js', () => ({
  createLogger: () => ({ log: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { autoCommit, updateProjectState, updateEvolutionDocs, updateAgentProfile, runDiscoveryCycle, loadState, saveState } from '../../../extensions/autonomous-engine/extension.js';
import type { TaskQueueItem, EngineState, AutonomousEngineConfig } from '../../../extensions/autonomous-engine/types.js';

const mockExecFile = execFile as any;

const makeTask = (overrides: Partial<TaskQueueItem> = {}): TaskQueueItem => ({
  id: 't1',
  action: 'test',
  module: 'core',
  cycle: 1,
  timestamp: new Date().toISOString(),
  success: true,
  coverageDelta: null,
  priority: 1,
  type: 'IMPROVEMENT',
  expectedImpact: '',
  estimatedMinutes: 30,
  attempts: 0,
  risk: 'Low',
  violation: undefined,
  improvementType: undefined,
  createdAt: new Date(),
  ...overrides
});

const makeConfig = (overrides: Partial<AutonomousEngineConfig> = {}): AutonomousEngineConfig => ({
  discoveryIntervalMs: 60_000,
  maxConcurrentTasks: 1,
  autoCommit: true,
  autoPush: false,
  updateDocs: true,
  qualityGate: { requireAllGreen: true },
  ...overrides
});

const makeState = (overrides: Partial<EngineState> = {}): EngineState => ({
  config: makeConfig(),
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

describe('AutonomousEngine Edge Cases (Cycle 66)', () => {
  let cwd: string;

  beforeEach(() => {
    vi.clearAllMocks();
    cwd = '/workspace';
    existsSync.mockReturnValue(false);
    mockExecFile.mockClear();
  });

  describe('loadState', () => {
    it('falls back when file read returns invalid JSON', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('not json');
      const state = loadState(cwd);
      expect(state.cycleCount).toBe(0);
    });
  });

  describe('saveState', () => {
    it('writes JSON with proper formatting', () => {
      const state = makeState({ cycleCount: 2 });
      saveState(cwd, state);
      expect(writeFileSync).toHaveBeenCalledWith(
        `${cwd}/.pi/autonomous-state.json`,
        expect.stringContaining('"cycleCount":2')
      );
    });
  });

  describe('autoCommit', () => {
    it('does not commit when status stdout empty', async () => {
      mockExecFile.mockResolvedValueOnce({ stdout: '', stderr: '' });
      const state = makeState();
      await autoCommit(cwd, makeTask(), state);
      expect(state.lastGitCommit).toBeNull();
    });

    it('handles git status malformed output gracefully', async () => {
      mockExecFile.mockResolvedValueOnce({ stdout: '??? malformed', stderr: '' });
      const state = makeState();
      await autoCommit(cwd, makeTask(), state);
      // Should try to add all files (filenames extracted as '???')
      expect(state.lastGitCommit).toBeNull(); // commit may still fail or succeed; we just check it runs
    });

    it('handles any git command error and continues without crashing', async () => {
      mockExecFile
        .mockResolvedValueOnce({ stdout: 'M  file.js', stderr: '' }) // status
        .mockRejectedValueOnce(new Error('add fail'))
        .mockResolvedValueOnce({ stdout: '', stderr: '' }); // commit (not reached if add fails)
      const state = makeState();
      await autoCommit(cwd, makeTask(), state);
      expect(state.lastGitCommit).toBeNull();
    });
  });

  describe('updateProjectState', () => {
    it('overwrites malformed existing file', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('{ bad }');
      const state = makeState();
      updateProjectState(cwd, state, makeTask(), true, { statements: 80, branches: 75 });
      expect(writeFileSync).toHaveBeenCalled(); // overwrite
    });

    it('includes coverageDelta when provided', () => {
      existsSync.mockReturnValue(false);
      const state = makeState();
      updateProjectState(cwd, state, makeTask(), true, { statements: 80, branches: 75 });
      const content = writeFileSync.mock.calls[0][1] as string;
      const parsed = JSON.parse(content);
      expect(parsed.tasksCompleted[0].coverageDelta).toEqual({ statements: 80, branches: 75 });
    });
  });

  describe('updateEvolutionDocs', () => {
    it('creates new file when missing', () => {
      existsSync.mockReturnValue(false);
      const state = makeState();
      updateEvolutionDocs(cwd, state, makeTask(), true);
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('docs/EVOLUTION.md'),
        expect.stringContaining('trajectory')
      );
    });

    it('overwrites malformed existing file', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('{ bad }');
      const state = makeState();
      updateEvolutionDocs(cwd, state, makeTask(), true);
      expect(writeFileSync).toHaveBeenCalled();
    });

    it('adds trajectory only for PROACTIVE_IMPROVEMENT', () => {
      existsSync.mockReturnValue(false);
      const state = makeState();
      const task = makeTask({ type: 'PROACTIVE_IMPROVEMENT' as any, expectedImpact: 'perf' });
      updateEvolutionDocs(cwd, state, task, true);
      const content = writeFileSync.mock.calls[0][1] as string;
      const parsed = JSON.parse(content);
      expect(parsed.trajectory).toHaveLength(1);
      expect(parsed.trajectory[0].impact).toBe('perf');
    });
  });

  describe('updateAgentProfile', () => {
    it('handles malformed existing file by overwriting', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('{ bad }');
      const state = makeState();
      updateAgentProfile(cwd, makeTask(), true);
      expect(writeFileSync).toHaveBeenCalled();
    });

    it('truncates weaknesses to 50 entries', () => {
      existsSync.mockReturnValue(true);
      const oldWeaknesses = Array.from({ length: 50 }, () => ({
        taskId: 'old', module: 'old', action: 'old', reason: 'old', timestamp: new Date().toISOString()
      }));
      readFileSync.mockReturnValue(JSON.stringify({ weaknesses: oldWeaknesses }));
      const state = makeState();
      updateAgentProfile(cwd, makeTask(), false, 'new err');
      const content = writeFileSync.mock.calls[0][1] as string;
      const parsed = JSON.parse(content);
      expect(parsed.weaknesses.length).toBeLessThanOrEqual(50);
    });
  });

  describe('runDiscoveryCycle', () => {
    it('handles TaskDiscovery rejection', async () => {
      // Mock TaskDiscovery to throw
      vi.spyOn(await import('../../../extensions/autonomous-engine/extension.js'), 'TaskDiscovery')
        .mockImplementation(() => ({ discoverTasks: vi.fn().mockRejectedValue(new Error('disc fail')) }));
      const state = makeState();
      await runDiscoveryCycle({} as any, cwd, state);
      expect(state.tasksFailed).toBe(1);
    });

    it('handles QualityGate rejection', async () => {
      vi.spyOn(await import('../../../extensions/autonomous-engine/extension.js'), 'TaskDiscovery')
        .mockImplementation(() => ({ discoverTasks: vi.fn().mockResolvedValue([makeTask()]) }));
      vi.spyOn(await import('../../../extensions/autonomous-engine/extension.js'), 'QualityGate')
        .mockImplementation(() => ({ runGate: vi.fn().mockRejectedValue(new Error('gate fail')) }));
      const state = makeState();
      await runDiscoveryCycle({} as any, cwd, state);
      expect(state.tasksFailed).toBe(1);
    });
  });
});
