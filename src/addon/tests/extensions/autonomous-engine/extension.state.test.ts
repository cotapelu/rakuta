import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs và child_process trước khi import extension
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

// Import functions
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { loadState, saveState, runGitCommand, assessRisk, mapPriority, getStatePath } from '../../../extensions/autonomous-engine/extension.js';
import type { EngineState, TaskQueueItem } from '../../../extensions/autonomous-engine/types.js';

const defaultConfig = {
  cycleInterval: 60,
  maxConcurrentTasks: 1,
  autoCommit: true,
  updateDocs: true,
  qualityGate: { requireAllGreen: true }
};

function makeTask(overrides: Partial<TaskQueueItem> = {}): TaskQueueItem {
  return {
    id: 'task-1',
    action: 'test',
    module: 'test',
    cycle: 1,
    timestamp: new Date().toISOString(),
    success: false,
    coverageDelta: null,
    priority: 1,
    ...overrides
  };
}

describe('AutonomousEngine Extension utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    existsSync.mockReturnValue(false);
  });

  describe('getStatePath', () => {
    it('returns .pi/autonomous-state.json', () => {
      expect(getStatePath('/c')).toBe('/c/.pi/autonomous-state.json');
    });
  });

  describe('loadState', () => {
    it('returns default if state file missing', () => {
      const state = loadState('/proj');
      expect(state.isRunning).toBe(false);
      expect(state.cycleCount).toBe(0);
    });

    it('parses valid state file', () => {
      existsSync.mockReturnValue(true);
      const data = { config: defaultConfig, isRunning: true, cycleCount: 5, taskQueue: [] };
      readFileSync.mockReturnValue(JSON.stringify(data));
      const state = loadState('/proj');
      expect(state.cycleCount).toBe(5);
      expect(state.isRunning).toBe(true);
    });

    it('falls back to default on parse error', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('{ bad }');
      const state = loadState('/proj');
      expect(state.cycleCount).toBe(0);
    });
  });

  describe('saveState', () => {
    it('writes state to file', () => {
      const state: EngineState = {
        config: defaultConfig,
        taskQueue: [],
        isRunning: true,
        cycleCount: 3,
        tasksCompleted: 0,
        tasksFailed: 0,
        currentTask: null,
        lastDiscoveryTime: 0,
        consecutiveFailures: 0,
        lastGitCommit: null
      };
      saveState('/proj', state);
      expect(writeFileSync).toHaveBeenCalledWith(
        '/proj/.pi/autonomous-state.json',
        expect.any(String)
      );
    });
  });

  describe('runGitCommand', () => {
    it('resolves with stdout on success', async () => {
      (execFile as any).mockImplementation((cmd, args, opts, cb) => cb(null, 'ok', ''));
      const result = await runGitCommand('/proj', ['status']);
      expect(result.stdout).toBe('ok');
    });

    it('returns stderr on failure', async () => {
      (execFile as any).mockImplementation((cmd, args, opts, cb) => cb(new Error('fail'), '', 'err'));
      try {
        await runGitCommand('/proj', ['commit']);
        throw new Error('should have rejected');
      } catch (error: any) {
        // error object should have stderr from third argument
        expect(error.stderr).toBe('err');
      }
    });
  });

  describe('mapPriority', () => {
    it('maps priority numbers', () => {
      expect(mapPriority(1)).toBe('CRITICAL');
      expect(mapPriority(2)).toBe('HIGH');
      expect(mapPriority(3)).toBe('MEDIUM');
      expect(mapPriority(99)).toBe('LOW');
    });
  });

  describe('assessRisk', () => {
    it('returns Low for test/document actions', () => {
      const task = makeTask({ action: 'test coverage' });
      expect(assessRisk(task, null)).toBe('Low');
    });

    it('returns Medium for refactor/optimize', () => {
      const task = makeTask({ action: 'refactor module' });
      expect(assessRisk(task, null)).toBe('Medium');
    });

    it('returns High for security/encrypt/auth/vuln', () => {
      const task = makeTask({ action: 'fix security vuln' });
      expect(assessRisk(task, null)).toBe('High');
    });

    it('returns High for VIOLATION_FIX with priority 1', () => {
      const task = makeTask({ type: 'VIOLATION_FIX', priority: 1 });
      expect(assessRisk(task, null)).toBe('High');
    });

    it('returns Medium for VIOLATION_FIX with priority 2', () => {
      const task = makeTask({ type: 'VIOLATION_FIX', priority: 2 });
      expect(assessRisk(task, null)).toBe('Medium');
    });
  });
});
