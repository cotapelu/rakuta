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

import { loadState, saveState, runDiscoveryCycle, buildTaskPrompt, assessRisk, mapPriority, getStatePath, defaultState } from '../../../extensions/autonomous-engine/extension.js';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import type { EngineState, TaskQueueItem, AutonomousEngineConfig } from '../../../extensions/autonomous-engine/types.js';

const makeConfig = (overrides: Partial<AutonomousEngineConfig> = {}): AutonomousEngineConfig => ({
  discoveryIntervalMs: 60_000,
  maxConcurrentTasks: 1,
  autoCommit: true,
  updateDocs: true,
  qualityGate: { requireAllGreen: true },
  ...overrides
});

const makeState = (overrides: Partial<EngineState> = {}): EngineState => ({
  ...defaultState,
  config: makeConfig(),
  isRunning: true,
  taskQueue: [],
  currentTask: null,
  lastDiscoveryTime: 0,
  cycleCount: 0,
  tasksCompleted: 0,
  tasksFailed: 0,
  consecutiveFailures: 0,
  ...overrides
});

const makeTask = (overrides: Partial<TaskQueueItem> = {}): TaskQueueItem => ({
  id: 't1',
  action: 'test',
  module: 'core',
  cycle: 1,
  timestamp: new Date().toISOString(),
  success: false,
  coverageDelta: null,
  priority: 1,
  ...overrides
});

