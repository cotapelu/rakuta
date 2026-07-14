import { describe, it, expect } from 'vitest';
import {
  shouldRunDiscovery,
  getRemainingTime,
  deduplicateAndSort,
  hasReadyTask,
  buildSkipReason,
} from '../../../autonomous-engine/helpers/discovery-helpers.js';
import type { TaskQueueItem } from '../../../autonomous-engine/types.js';

describe('discovery-helpers', () => {
  describe('shouldRunDiscovery', () => {
    it('returns true when no lastDiscoveryTime', () => {
      const state = { lastDiscoveryTime: 0, config: { discoveryIntervalMs: 5000 } };
      expect(shouldRunDiscovery(state, Date.now())).toBe(true);
    });

    it('returns true when interval elapsed', () => {
      const now = Date.now();
      const state = { lastDiscoveryTime: now - 6000, config: { discoveryIntervalMs: 5000 } };
      expect(shouldRunDiscovery(state, now)).toBe(true);
    });

    it('returns false when interval not elapsed', () => {
      const now = Date.now();
      const state = { lastDiscoveryTime: now - 2000, config: { discoveryIntervalMs: 5000 } };
      expect(shouldRunDiscovery(state, now)).toBe(false);
    });
  });

  describe('getRemainingTime', () => {
    it('returns 0 when no lastDiscoveryTime', () => {
      const state = { lastDiscoveryTime: 0, config: { discoveryIntervalMs: 5000 } };
      expect(getRemainingTime(state, Date.now())).toBe(0);
    });

    it('returns remaining ms when interval not elapsed', () => {
      const now = Date.now();
      const state = { lastDiscoveryTime: now - 2000, config: { discoveryIntervalMs: 5000 } };
      expect(getRemainingTime(state, now)).toBe(3000);
    });

    it('returns 0 when interval already elapsed', () => {
      const now = Date.now();
      const state = { lastDiscoveryTime: now - 6000, config: { discoveryIntervalMs: 5000 } };
      expect(getRemainingTime(state, now)).toBe(0);
    });
  });

  describe('deduplicateAndSort', () => {
    const task1: TaskQueueItem = { id: 't1', priority: 2, action: 'a1', module: 'm1', type: 'PROACTIVE_IMPROVEMENT', expectedImpact: '', estimatedMinutes: 10 };
    const task2: TaskQueueItem = { id: 't2', priority: 1, action: 'a2', module: 'm2', type: 'VIOLATION_FIX', expectedImpact: '', estimatedMinutes: 5 };
    const task3: TaskQueueItem = { id: 't3', priority: 3, action: 'a3', module: 'm3', type: 'PROACTIVE_IMPROVEMENT', expectedImpact: '', estimatedMinutes: 15 };

    it('filters out existing IDs', () => {
      const existing = new Set(['t1', 't3']);
      const newTasks = [task1, task2, task3];
      const result = deduplicateAndSort(newTasks, existing);
      expect(result.map(t => t.id)).toEqual(['t2']);
    });

    it('sorts by priority ascending', () => {
      const existing = new Set<string>();
      const newTasks = [task3, task1, task2];
      const result = deduplicateAndSort(newTasks, existing);
      expect(result.map(t => t.id)).toEqual(['t2', 't1', 't3']);
    });

    it('truncates to maxQueueSize', () => {
      const existing = new Set<string>();
      const manyTasks = Array.from({ length: 40 }, (_, i) => ({
        id: `t${i}`,
        priority: i,
        action: `a${i}`,
        module: `m${i}`,
        type: 'PROACTIVE_IMPROVEMENT' as const,
        expectedImpact: '',
        estimatedMinutes: 10,
      }));
      const result = deduplicateAndSort(manyTasks, existing);
      expect(result.length).toBe(30);
    });
  });

  describe('hasReadyTask', () => {
    it('returns true when no current task and queue non-empty', () => {
      const state = { currentTask: null, taskQueue: [{ id: 't1', priority: 2, action: 'a', module: 'm', type: 'PROACTIVE_IMPROVEMENT', expectedImpact: '', estimatedMinutes: 10 }] };
      expect(hasReadyTask(state)).toBe(true);
    });

    it('returns false when current task exists', () => {
      const state = {
        currentTask: { id: 't1', priority: 1, action: 'a', module: 'm', type: 'VIOLATION_FIX', expectedImpact: '', estimatedMinutes: 5 },
        taskQueue: [],
      };
      expect(hasReadyTask(state)).toBe(false);
    });

    it('returns false when queue empty', () => {
      const state = { currentTask: null, taskQueue: [] };
      expect(hasReadyTask(state)).toBe(false);
    });
  });

  describe('buildSkipReason', () => {
    it('formats remaining seconds correctly', () => {
      const reason = buildSkipReason(3500);
      expect(reason).toBe('Discovery skipped (interval not elapsed). Next in 4s');
    });

    it('rounds down', () => {
      const reason = buildSkipReason(2600);
      expect(reason).toBe('Discovery skipped (interval not elapsed). Next in 3s');
    });
  });
});
