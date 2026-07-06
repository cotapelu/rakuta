/**
 * Unit tests for autonomous-engine/extension.ts (pure functions)
 * Focus: loadState, saveState, buildTaskPrompt, mapPriority, getStatePath
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'node:path';

// Mock node:fs using vi.mock with inline vi.fn
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  appendFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import * as fs from 'node:fs';

// Import after mocks are set up
import {
  loadState,
  saveState,
  buildTaskPrompt,
  mapPriority,
  defaultState,
  getStatePath,
} from '../../../extensions/autonomous-engine/extension';

const CWD = '/test/cwd';

describe('autonomous-engine/extension (pure)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStatePath', () => {
    it('returns .pi/autonomous-state.json inside cwd', () => {
      expect(getStatePath(CWD)).toBe(path.join(CWD, '.pi/autonomous-state.json'));
    });
  });

  describe('loadState', () => {
    it('returns defaultState when state file does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      const state = loadState(CWD);
      expect(state).toEqual(defaultState);
      expect(fs.existsSync).toHaveBeenCalledWith(path.join(CWD, '.pi/autonomous-state.json'));
    });

    it('returns defaultState when JSON parse throws (corrupted)', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('invalid json{');
      const state = loadState(CWD);
      expect(state).toEqual(defaultState);
    });

    it('loads and merges saved state correctly', () => {
      fs.existsSync.mockReturnValue(true);
      const saved = {
        ...defaultState,
        cycleCount: 5,
        tasksCompleted: 10,
        taskQueue: [{ id: 't1', type: 'VIOLATION_FIX' as const, priority: 1, module: 'm', action: 'a', expectedImpact: 'e', estimatedMinutes: 30, risk: 'Low', createdAt: new Date(), attempts: 0 }],
        config: { ...defaultState.config, enabled: false },
      };
      fs.readFileSync.mockReturnValue(JSON.stringify(saved));
      const state = loadState(CWD);
      expect(state.cycleCount).toBe(5);
      expect(state.tasksCompleted).toBe(10);
      expect(state.taskQueue).toHaveLength(1);
      expect(state.config.enabled).toBe(false);
      // Ensure other defaults are present
      expect(state.isRunning).toBe(defaultState.isRunning);
    });

    it('merges config with default config for missing fields', () => {
      fs.existsSync.mockReturnValue(true);
      const saved = { config: { enabled: true } };
      fs.readFileSync.mockReturnValue(JSON.stringify(saved));
      const state = loadState(CWD);
      expect(state.config.enabled).toBe(true);
      expect(state.config.discoveryInterval).toBe(defaultState.config.discoveryInterval);
    });
  });

  describe('saveState', () => {
    it('writes state JSON to file', () => {
      const state = { ...defaultState, cycleCount: 3 };
      saveState(CWD, state);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join(CWD, '.pi/autonomous-state.json'),
        JSON.stringify(state, null, 2)
      );
    });

    it('creates directory if not exists', () => {
      fs.existsSync.mockReturnValue(false);
      const state = defaultState;
      saveState(CWD, state);
      expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(CWD, '.pi'), { recursive: true });
    });

    it('does not create directory if exists', () => {
      fs.existsSync.mockReturnValue(true);
      saveState(CWD, defaultState);
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('buildTaskPrompt', () => {
    const baseTask = {
      id: 'task-123',
      type: 'VIOLATION_FIX' as const,
      priority: 2,
      module: 'src/foo.ts',
      action: 'Replace any with unknown',
      expectedImpact: 'Improve type safety',
      estimatedMinutes: 45,
      risk: 'Low',
      createdAt: new Date(),
      attempts: 0,
    };

    it('includes all required sections and task details', () => {
      const prompt = buildTaskPrompt(baseTask, defaultState.config);
      expect(prompt).toContain('# Autonomous Task Execution (AUTO-CONTINUE v2.1)');
      expect(prompt).toContain(`- ID: ${baseTask.id}`);
      expect(prompt).toContain(`- Type: ${baseTask.type}`);
      // Priority is shown as number plus legend
      expect(prompt).toContain(`Priority: 2`);
      expect(prompt).toContain('1=CRITICAL, 2=HIGH, 3=MEDIUM, 4=LOW');
      expect(prompt).toContain(`- Module: ${baseTask.module}`);
      expect(prompt).toContain(`- Action: ${baseTask.action}`);
      expect(prompt).toContain(`- Expected Impact: ${baseTask.expectedImpact}`);
      expect(prompt).toContain(`- Estimated Duration: ${baseTask.estimatedMinutes} minutes`);
      expect(prompt).toContain('## Workflow (MANDATORY)');
      expect(prompt).toContain('1. **ANALYZE**');
      expect(prompt).toContain('2. **CLARIFY**');
      expect(prompt).toContain('3. **PLAN**');
      expect(prompt).toContain('4. **TEST(FAIL)**');
      expect(prompt).toContain('All functions mental-tested');
      expect(prompt).toContain('Production Checklist');
      expect(prompt).toContain(`≥${defaultState.config.qualityGateThreshold}`);
      expect(prompt).toContain(`≥${defaultState.config.coverageThreshold}%`);
      expect(prompt).toContain('## Output Format');
      expect(prompt).toContain('===TASK_RESULT_START===');
      expect(prompt).toContain('RISK:');
      expect(prompt).toContain('COST:');
      expect(prompt).toContain('===');
    });
  });

  describe('mapPriority', () => {
    it('maps 1 to CRITICAL', () => {
      expect(mapPriority(1)).toBe('CRITICAL');
    });
    it('maps 2 to HIGH', () => {
      expect(mapPriority(2)).toBe('HIGH');
    });
    it('maps 3 to MEDIUM', () => {
      expect(mapPriority(3)).toBe('MEDIUM');
    });
    it('maps 4 to LOW', () => {
      expect(mapPriority(4)).toBe('LOW');
    });
    it('maps any other number to LOW', () => {
      expect(mapPriority(5)).toBe('LOW');
      expect(mapPriority(0)).toBe('LOW');
    });
  });
});
