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
  appendMetrics,
  defaultState,
} from '../../../extensions/autonomous-engine/extension';
import type { TaskQueueItem } from '../../../extensions/autonomous-engine/types';

const CWD = '/test/cwd';
const METRICS_FILE = 'docs/AGENT_METRICS.md';

function createTask(overrides: Partial<TaskQueueItem> = {}): TaskQueueItem {
  return {
    id: 'task-1',
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

describe('appendMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fs.existsSync.mockReturnValue(false);
  });

  it('creates new metrics file when none exists', async () => {
    const task = createTask();
    const state = { ...defaultState, cycleCount: 1 };
    const coverage = { statements: 85, branches: 80, functions: 90, lines: 88 };
    const testResults = { total: 10, passed: 9, failed: 1, skipped: 0, durationMs: 100 };
    await appendMetrics(CWD, state, task, coverage, testResults);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      METRICS_FILE,
      expect.stringContaining('# Agent Metrics')
    );
    const content = fs.writeFileSync.mock.calls[0][1];
    expect(content).toContain('Cycle 1');
    expect(content).toContain('Fix something');
    // initial entry does not include coverage or test details
    expect(content).not.toContain('Statements');
  });

  it('appends to existing metrics file', async () => {
    const existing = '# Agent Metrics\n\n> Auto-maintained\n';
    fs.existsSync.mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(existing);
    const task = createTask();
    const state = { ...defaultState, cycleCount: 2 };
    await appendMetrics(CWD, state, task, { statements: 90, branches: 90, functions: 90, lines: 90 }, { total: 5, passed: 5, failed: 0, skipped: 0, durationMs: 50 });
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      METRICS_FILE,
      expect.stringContaining('Cycle 2')
    );
  });
});
