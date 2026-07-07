import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import {
  updateEvolutionDocs,
  defaultState,
} from '../../../extensions/autonomous-engine/extension';
import type { TaskQueueItem } from '../../../extensions/autonomous-engine/types';

const CWD = '/test';

function createTask(overrides: Partial<TaskQueueItem> = {}): TaskQueueItem {
  return {
    id: 'task-id',
    type: 'PROACTIVE_IMPROVEMENT',
    priority: 2,
    module: 'src/file.ts',
    action: 'Improve something',
    expectedImpact: 'Better perf',
    EstimatedMinutes: 10,
    risk: 'Low',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('updateEvolutionDocs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fs.existsSync as any).mockReturnValue(false);
  });

  it('creates new evolution file when none exists', () => {
    const state = { ...defaultState, cycleCount: 1 };
    const task = createTask();
    updateEvolutionDocs(CWD, state, task, true);

    expect(fs.writeFileSync).toHaveBeenCalled();
    const content = (fs.writeFileSync as any).mock.calls[0][1];
    const parsed = JSON.parse(content);
    expect(parsed.trajectory).toHaveLength(1);
    expect(parsed.trajectory[0].impact).toBe('Better perf');
    expect(parsed.lastUpdate).toBeDefined();
  });

  it('appends trajectory to existing file when success and PROACTIVE_IMPROVEMENT', () => {
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(JSON.stringify({
      lastUpdate: '2024-01-01T00:00:00.000Z',
      trajectory: [],
      upcoming: []
    }));
    const state = { ...defaultState, cycleCount: 2 };
    const task = createTask({ id: 't2', action: 'Another improvement', expectedImpact: 'Throughput' });
    updateEvolutionDocs(CWD, state, task, true);
    const content = (fs.writeFileSync as any).mock.calls[0][1];
    const parsed = JSON.parse(content);
    expect(parsed.trajectory.length).toBe(1);
    expect(parsed.trajectory[0].task).toBe('Another improvement');
    expect(parsed.trajectory[0].impact).toBe('Throughput');
  });

  it('does not add trajectory if task is not PROACTIVE_IMPROVEMENT', () => {
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(JSON.stringify({
      lastUpdate: '2024-01-01T00:00:00.000Z',
      trajectory: [],
      upcoming: []
    }));
    const state = { ...defaultState, cycleCount: 1 };
    const task = createTask({ type: 'VIOLATION_FIX' });
    updateEvolutionDocs(CWD, state, task, true);
    const content = (fs.writeFileSync as any).mock.calls[0][1];
    const parsed = JSON.parse(content);
    expect(parsed.trajectory.length).toBe(0);
  });

  it('handles write error without throwing', () => {
    (fs.writeFileSync as any).mockImplementation(() => {
      throw new Error('disk error');
    });
    const state = { ...defaultState, cycleCount: 1 };
    const task = createTask();

    expect(() => updateEvolutionDocs(CWD, state, task, true)).not.toThrow();
  });
});
