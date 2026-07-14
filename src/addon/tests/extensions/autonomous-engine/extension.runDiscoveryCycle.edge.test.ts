import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies at top-level
vi.mock('../../../extensions/autonomous-engine/quality-gate', () => ({
  QualityGate: vi.fn(),
}));

vi.mock('../../../extensions/autonomous-engine/task-discovery', () => ({
  TaskDiscovery: vi.fn(),
}));

vi.mock('../../../extensions/autonomous-engine/services/fs-service', () => ({
  saveState: vi.fn(),
}));

// Import after mocks
import { runDiscoveryCycle } from '../../../extensions/autonomous-engine/extension';
import * as fsService from '../../../extensions/autonomous-engine/services/fs-service';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import type { EngineState, TaskQueueItem } from '../../../extensions/autonomous-engine/types';

const CWD = '/test/cwd';

function createState(overrides: Partial<EngineState> = {}): EngineState {
  return {
    config: { discoveryIntervalMs: 1000, maxQueueSize: 30, failFast: false, autoCommit: true, autoPush: false },
    taskQueue: [],
    isRunning: true,
    cycleCount: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    currentTask: null,
    lastDiscoveryTime: 0,
    consecutiveFailures: 0,
    lastGitCommit: null,
    ...overrides,
  };
}