describe('AutonomousEngine Integration', () => {
  let pi: any;
  let cwd: string;

  beforeEach(() => {
    vi.clearAllMocks();
    cwd = '/workspace';
    pi = {
      sendMessage: vi.fn()
    };
  });

  describe('runDiscoveryCycle', () => {
    it('returns early if not running', async () => {
      const state = makeState({ isRunning: false });
      await runDiscoveryCycle(pi, cwd, state);
      expect(pi.sendMessage).not.toHaveBeenCalled();
    });

    it('skips if interval not elapsed', async () => {
      const now = Date.now();
      const state = makeState({
        isRunning: true,
        lastDiscoveryTime: now - 30_000,
        config: makeConfig({ discoveryIntervalMs: 60_000 })
      });
      await runDiscoveryCycle(pi, cwd, state);
      expect(state.cycleCount).toBe(0); // no increment
      expect(pi.sendMessage).not.toHaveBeenCalled();
    });

    it('adds tasks and triggers first', async () => {
      // Mock TaskDiscovery
      vi.doMock('../../../extensions/autonomous-engine/system-audit.js', () => ({
        SystemAudit: vi.fn().mockReturnValue({
          runFullAudit: vi.fn().mockResolvedValue({ passed: true }),
          formatReport: vi.fn().mockReturnValue('audit report')
        })
      }));
      vi.doMock('../../../extensions/autonomous-engine/quality-gate.js', () => ({
        QualityGate: vi.fn().mockImplementation(() => ({
          runGate: vi.fn().mockResolvedValue({ passed: true, score: 95, coverage: { branches: 80 }, testResults: { passed: 10, failed: 0, total: 10 }, violations: [] })
        }))
      }));
      vi.doMock('../../../extensions/autonomous-engine/task-discovery.js', () => ({
        TaskDiscovery: vi.fn().mockImplementation(() => ({
          discoverTasks: vi.fn().mockResolvedValue([
            makeTask({ id: 't2', action: 'refactor', priority: 2 }),
            makeTask({ id: 't3', action: 'test', priority: 1 })
          ])
        }))
      }));

      // Need to reimport after mocks? For simplicity, we manually provide mocks via vi.spyOn for functions not deeply imported.
      // We'll instead directly mock the constructors inside runDiscoveryCycle by spying on their classes.
      const State = require('../../../extensions/autonomous-engine/extension.js');
      vi.spyOn(State, 'TaskDiscovery').mockImplementation(() => ({
        discoverTasks: vi.fn().mockResolvedValue([
          makeTask({ id: 't2', action: 'refactor', priority: 2 }),
          makeTask({ id: 't3', action: 'test', priority: 1 })
        ])
      }));
      vi.spyOn(State, 'QualityGate').mockImplementation(() => ({
        runGate: vi.fn().mockResolvedValue({ passed: true, score: 95, coverage: { branches: 80 }, testResults: { passed: 10, failed: 0, total: 10 }, violations: [] })
      }));

      const state = makeState();
      await runDiscoveryCycle(pi, cwd, state);

      expect(state.cycleCount).toBe(1);
      expect(state.taskQueue).toHaveLength(2);
      expect(state.currentTask).not.toBeNull();
      expect(state.currentTask?.id).toBe('t3'); // priority 1 first after sort
      expect(pi.sendMessage).toHaveBeenCalled();
    });

    it('does not trigger task if queue empty', async () => {
      vi.spyOn(require('../../../extensions/autonomous-engine/extension.js'), 'TaskDiscovery').mockImplementation(() => ({
        discoverTasks: vi.fn().mockResolvedValue([])
      }));
      vi.spyOn(require('../../../extensions/autonomous-engine/extension.js'), 'QualityGate').mockImplementation(() => ({
        runGate: vi.fn().mockResolvedValue({ passed: true, score: 0, coverage: { branches: 0 }, testResults: { passed: 0, failed: 0, total: 0 }, violations: [] })
      }));

      const state = makeState();
      await runDiscoveryCycle(pi, cwd, state);
      expect(state.currentTask).toBeNull();
    });

    it('increments failures on error', async () => {
      vi.spyOn(require('../../../extensions/autonomous-engine/extension.js'), 'TaskDiscovery').mockImplementation(() => ({
        discoverTasks: vi.fn().mockRejectedValue(new Error('fail'))
      }));
      const state = makeState({ tasksFailed: 0, consecutiveFailures: 0 });
      await runDiscoveryCycle(pi, cwd, state);
      expect(state.tasksFailed).toBe(1);
      expect(state.consecutiveFailures).toBe(1);
    });

    it('respects queue size limit', async () => {
      vi.spyOn(require('../../../extensions/autonomous-engine/extension.js'), 'TaskDiscovery').mockImplementation(() => ({
        discoverTasks: vi.fn().mockResolvedValue(Array.from({ length: 40 }, (_, i) => makeTask({ id: `t${i}`, priority: 1 })))
      }));
      vi.spyOn(require('../../../extensions/autonomous-engine/extension.js'), 'QualityGate').mockImplementation(() => ({
        runGate: vi.fn().mockResolvedValue({ passed: true, score: 0, coverage: { branches: 0 }, testResults: { passed: 0, failed: 0, total: 0 }, violations: [] })
      }));

      const state = makeState();
      await runDiscoveryCycle(pi, cwd, state);
      expect(state.taskQueue.length).toBeLessThanOrEqual(30);
    });
  });

  describe('buildTaskPrompt', () => {
    it('builds prompt with task details', () => {
      const config = makeConfig();
      const task = makeTask({ action: 'refactor module' });
      const prompt = buildTaskPrompt(task, config);
      expect(prompt).toContain('refactor module');
      expect(prompt).toContain('cycle: 1');
    });
  });

  describe('assessRisk', () => {
    it('classifies by action keywords', () => {
      expect(assessRisk(makeTask({ action: 'fix security vuln' }), null)).toBe('High');
      expect(assessRisk(makeTask({ action: 'refactor legacy code' }), null)).toBe('Medium');
      expect(assessRisk(makeTask({ action: 'test coverage' }), null)).toBe('Low');
    });

    it('uses coverageDelta for default', () => {
      const task = makeTask();
      expect(assessRisk(task, { statements: 2, branches: 3 })).toBe('Low');
    });
  });

  describe('mapPriority', () => {
    it('maps numbers', () => {
      expect(mapPriority(1)).toBe('CRITICAL');
      expect(mapPriority(2)).toBe('HIGH');
      expect(mapPriority(3)).toBe('MEDIUM');
      expect(mapPriority(4)).toBe('LOW');
    });
  });
});
