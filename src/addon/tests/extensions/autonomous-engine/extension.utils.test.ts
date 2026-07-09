import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock logger before extension loads
vi.mock('../../../extensions/utils/logger.js', () => ({
  createLogger: vi.fn(() => ({
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

// Mock child_process
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

// Mock node:fs
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  appendFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock other internal modules to reduce load
vi.mock('../../../extensions/autonomous-engine/quality-gate', () => ({
  QualityGate: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('../../../extensions/autonomous-engine/task-discovery', () => ({
  TaskDiscovery: vi.fn().mockImplementation(() => ({ discoverTasks: vi.fn().mockResolvedValue([]) })),
}));
vi.mock('../../../extensions/autonomous-engine/system-audit', () => ({
  SystemAudit: vi.fn().mockImplementation(() => ({ runFullAudit: vi.fn().mockResolvedValue({ passed: true }) })),
}));

import {
  loadState,
  saveState,
  buildTaskPrompt,
  mapPriority,
  assessRisk,
} from '../../../extensions/autonomous-engine/extension.ts';

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const CWD = '/test/cwd';

describe('AutonomousEngine extension utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default fs: no state file exists
    (existsSync as any).mockReturnValue(false);
  });

  describe('loadState', () => {
    it('returns default state when no state file', () => {
      const state = loadState(CWD);
      expect(state.isRunning).toBe(false);
      expect(state.taskQueue).toEqual([]);
    });

    it('merges saved state with defaults', () => {
      const saved = {
        isRunning: true,
        cycleCount: 5,
        taskQueue: [{ id: 't1', action: 'test' as any }],
        config: { discoveryIntervalMs: 120000 },
      };
      (existsSync as any).mockReturnValue(true);
      (readFileSync as any).mockReturnValue(JSON.stringify(saved));

      const state = loadState(CWD);

      expect(state.isRunning).toBe(true);
      expect(state.cycleCount).toBe(5);
      expect(state.taskQueue).toHaveLength(1);
      // Config should merge with DEFAULT_CONFIG
      expect(state.config.discoveryIntervalMs).toBe(120000);
    });

    it('falls back to default on JSON parse error', () => {
      (existsSync as any).mockReturnValue(true);
      (readFileSync as any).mockReturnValue('invalid json');

      const state = loadState(CWD);

      expect(state.isRunning).toBe(false);
    });
  });

  describe('saveState', () => {
    it('creates directory if missing and writes file', () => {
      (existsSync as any).mockReturnValue(false);
      const state = { isRunning: true } as any;

      saveState(CWD, state);

      // Should create parent directory if missing
      // Should create parent directory if missing and write file
      expect(mkdirSync).toHaveBeenCalled();
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.pi/autonomous-state.json'),
        expect.stringContaining('"isRunning": true') // space after colon
      );
    });

    it('writes without mkdir if directory exists', () => {
      (existsSync as any).mockReturnValue(true);
      const state = { isRunning: false } as any;

      saveState(CWD, state);

      expect(mkdirSync).not.toHaveBeenCalled();
      expect(writeFileSync).toHaveBeenCalled();
    });
  });

  describe('buildTaskPrompt', () => {
    it('includes required sections and config values', () => {
      const task = {
        id: 'tid',
        type: 'VIOLATION_FIX' as any,
        priority: 2,
        violation: { type: 'SECURITY', severity: 'HIGH', file: 'x.ts', line: 1, column: 1, message: 'm', ruleId: 'r' },
        module: 'x.ts',
        action: 'Fix issue',
        expectedImpact: 'Better',
        estimatedMinutes: 45,
        risk: 'High' as any,
        createdAt: new Date(),
        attempts: 0,
      } as any;
      const config = {
        qualityGateThreshold: 90,
        coverageThreshold: 85,
        autoCommit: true,
        autoPush: false,
      };

      const prompt = buildTaskPrompt(task, config);

      expect(prompt).toContain('AUTO-CONTINUE v2.1');
      expect(prompt).toContain('Task Details');
      expect(prompt).toContain('tid');
      expect(prompt).toContain('Fix issue');
      expect(prompt).toContain('x.ts');
      // Priority numeric label and legend
      expect(prompt).toContain('Priority: 2'); // numeric
      expect(prompt).toContain('2=HIGH'); // legend
      expect(prompt).toContain('Quality Gate score ≥90');
      expect(prompt).toContain('coverage ≥85%');
    });
  });

  describe('mapPriority', () => {
    it('maps correctly', () => {
      expect(mapPriority(1)).toBe('CRITICAL');
      expect(mapPriority(2)).toBe('HIGH');
      expect(mapPriority(3)).toBe('MEDIUM');
      expect(mapPriority(4)).toBe('LOW');
      expect(mapPriority(99)).toBe('LOW');
    });
  });

  describe('assessRisk', () => {
    it('High for CRITICAL/HIGH violation', () => {
      const task = {
        type: 'VIOLATION_FIX',
        priority: 1,
        action: '',
        estimatedMinutes: 0,
        risk: 'Low',
        createdAt: new Date(),
        attempts: 0,
        module: '',
        expectedImpact: '',
      } as any;
      expect(assessRisk(task, null)).toBe('High');
    });

    it('Low for MEDIUM/LOW violation', () => {
      const task = {
        type: 'VIOLATION_FIX',
        priority: 3,
        action: '',
        estimatedMinutes: 0,
        risk: 'Low',
        createdAt: new Date(),
        attempts: 0,
        module: '',
        expectedImpact: '',
      } as any;
      expect(assessRisk(task, null)).toBe('Low');
    });

    it('Low for test/coverage/document actions', () => {
      const task = {
        type: 'PROACTIVE_IMPROVEMENT' as any,
        action: 'increase test coverage',
        estimatedMinutes: 60,
        risk: 'Medium',
        createdAt: new Date(),
        attempts: 0,
        module: '',
        expectedImpact: '',
      } as any;
      expect(assessRisk(task, null)).toBe('Low');
    });

    it('Low for coverage metrics', () => {
      const task = {
        type: 'PROACTIVE_IMPROVEMENT' as any,
        action: 'improve code coverage',
        estimatedMinutes: 30,
        risk: 'Medium',
        createdAt: new Date(),
        attempts: 0,
        module: '',
        expectedImpact: '',
      } as any;
      expect(assessRisk(task, null)).toBe('Low');
    });

    it('Low for documentation actions', () => {
      const task = {
        type: 'PROACTIVE_IMPROVEMENT' as any,
        action: 'update README',
        estimatedMinutes: 15,
        risk: 'Medium',
        createdAt: new Date(),
        attempts: 0,
        module: '',
        expectedImpact: '',
      } as any;
      expect(assessRisk(task, null)).toBe('Low');
    });

    it('Medium for other actions', () => {
      const task = {
        type: 'PROACTIVE_IMPROVEMENT' as any,
        action: 'refactor module',
        estimatedMinutes: 30,
        risk: 'Medium',
        createdAt: new Date(),
        attempts: 0,
        module: '',
        expectedImpact: '',
      } as any;
      expect(assessRisk(task, null)).toBe('Medium');
    });
  });
});