describe('runDiscoveryCycle (edge cases)', () => {
  let pi: ExtensionAPI;
  let state: EngineState;
  let saveStateSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    saveStateSpy = vi.spyOn(fsService, 'saveState').mockResolvedValue(undefined);

    // Get mock constructors from vi mocks
    const { QualityGate } = require('../../../extensions/autonomous-engine/quality-gate');
    const { TaskDiscovery } = require('../../../extensions/autonomous-engine/task-discovery');

    // Setup fresh mocks for each test
    const mockGateInstance = {
      runGate: vi.fn().mockResolvedValue({
        passed: true,
        score: 95,
        violations: [],
        coverage: { statements: 90, branches: 90, functions: 90, lines: 90, allAboveThreshold: true },
        buildStatus: 'success',
        testResults: { total: 10, passed: 10, failed: 0, skipped: 0, durationMs: 100 },
      }),
    };
    const mockDiscoveryInstance = { discoverTasks: vi.fn() };

    (QualityGate as any).mockImplementation(() => mockGateInstance);
    (TaskDiscovery as any).mockImplementation(() => mockDiscoveryInstance);

    pi = { sendMessage: vi.fn() } as any as ExtensionAPI;
    state = createState();
  });

  describe('early returns', () => {
    it('returns immediately if state.isRunning is false', async () => {
      state.isRunning = false;
      await runDiscoveryCycle(pi, CWD, state);
      const { QualityGate } = require('../../../extensions/autonomous-engine/quality-gate');
      expect(QualityGate).not.toHaveBeenCalled();
      expect(pi.sendMessage).not.toHaveBeenCalled();
    });

    it('skips discovery if shouldRunDiscovery returns false (time not reached)', async () => {
      state.lastDiscoveryTime = Date.now() - 500;
      await runDiscoveryCycle(pi, CWD, state);
      const { QualityGate } = require('../../../extensions/autonomous-engine/quality-gate');
      expect(QualityGate).not.toHaveBeenCalled();
      expect(state.cycleCount).toBe(0);
    });

    it('skips discovery if queue is full (hasReadyTask returns false)', async () => {
      state.taskQueue = Array.from({ length: 5 }, (_, i) => ({
        id: `task-${i}`,
        priority: 1,
        action: 'Test',
        context: {},
        discoveredAt: Date.now(),
      }));
      await runDiscoveryCycle(pi, CWD, state);
      const { QualityGate } = require('../../../extensions/autonomous-engine/quality-gate');
      expect(QualityGate).not.toHaveBeenCalled();
    });
  });

  describe('discovery flow', () => {
    it('adds new unique tasks and sorts by priority', async () => {
      const newTasks: TaskQueueItem[] = [
        { id: 't2', priority: 1, action: 'A', context: {}, discoveredAt: Date.now() },
        { id: 't1', priority: 2, action: 'B', context: {}, discoveredAt: Date.now() },
        { id: 't3', priority: 1, action: 'C', context: {}, discoveredAt: Date.now() },
      ];
      const { TaskDiscovery } = require('../../../extensions/autonomous-engine/task-discovery');
      (TaskDiscovery as any).mockImplementation(() => ({
        discoverTasks: vi.fn().mockResolvedValue(newTasks),
      }));
      state.taskQueue = [{ id: 't1', priority: 3, action: 'D', context: {}, discoveredAt: Date.now() }];

      await runDiscoveryCycle(pi, CWD, state);

      const queueIds = state.taskQueue.map(t => t.id);
      expect(queueIds).toContain('t1');
      expect(queueIds).toContain('t2');
      expect(queueIds).toContain('t3');
      // Check ordering: tasks with priority 1 should be before priority 3
      const priorityOrder = state.taskQueue.map(t => t.priority);
      const minPriorityIdx = priorityOrder.indexOf(Math.min(...priorityOrder));
      const maxPriorityIdx = priorityOrder.indexOf(Math.max(...priorityOrder));
      expect(minPriorityIdx).toBeLessThan(maxPriorityIdx);
    });

    it('truncates queue to max size (30) if exceeds', async () => {
      const manyTasks: TaskQueueItem[] = Array.from({ length: 35 }, (_, i) => ({
        id: `many-${i}`,
        priority: 1,
        action: 'Action',
        context: {},
        discoveredAt: Date.now(),
      }));
      const { TaskDiscovery } = require('../../../extensions/autonomous-engine/task-discovery');
      (TaskDiscovery as any).mockImplementation(() => ({
        discoverTasks: vi.fn().mockResolvedValue(manyTasks),
      }));
      await runDiscoveryCycle(pi, CWD, state);
      expect(state.taskQueue.length).toBeLessThanOrEqual(30);
    });

    it('increments cycleCount and updates lastDiscoveryTime', async () => {
      const { TaskDiscovery } = require('../../../extensions/autonomous-engine/task-discovery');
      (TaskDiscovery as any).mockImplementation(() => ({
        discoverTasks: vi.fn().mockResolvedValue([]),
      }));
      const before = Date.now();
      await runDiscoveryCycle(pi, CWD, state);
      expect(state.cycleCount).toBe(1);
      expect(state.lastDiscoveryTime).toBeGreaterThanOrEqual(before);
    });

    it('saves state after adding tasks', async () => {
      const { TaskDiscovery } = require('../../../extensions/autonomous-engine/task-discovery');
      (TaskDiscovery as any).mockImplementation(() => ({
        discoverTasks: vi.fn().mockResolvedValue([]),
      }));
      await runDiscoveryCycle(pi, CWD, state);
      expect(saveStateSpy).toHaveBeenCalledWith(CWD, state);
    });
  });

  describe('task triggering', () => {
    it('does not trigger task if no ready task after discovery', async () => {
      const { TaskDiscovery } = require('../../../extensions/autonomous-engine/task-discovery');
      (TaskDiscovery as any).mockImplementation(() => ({
        discoverTasks: vi.fn().mockResolvedValue([]),
      }));
      await runDiscoveryCycle(pi, CWD, state);
      expect(pi.sendMessage).not.toHaveBeenCalled();
      expect(state.currentTask).toBeNull();
    });

    it('triggers highest priority ready task', async () => {
      const newTasks: TaskQueueItem[] = [
        { id: 'low', priority: 2, action: 'Low', context: {}, discoveredAt: Date.now() },
        { id: 'high', priority: 1, action: 'High', context: {}, discoveredAt: Date.now() },
        { id: 'medium', priority: 3, action: 'Medium', context: {}, discoveredAt: Date.now() },
      ];
      const { TaskDiscovery } = require('../../../extensions/autonomous-engine/task-discovery');
      (TaskDiscovery as any).mockImplementation(() => ({
        discoverTasks: vi.fn().mockResolvedValue(newTasks),
      }));
      await runDiscoveryCycle(pi, CWD, state);
      expect(state.currentTask).not.toBeNull();
      expect(state.currentTask?.id).toBe('high');
      expect(state.currentTask?.priority).toBe(1);
      expect(pi.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          customType: 'autonomous-task',
          content: expect.arrayContaining([expect.objectContaining({ type: 'text' })]),
          display: false,
        }),
        expect.objectContaining({
          triggerTurn: true,
          deliverAs: 'followUp',
        })
      );
    });

    it('removes triggered task from queue and saves state', async () => {
      const newTasks: TaskQueueItem[] = [
        { id: 't1', priority: 1, action: 'A', context: {}, discoveredAt: Date.now() },
      ];
      const { TaskDiscovery } = require('../../../extensions/autonomous-engine/task-discovery');
      (TaskDiscovery as any).mockImplementation(() => ({
        discoverTasks: vi.fn().mockResolvedValue(newTasks),
      }));
      state.taskQueue = [{ id: 'existing', priority: 2, action: 'B', context: {}, discoveredAt: Date.now() }];
      await runDiscoveryCycle(pi, CWD, state);
      expect(state.taskQueue.find(t => t.id === 't1')).toBeUndefined();
      expect(saveStateSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles discoverTasks rejection', async () => {
      const error = new Error('Discovery failed');
      const { TaskDiscovery } = require('../../../extensions/autonomous-engine/task-discovery');
      (TaskDiscovery as any).mockImplementation(() => ({
        discoverTasks: vi.fn().mockRejectedValue(error),
      }));
      await runDiscoveryCycle(pi, CWD, state);
      expect(state.tasksFailed).toBe(1);
      expect(state.consecutiveFailures).toBe(1);
      expect(saveStateSpy).toHaveBeenCalledWith(CWD, state);
    });

    it('does not crash if saveState fails in happy path', async () => {
      saveStateSpy.mockRejectedValue(new Error('FS error'));
      const { TaskDiscovery } = require('../../../extensions/autonomous-engine/task-discovery');
      (TaskDiscovery as any).mockImplementation(() => ({
        discoverTasks: vi.fn().mockResolvedValue([]),
      }));
      await expect(runDiscoveryCycle(pi, CWD, state)).rejects.toThrow('FS error');
    });

    it('still records failure even if saveState fails in catch block', async () => {
      const error = new Error('Discovery error');
      const { TaskDiscovery } = require('../../../extensions/autonomous-engine/task-discovery');
      (TaskDiscovery as any).mockImplementation(() => ({
        discoverTasks: vi.fn().mockRejectedValue(error),
      }));
      saveStateSpy.mockRejectedValue(new Error('FS error'));
      await expect(runDiscoveryCycle(pi, CWD, state)).rejects.toThrow('FS error');
      expect(state.tasksFailed).toBe(1);
      expect(state.consecutiveFailures).toBe(1);
    });
  });
});
