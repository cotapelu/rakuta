import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';

// Mutable mock for TaskDiscovery.discoverTasks
let discoverTasksMockImpl: any = Promise.resolve([]);

vi.mock('../../../extensions/autonomous-engine/quality-gate.js', () => ({
  QualityGate: class { constructor() {} }
}));

vi.mock('../../../extensions/autonomous-engine/task-discovery.js', () => ({
  TaskDiscovery: class {
    constructor() {}
    async discoverTasks() {
      return discoverTasksMockImpl;
    }
  }
}));

import {
  runDiscoveryCycle,
  defaultState,
} from '../../../extensions/autonomous-engine/extension';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

function createTask(overrides: Partial<any> = {}): any {
  return {
    id: `t-${Math.random().toString(36).substring(2)}`,
    type: 'VIOLATION_FIX',
    priority: 2,
    module: 'src/x.ts',
    action: 'Do something',
    expectedImpact: 'Improve quality',
    estimatedMinutes: 30,
    risk: 'Low',
    createdAt: new Date(),
    ...overrides,
  };
}

// Helper to produce a fresh state with cloned default to avoid shared references.
function makeState(overrides: Partial<any> = {}): any {
  const clone = JSON.parse(JSON.stringify(defaultState));
  return { ...clone, ...overrides };
}

describe('runDiscoveryCycle', () => {
  let cwd: string;
  let pi: ExtensionAPI;
  let state: any;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'ai_'));
    pi = { sendMessage: vi.fn() } as any;
    discoverTasksMockImpl = Promise.resolve([]);
  });

  afterEach(async () => {
    try {
      await rm(cwd, { recursive: true, force: true });
    } catch {}
  });

  it('does nothing if state.isRunning false', async () => {
    state = makeState({ isRunning: false });
    await runDiscoveryCycle(pi, cwd, state);
    expect(state.cycleCount).toBe(0);
    expect(state.lastDiscoveryTime).toBe(0);
    expect(state.taskQueue).toEqual([]);
  });

  it('skips if discovery interval not elapsed', async () => {
    const now = Date.now();
    state = makeState({
      isRunning: true,
      lastDiscoveryTime: now,
      config: { ...defaultState.config, discoveryIntervalMs: 60000 }
    });
    await runDiscoveryCycle(pi, cwd, state);
    expect(state.cycleCount).toBe(0);
    expect(state.lastDiscoveryTime).toBe(now);
  });

  it('adds discovered tasks, deduplicates, sorts, and triggers first task when queue empty', async () => {
    const tasks = [
      createTask({ id: 't1', priority: 3 }),
      createTask({ id: 't2', priority: 1 }),
      createTask({ id: 't3', priority: 2 }),
    ];
    discoverTasksMockImpl = Promise.resolve(tasks);
    state = makeState({ isRunning: true, currentTask: null, taskQueue: [] });
    await runDiscoveryCycle(pi, cwd, state);
    // After adding 3 tasks and shifting first, queue should have 2 remaining
    expect(state.taskQueue.length).toBe(2);
    // Should be sorted by priority ascending, and first (t2) moved to currentTask
    expect(state.taskQueue[0].id).toBe('t3');
    expect(state.taskQueue[1].id).toBe('t1');
    expect(state.currentTask?.id).toBe('t2');
    expect(state.cycleCount).toBe(1);
    expect(pi.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('deduplicates against existing queue', async () => {
    const existing = createTask({ id: 'existing', priority: 2 });
    state = makeState({
      isRunning: true,
      currentTask: null,
      taskQueue: [existing]
    });
    const newTasks = [
      createTask({ id: 'new1', priority: 1 }),
      existing, // duplicate
      createTask({ id: 'new2', priority: 3 }),
    ];
    discoverTasksMockImpl = Promise.resolve(newTasks);
    await runDiscoveryCycle(pi, cwd, state);
    // uniqueNew should be new1 and new2 (2). Combined with existing gives 3 before shift
    // After shift (first task), queue length should be 2
    expect(state.taskQueue.length).toBe(2);
    const ids = state.taskQueue.map((t: any) => t.id).sort();
    expect(ids).toEqual(['existing', 'new2']);
    // currentTask should be new1 (highest priority)
    expect(state.currentTask?.id).toBe('new1');
    expect(pi.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('respects queue size limit (max 30)', async () => {
    // Create 35 distinct tasks
    const many = Array.from({ length: 35 }, (_, i) => createTask({ id: `t${i}`, priority: i }));
    discoverTasksMockImpl = Promise.resolve(many);
    state = makeState({ isRunning: true, currentTask: null, taskQueue: [] });
    await runDiscoveryCycle(pi, cwd, state);
    // After adding 35, sort, truncate to 30, then shift one -> 29 remain
    expect(state.taskQueue.length).toBe(29);
    // The tasks should be priorities 1..29 (since priority 0 moved to currentTask)
    expect(state.taskQueue[0].priority).toBe(1);
    expect(state.taskQueue[28].priority).toBe(29);
    expect(state.currentTask?.priority).toBe(0);
  });

  it('handles discovery failure (exception) without crashing', async () => {
    discoverTasksMockImpl = Promise.reject(new Error('Discovery failed'));
    state = makeState({ isRunning: true });
    // capture initial counters
    const initialFailed = state.tasksFailed;
    const initialConsecutive = state.consecutiveFailures;
    await runDiscoveryCycle(pi, cwd, state);
    // Should increment failure counters
    expect(state.tasksFailed).toBe(initialFailed + 1);
    expect(state.consecutiveFailures).toBe(initialConsecutive + 1);
    // No change to queue or cycleCount
    expect(state.cycleCount).toBe(0);
    expect(state.taskQueue).toEqual([]);
    expect(state.lastDiscoveryTime).toBe(0);
  });

  it('does not trigger task if currentTask already set', async () => {
    state = makeState({
      isRunning: true,
      currentTask: createTask({ id: 'current', priority: 1 }),
      taskQueue: []
    });
    const newTasks = [createTask({ id: 'new', priority: 2 })];
    discoverTasksMockImpl = Promise.resolve(newTasks);
    await runDiscoveryCycle(pi, cwd, state);
    // Queue should have new task
    expect(state.taskQueue.length).toBe(1);
    expect(state.taskQueue[0].id).toBe('new');
    // currentTask should remain original
    expect(state.currentTask?.id).toBe('current');
    // sendMessage should not be called because currentTask already set
    expect(pi.sendMessage).not.toHaveBeenCalled();
  });
});
