import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import { join } from 'path';
import { appendTodoCompletion } from '../../../extensions/autonomous-engine/extension';
import type { TaskQueueItem } from '../../../extensions/autonomous-engine/types';

// Mock node:fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  appendFileSync: vi.fn(),
}));

const CWD = '/test/cwd';

function createTask(overrides: Partial<TaskQueueItem> = {}): TaskQueueItem {
  return {
    id: 'task-1',
    type: 'VIOLATION_FIX' as const,
    priority: 2,
    module: 'src/foo.ts',
    action: 'Fix something',
    expectedImpact: '',
    estimatedMinutes: 30,
    risk: 'Low' as const,
    createdAt: new Date(),
    attempts: 0,
    ...overrides,
  };
}

describe('appendTodoCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fs.existsSync as any).mockReturnValue(false);
  });

  it('returns early if TODO.md does not exist', () => {
    appendTodoCompletion(CWD, createTask(), 1, '2024-01-01T00:00:00Z');
    expect(fs.appendFileSync).not.toHaveBeenCalled();
  });

  it('appends entry with correct format when TODO.md exists', () => {
    (fs.existsSync as any).mockReturnValue(true);
    const task = createTask({ id: 'tid', action: 'Do work' });
    appendTodoCompletion(CWD, task, 5, '2024-01-02T12:00:00Z');
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining('TODO.md'),
      expect.stringContaining('- [x] Cycle 5: Do work (src/foo.ts) - HIGH - 2024-01-02T12:00:00Z')
    );
  });

  it('includes expectedImpact as follow-up when provided', () => {
    (fs.existsSync as any).mockReturnValue(true);
    const task = createTask({ expectedImpact: 'Reduce latency by 20%' });
    appendTodoCompletion(CWD, task, 1, '2024-01-01T00:00:00Z');
    const content = (fs.appendFileSync as any).mock.calls[0][1];
    expect(content).toContain('Follow-up: Reduce latency by 20%');
  });

  it('does not include follow-up if expectedImpact empty or whitespace', () => {
    (fs.existsSync as any).mockReturnValue(true);
    const task = createTask({ expectedImpact: '   ' });
    appendTodoCompletion(CWD, task, 1, '2024-01-01T00:00:00Z');
    const content = (fs.appendFileSync as any).mock.calls[0][1];
    expect(content).not.toContain('Follow-up');
  });

  it('handles appendFileSync error without throwing', () => {
    (fs.existsSync as any).mockReturnValue(true);
    (fs.appendFileSync as any).mockImplementation(() => { throw new Error('disk full'); });
    expect(() => appendTodoCompletion(CWD, createTask(), 1, '2024-01-01T00:00:00Z')).not.toThrow();
  });

  it('maps priority correctly: CRITICAL/HIGH/MEDIUM/LOW', () => {
    (fs.existsSync as any).mockReturnValue(true);
    const cases: Array<{ p: number; label: string }> = [
      { p: 1, label: 'CRITICAL' },
      { p: 2, label: 'HIGH' },
      { p: 3, label: 'MEDIUM' },
      { p: 4, label: 'LOW' },
    ];
    for (const { p, label } of cases) {
      const task = createTask({ priority: p });
      vi.clearAllMocks();
      appendTodoCompletion(CWD, task, 1, '2024-01-01T00:00:00Z');
      const content = (fs.appendFileSync as any).mock.calls[0][1];
      expect(content).toContain(label);
    }
  });
});
