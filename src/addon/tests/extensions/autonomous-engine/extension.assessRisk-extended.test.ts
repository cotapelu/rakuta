import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assessRisk } from '../../../extensions/autonomous-engine/extension';
import type { TaskQueueItem } from '../../../extensions/autonomous-engine/types';

function createTask(overrides: Partial<TaskQueueItem> = {}): TaskQueueItem {
  return {
    id: 'task-1',
    type: 'PROACTIVE_IMPROVEMENT' as const,
    priority: 2,
    module: 'src/foo.ts',
    action: '',
    expectedImpact: '',
    estimatedMinutes: 30,
    risk: 'Low',
    createdAt: new Date(),
    attempts: 0,
    ...overrides,
  };
}

describe('assessRisk (extended keywords)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns HIGH for security-related actions (security, encrypt, auth, vuln)', () => {
    const securityActions = [
      'implement security enhancements',
      'encrypt sensitive fields',
      'add authentication check',
      'fix vuln in authentication flow',
      'security hardening',
    ];
    for (const action of securityActions) {
      const task = createTask({ action });
      expect(assessRisk(task, null)).toBe('High');
    }
  });

  it('returns MEDIUM for refactor/optimize/performance actions', () => {
    const mediumActions = [
      'refactor user service',
      'optimize database queries',
      'improve performance of batch job',
      'performance tuning',
    ];
    for (const action of mediumActions) {
      const task = createTask({ action });
      expect(assessRisk(task, null)).toBe('Medium');
    }
  });

  it('returns LOW for test/coverage/document/readme actions', () => {
    const lowActions = [
      'write unit tests',
      'increase branch coverage',
      'update README with examples',
      'document API endpoints',
      'add documentation for module',
    ];
    for (const action of lowActions) {
      const task = createTask({ action });
      expect(assessRisk(task, null)).toBe('Low');
    }
  });

  it('returns Medium for PROACTIVE_IMPROVEMENT with no keywords', () => {
    const task = createTask({ action: 'miscellaneous improvement' });
    expect(assessRisk(task, null)).toBe('Medium');
  });

  it('returns correct risk for VIOLATION_FIX based on priority', () => {
    const cases: Array<{ priority: number; expected: 'High' | 'Medium' | 'Low' }> = [
      { priority: 1, expected: 'High' },
      { priority: 2, expected: 'Medium' },
      { priority: 3, expected: 'Low' },
      { priority: 4, expected: 'Low' },
    ];
    for (const { priority, expected } of cases) {
      const task = createTask({ type: 'VIOLATION_FIX' as any, priority });
      expect(assessRisk(task, null)).toBe(expected);
    }
  });
});
