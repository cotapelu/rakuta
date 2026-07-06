import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Use fake timers for time control
let clock: any;

// Mock node:fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  appendFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mutable for TaskDiscovery mock
let discoverTasksReturn: any[] = [];
vi.mock('../../../extensions/autonomous-engine/task-discovery.js', () => ({
  TaskDiscovery: class {
    async discoverTasks() {
      return discoverTasksReturn;
    }
  },
}));

// Mock QualityGate
vi.mock('../../../extensions/autonomous-engine/quality-gate.js', () => ({
  QualityGate: class {
    async runGate() {
      return {
        passed: true,
        score: 100,
        violations: [],
        coverage: { statements: 90, branches: 90, functions: 90, lines: 90, allAboveThreshold: true },
        buildStatus: 'success',
        testResults: { total: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0 },
      };
    }
  },
}));

import {
  runDiscoveryCycle,
  defaultState,
} from '../../../extensions/autonomous-engine/extension';
import type { TaskQueueItem, EngineState } from '../../../extensions/autonomous-engine/types';

const CWD = '/test/cwd';
const STATE_FILE = path.join(CWD, '.pi/autonomous-state.json');

function createTask(overrides: Partial<TaskQueueItem> = {}): TaskQueueItem {
  return {
    id: `t-${Date.now()}`,
    type: 'VIOLATION_FIX',
    priority: 2,
    module: 'src/x.ts',
    action: 'Fix something',
    expectedImpact: 'Impact',
    estimatedMinutes: 30,
    risk: 'Low',
    createdAt: new Date(),
    attempts: 0,
    ...overrides,
  };
}

describe('runDiscoveryCycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fs.existsSync.mockReturnValue(false);
    discoverTasksReturn = [];
    clock = vi.useFakeTimers({ now: 1000000 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockPi = (overrides: any = {}) => ({
    sendMessage: vi.fn(),
    ...overrides,
  });

  it('does nothing if state.isRunning is false', async () => {
    const state: EngineState = { ...defaultState, isRunning: false };
    const pi = mockPi();
    await runDiscoveryCycle(pi as any, CWD, state);
    expect(pi.sendMessage).not.toHaveBeenCalled();
  });

  it('skips if discovery interval not elapsed', async () => {
    const now = Date.now();
    const state: EngineState = {
      ...defaultState,
      isRunning: true,
      lastDiscoveryTime: now - 10000,
      config: { ...defaultState.config, discoveryIntervalMs: 3600000 },
    };
    const pi = mockPi();
    await runDiscoveryCycle(pi as any, CWD, state);
    expect(pi.sendMessage).not.toHaveBeenCalled();
    expect(state.lastDiscoveryTime).toBe(now - 10000);
  });

  it('runs when interval elapsed and updates metadata', async () => {
    const now = Date.now();
    const state: EngineState = {
      ...defaultState,
      isRunning: true,
      lastDiscoveryTime: now - 8000000,
      cycleCount: 0,
    };
    const pi = mockPi();
    await runDiscoveryCycle(pi as any, CWD, state);
    expect(state.lastDiscoveryTime).toBeGreaterThanOrEqual(now);
    expect(state.cycleCount).toBe(1);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('adds discovered tasks, sorts by priority, promotes first to currentTask and leaves rest in queue', async () => {
    const tHigh = createTask({ id: 'high', priority: 1 });
    const tLow = createTask({ id: 'low', priority: 3 });
    discoverTasksReturn = [tLow, tHigh];
    const now = Date.now();
    const state: EngineState = {
      ...defaultState,
      isRunning: true,
      lastDiscoveryTime: now - 8000000,
      taskQueue: [],
      currentTask: null,
      cycleCount: 0,
    };
    const pi = mockPi();
    await runDiscoveryCycle(pi as any, CWD, state);
    // After sorting, the highest priority (1) should be currentTask, and queue contains the rest (one low)
    expect(state.currentTask).toBe(tHigh);
    expect(state.taskQueue).toHaveLength(1);
    expect(state.taskQueue[0]).toBe(tLow);
  });

  it('truncates queue to max 30 before promoting currentTask (final queue size = 29)', async () => {
    const many = Array.from({ length: 35 }, (_, i) => createTask({ id: `t${i}`, priority: 3 }));
    discoverTasksReturn = many;
    const now = Date.now();
    const state: EngineState = {
      ...defaultState,
      isRunning: true,
      lastDiscoveryTime: now - 8000000,
      taskQueue: [],
      currentTask: null,
      cycleCount: 0,
    };
    const pi = mockPi();
    await runDiscoveryCycle(pi as any, CWD, state);
    // After truncation to 30, one is shifted to currentTask, leaving 29
    expect(state.taskQueue.length).toBe(29);
    expect(state.currentTask).toBeDefined();
  });

  it('does not override currentTask if already set, still adds new tasks to queue', async () => {
    const t1 = createTask({ id: 't1', priority: 1 });
    const t2 = createTask({ id: 't2', priority: 2 });
    discoverTasksReturn = [t1, t2];
    const now = Date.now();
    const existing = createTask({ id: 'existing', priority: 0 });
    const state: EngineState = {
      ...defaultState,
      isRunning: true,
      lastDiscoveryTime: now - 8000000,
      taskQueue: [],
      currentTask: existing,
      cycleCount: 0,
    };
    const pi = mockPi();
    await runDiscoveryCycle(pi as any, CWD, state);
    expect(state.currentTask).toBe(existing);
    expect(state.taskQueue).toHaveLength(2); // both tasks added, no shift
    expect(pi.sendMessage).not.toHaveBeenCalled();
  });

  it('sends task prompt via pi.sendMessage when currentTask set', async () => {
    const t1 = createTask({ id: 't1', priority: 1 });
    discoverTasksReturn = [t1];
    const now = Date.now();
    const state: EngineState = {
      ...defaultState,
      isRunning: true,
      lastDiscoveryTime: now - 8000000,
      taskQueue: [],
      currentTask: null,
      cycleCount: 0,
    };
    const pi = mockPi();
    await runDiscoveryCycle(pi as any, CWD, state);
    expect(pi.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        customType: 'autonomous-task',
        content: expect.arrayContaining([
          expect.objectContaining({ type: 'text', text: expect.stringContaining('# Autonomous Task Execution') })
        ]),
        display: false,
      }),
      expect.objectContaining({ triggerTurn: true, deliverAs: 'followUp' })
    );
  });

  it('mutates state correctly and persists via saveState', async () => {
    const t1 = createTask({ priority: 1 });
    discoverTasksReturn = [t1];
    const now = Date.now();
    const state: EngineState = {
      ...defaultState,
      isRunning: true,
      lastDiscoveryTime: now - 8000000,
      taskQueue: [],
      currentTask: null,
      cycleCount: 0,
    };
    const pi = mockPi();
    await runDiscoveryCycle(pi as any, CWD, state);
    // Verify state fields
    expect(state.lastDiscoveryTime).toBeGreaterThanOrEqual(now);
    expect(state.cycleCount).toBe(1);
    expect(state.currentTask).toBe(t1);
    expect(state.taskQueue).toHaveLength(0);
    // verify saveState called at least once
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      STATE_FILE,
      expect.any(String)
    );
    // inspect last saved state directly from the object
    const lastWritten = fs.writeFileSync.mock.calls[fs.writeFileSync.mock.calls.length - 1][1];
    const parsed = JSON.parse(lastWritten);
    expect(parsed.currentTask.id).toBe(t1.id);
    expect(parsed.taskQueue).toEqual([]);
  });
});
