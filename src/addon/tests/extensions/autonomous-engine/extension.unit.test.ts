import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  appendFileSync: vi.fn(),
  mkdirSync: vi.fn()
}));

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { loadState, saveState, getStatePath, mapPriority, assessRisk, buildTaskPrompt } from '../../../extensions/autonomous-engine/extension.js';
import type { TaskQueueItem, EngineState, AutonomousEngineConfig } from '../../../extensions/autonomous-engine/types.js';

const makeConfig = (overrides: Partial<AutonomousEngineConfig> = {}): AutonomousEngineConfig => ({
  discoveryIntervalMs: 60_000,
  maxConcurrentTasks: 1,
  autoCommit: true,
  autoPush: false,
  updateDocs: true,
  qualityGate: { requireAllGreen: true },
  ...overrides
});

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
  lastCoverage: undefined,
  lastTestTotal: undefined,
  ...overrides
});

describe('AutonomousEngine Unit (simple)', () => {
  let cwd: string;

  beforeEach(() => {
    vi.clearAllMocks();
    cwd = '/workspace';
    existsSync.mockReturnValue(false);
  });

  describe('getStatePath', () => {
    it('returns correct path', () => {
      expect(getStatePath(cwd)).toBe(`${cwd}/.pi/autonomous-state.json`);
    });
  });

  describe('loadState', () => {
    it('returns default when file missing', () => {
      const state = loadState(cwd);
      expect(state.isRunning).toBe(false);
      expect(state.cycleCount).toBe(0);
    });

    it('parses valid state', () => {
      existsSync.mockReturnValue(true);
      const data = { config: makeConfig(), isRunning: true, cycleCount: 5, taskQueue: [] };
      readFileSync.mockReturnValue(JSON.stringify(data));
      const state = loadState(cwd);
      expect(state.cycleCount).toBe(5);
    });

    it('falls back on parse error', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('{ bad }');
      const state = loadState(cwd);
      expect(state.cycleCount).toBe(0);
    });
  });

  describe('saveState', () => {
    it('writes state JSON', () => {
      const state = makeState({ cycleCount: 2 });
      saveState(cwd, state);
      expect(writeFileSync).toHaveBeenCalledWith(
        `${cwd}/.pi/autonomous-state.json`,
        expect.stringContaining('"cycleCount":2')
      );
    });
  });

  describe('mapPriority', () => {
    it('maps correctly', () => {
      expect(mapPriority(1)).toBe('CRITICAL');
      expect(mapPriority(2)).toBe('HIGH');
      expect(mapPriority(3)).toBe('MEDIUM');
      expect(mapPriority(4)).toBe('LOW');
    });
  });

  describe('assessRisk', () => {
    it('returns Low for test/doc actions', () => {
      expect(assessRisk(makeTask({ action: 'test coverage' }), null)).toBe('Low');
    });

    it('returns Medium for refactor/optimize', () => {
      expect(assessRisk(makeTask({ action: 'refactor module' }), null)).toBe('Medium');
    });

    it('returns High for security/encrypt/auth/vuln', () => {
      expect(assessRisk(makeTask({ action: 'fix security vuln' }), null)).toBe('High');
    });

    it('uses coverageDelta for default (negative -> Medium)', () => {
      expect(assessRisk(makeTask(), { statements: -5, branches: -3 })).toBe('Medium');
    });

    it('uses coverageDelta positive -> Low', () => {
      expect(assessRisk(makeTask(), { statements: 2, branches: 3 })).toBe('Low');
    });
  });

  describe('buildTaskPrompt', () => {
    it('includes task info', () => {
      const task = makeTask({ action: 'refactor', priority: 2 });
      const config = makeConfig();
      const prompt = buildTaskPrompt(task, config);
      expect(prompt).toContain('refactor');
      expect(prompt).toContain('cycle: 1');
      expect(prompt).toContain('priority: HIGH');
    });
  });
});
