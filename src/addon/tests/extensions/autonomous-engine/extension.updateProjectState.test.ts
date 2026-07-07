import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Mock node:fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  appendFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import {
  updateProjectState,
  defaultState,
} from '../../../extensions/autonomous-engine/extension';
import type { TaskQueueItem } from '../../../extensions/autonomous-engine/types';

const CWD = '/test';

function createTask(overrides: Partial<TaskQueueItem> = {}): TaskQueueItem {
  return {
    id: 'task-id',
    type: 'VIOLATION_FIX',
    priority: 2,
    module: 'src/file.ts',
    action: 'Do work',
    expectedImpact: '',
    estimatedMinutes: 10,
    risk: 'Low',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('updateProjectState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fs.existsSync as any).mockReturnValue(false);
  });

  it('creates new project state file when none exists', () => {
    const state = { ...defaultState, cycleCount: 1 };
    const task = createTask();
    updateProjectState(CWD, state, task, true, { statements: 90, branches: 80 });

    expect(fs.writeFileSync).toHaveBeenCalled();
    const writtenArg = (fs.writeFileSync as any).mock.calls[0][1];
    expect(writtenArg).toContain('task-id');
    expect(writtenArg).toContain('Do work');
    expect(writtenArg).toContain('"success": true');
  });

  it('appends to existing project state', () => {
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(JSON.stringify({
      lastUpdate: new Date().toISOString(),
      tasksCompleted: [],
      recentFailures: []
    }));
    const state = { ...defaultState, cycleCount: 2 };
    const task = createTask({ id: 'task2', action: 'Second task' });
    updateProjectState(CWD, state, task, false, null);

    expect(fs.writeFileSync).toHaveBeenCalled();
    const writtenArg = (fs.writeFileSync as any).mock.calls[0][1];
    expect(writtenArg).toContain('task2');
    expect(writtenArg).toContain('Second task');
    expect(writtenArg).toContain('"success": false');
  });

  it('handles writeFileSync error without throwing', () => {
    (fs.writeFileSync as any).mockImplementation(() => {
      throw new Error('disk full');
    });
    const state = { ...defaultState, cycleCount: 1 };
    const task = createTask();

    expect(() => updateProjectState(CWD, state, task, true, null)).not.toThrow();
  });
});
