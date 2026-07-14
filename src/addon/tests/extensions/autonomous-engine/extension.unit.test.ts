import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  appendFileSync: vi.fn(),
  mkdirSync: vi.fn()
}));

vi.mock('../utils/logger.js', () => ({
  createLogger: () => ({ log: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { loadState, saveState, getStatePath, mapPriority, assessRisk, buildTaskPrompt, updateEvolutionDocs, updateProjectState, updateAgentProfile } from '../../../extensions/autonomous-engine/extension.js';
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
  estimatedMinutes: 30,
  attempts: 0,
  risk: 'Low',
  violation: undefined,
  improvementType: undefined,
  createdAt: new Date(),
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

describe('AutonomousEngine Unit (focused)', () => {
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
        expect.any(String)
      );
      const content = writeFileSync.mock.calls[0][1] as string;
      const parsed = JSON.parse(content);
      expect(parsed.cycleCount).toBe(2);
      expect(parsed.isRunning).toBe(true);
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
    it('returns Low for test/coverage/document actions', () => {
      expect(assessRisk(makeTask({ action: 'test coverage' }), null)).toBe('Low');
      expect(assessRisk(makeTask({ action: 'update readme' }), null)).toBe('Low');
    });

    it('returns High for security/vuln/auth/encrypt', () => {
      expect(assessRisk(makeTask({ action: 'fix security vuln' }), null)).toBe('High');
      expect(assessRisk(makeTask({ action: 'encrypt data' }), null)).toBe('High');
    });

    it('returns Medium for refactor/optimize/performance', () => {
      expect(assessRisk(makeTask({ action: 'refactor module' }), null)).toBe('Medium');
      expect(assessRisk(makeTask({ action: 'optimize query' }), null)).toBe('Medium');
    });

    it('returns Medium for default Unknown actions', () => {
      expect(assessRisk(makeTask({ action: 'misc' }), null)).toBe('Medium');
    });

    it('handles VIOLATION_FIX based on priority', () => {
      expect(assessRisk(makeTask({ type: 'VIOLATION_FIX' as any, priority: 1 }), null)).toBe('High');
      expect(assessRisk(makeTask({ type: 'VIOLATION_FIX' as any, priority: 2 }), null)).toBe('Medium');
      expect(assessRisk(makeTask({ type: 'VIOLATION_FIX' as any, priority: 3 }), null)).toBe('Low');
    });
  });

  describe('buildTaskPrompt', () => {
    it('includes task details in AUTO-CONTINUE format', () => {
      const task = makeTask({ action: 'refactor', priority: 2, type: 'IMPROVEMENT', expectedImpact: 'better' });
      const config = makeConfig();
      const prompt = buildTaskPrompt(task, config);
      expect(typeof prompt).toBe('string');
      expect(prompt).toContain('# Autonomous Task Execution');
      expect(prompt).toContain('Action: refactor');
      expect(prompt).toContain('Module: core');
      expect(prompt).toContain('Priority: 2');
      expect(prompt).toContain('Type: IMPROVEMENT');
      expect(prompt).toContain('Expected Impact: better');
    });
  });

  describe('updateEvolutionDocs', () => {
    it('creates JSON file if not exists', async () => {
      existsSync.mockReturnValue(false);
      const state = makeState();
      await updateEvolutionDocs(cwd, state, makeTask(), true);
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('docs/EVOLUTION.md'),
        expect.any(String)
      );
      const content = writeFileSync.mock.calls[0][1] as string;
      const parsed = JSON.parse(content);
      expect(parsed.lastUpdate).toBeDefined();
      expect(parsed.trajectory).toEqual([]);
      expect(parsed.upcoming).toEqual([]);
    });

    it('adds trajectory for PROACTIVE_IMPROVEMENT', async () => {
      existsSync.mockReturnValue(false);
      const state = makeState();
      const task = makeTask({ type: 'PROACTIVE_IMPROVEMENT' as any, expectedImpact: 'performance gain' });
      await updateEvolutionDocs(cwd, state, task, true);
      const content = writeFileSync.mock.calls[0][1] as string;
      const parsed = JSON.parse(content);
      expect(parsed.trajectory).toHaveLength(1);
      expect(parsed.trajectory[0].task).toBe('test');
      expect(parsed.trajectory[0].impact).toBe('performance gain');
    });
  });

  describe('updateProjectState', () => {
    it('creates new JSON file if not exists', async () => {
      existsSync.mockReturnValue(false);
      const state = makeState();
      await updateProjectState(cwd, state, makeTask(), true, { statements: 80, branches: 75 });
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('docs/PROJECT_STATE.md'),
        expect.any(String)
      );
      const content = writeFileSync.mock.calls[0][1] as string;
      const parsed = JSON.parse(content);
      expect(parsed.tasksCompleted).toHaveLength(1);
      expect(parsed.tasksCompleted[0].id).toBe('t1');
      expect(parsed.lastUpdate).toBeDefined();
    });

    it('appends to existing file', async () => {
      existsSync.mockReturnValue(true);
      const existing = { lastUpdate: '', tasksCompleted: [] };
      readFileSync.mockReturnValue(JSON.stringify(existing));
      const state = makeState({ cycleCount: 2 });
      await updateProjectState(cwd, state, makeTask({ id: 't2' }), true, { statements: 80, branches: 75 });
      expect(writeFileSync).toHaveBeenCalled();
      const content = writeFileSync.mock.calls[0][1] as string;
      const parsed = JSON.parse(content);
      expect(parsed.tasksCompleted).toHaveLength(1);
      expect(parsed.tasksCompleted[0].id).toBe('t2');
    });
  });

  describe('updateAgentProfile', () => {
    it('creates profile on first run', async () => {
      existsSync.mockReturnValue(false);
      await updateAgentProfile(cwd, makeTask(), true);
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('docs/AGENT_PROFILE.md'),
        expect.any(String)
      );
      const content = writeFileSync.mock.calls[0][1] as string;
      const parsed = JSON.parse(content);
      expect(parsed.weaknesses).toEqual([]);
      expect(parsed.fragileModules).toEqual([]);
    });

    it('records failure when success=false', async () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue(JSON.stringify({ weaknesses: [] }));
      await updateAgentProfile(cwd, makeTask(), false, 'network timeout');
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String)
      );
      const content = writeFileSync.mock.calls[0][1] as string;
      const parsed = JSON.parse(content);
      expect(parsed.weaknesses).toHaveLength(1);
      expect(parsed.weaknesses[0].reason).toBe('network timeout');
    });

    it('does not add weakness when success=true', async () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue(JSON.stringify({ weaknesses: [] }));
      await updateAgentProfile(cwd, makeTask(), true);
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String)
      );
      const content = writeFileSync.mock.calls[0][1] as string;
      const parsed = JSON.parse(content);
      expect(parsed.weaknesses).toEqual([]);
    });
  });
});
