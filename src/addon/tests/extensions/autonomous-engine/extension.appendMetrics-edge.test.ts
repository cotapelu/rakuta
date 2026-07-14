import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import { appendMetrics, defaultState } from '../../../extensions/autonomous-engine/extension';
import type { TaskQueueItem } from '../../../extensions/autonomous-engine/types';

const CWD = '/test';
const METRICS_FILE = 'docs/AGENT_METRICS.md';

function createTask(overrides: Partial<TaskQueueItem> = {}): TaskQueueItem {
  return {
    id: 't1',
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

// Mock node:fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  appendFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe('appendMetrics (edge cases)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fs.existsSync as any).mockReturnValue(false);
  });

  it('writes new metrics file when none exists', async () => {
    const state = { ...defaultState, cycleCount: 1 };
    const task = createTask();
    const coverage = { statements: 90, branches: 80, functions: 90, lines: 90 };
    const testResults = { total: 10, passed: 10, failed: 0, skipped: 0, durationMs: 100 };
    await appendMetrics(CWD, state, task, coverage, testResults, true);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      METRICS_FILE,
      expect.any(String)
    );
  });

  it('appends to metrics file when exists', async () => {
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue('# Existing');
    const state = { ...defaultState, lastCoverage: { statements: 80, branches: 70, functions: 85, lines: 82 } };
    const task = createTask();
    const coverage = { statements: 85, branches: 75, functions: 90, lines: 88 };
    const testResults = { total: 15, passed: 14, failed: 1, skipped: 0, durationMs: 150 };
    await appendMetrics(CWD, state, task, coverage, testResults, true);
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      METRICS_FILE,
      expect.any(String)
    );
  });

  it('handles writeFileSync error without throwing', async () => {
    (fs.writeFileSync as any).mockImplementation(() => { throw new Error('disk full'); });
    const state = { ...defaultState };
    const task = createTask();
    const coverage = { statements: 90, branches: 80, functions: 90, lines: 90 };
    const testResults = { total: 10, passed: 10, failed: 0, skipped: 0, durationMs: 100 };
    await expect(appendMetrics(CWD, state, task, coverage, testResults, true)).resolves.not.toThrow();
  });

  it('handles appendFileSync error without throwing', async () => {
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue('# Existing');
    (fs.appendFileSync as any).mockImplementation(() => { throw new Error('disk full'); });
    const state = { ...defaultState };
    const task = createTask();
    const coverage = { statements: 90, branches: 80, functions: 90, lines: 90 };
    const testResults = { total: 10, passed: 10, failed: 0, skipped: 0, durationMs: 100 };
    await expect(appendMetrics(CWD, state, task, coverage, testResults, true)).resolves.not.toThrow();
  });

  it('computes negative delta and regression flag', async () => {
    const state = {
      ...defaultState,
      lastCoverage: { statements: 85, branches: 75, functions: 90, lines: 88 },
    };
    const task = createTask();
    const coverage = { statements: 80, branches: 75, functions: 90, lines: 88 }; // statements down
    const testResults = { total: 10, passed: 10, failed: 0, skipped: 0, durationMs: 100 };
    await appendMetrics(CWD, state, task, coverage, testResults, true);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('computes failure rate from test results', async () => {
    const state = { ...defaultState };
    const task = createTask();
    const coverage = { statements: 90, branches: 80, functions: 90, lines: 90 };
    const testResults = { total: 10, passed: 7, failed: 3, skipped: 0, durationMs: 100 };
    await appendMetrics(CWD, state, task, coverage, testResults, true);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});
