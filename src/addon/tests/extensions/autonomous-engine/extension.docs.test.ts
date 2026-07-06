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
  updateEvolutionDocs,
  updateAgentProfile,
  defaultState,
} from '../../../extensions/autonomous-engine/extension';
import type { TaskQueueItem, EngineState } from '../../../extensions/autonomous-engine/types';

const CWD = '/test/cwd';
const EVOL_PATH = path.join(CWD, 'docs/EVOLUTION.md');
const PROFILE_PATH = path.join(CWD, 'docs/AGENT_PROFILE.md');

describe('autonomous-engine/extension.docs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fs.existsSync.mockReturnValue(false);
  });

  const baseTask = (overrides: Partial<TaskQueueItem> = {}): TaskQueueItem => ({
    id: 'task-1',
    type: 'VIOLATION_FIX',
    priority: 2,
    module: 'src/foo.ts',
    action: 'Fix something',
    expectedImpact: 'Impact',
    estimatedMinutes: 30,
    risk: 'Low',
    createdAt: new Date(),
    attempts: 0,
    ...overrides,
  });

  describe('updateEvolutionDocs', () => {
    it('creates new file when none exists and adds trajectory for PROACTIVE_IMPROVEMENT', () => {
      const state: EngineState = { ...defaultState, cycleCount: 5 };
      const task = baseTask({ type: 'PROACTIVE_IMPROVEMENT' });
      const now = new Date();
      vi.useFakeTimers({ now });
      updateEvolutionDocs(CWD, state, task, true);
      vi.useRealTimers();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        EVOL_PATH,
        expect.stringContaining(`"lastUpdate": "${now.toISOString()}"`)
      );
      const written = fs.writeFileSync.mock.calls[0][1];
      const parsed = JSON.parse(written);
      expect(parsed.trajectory).toHaveLength(1);
      expect(parsed.trajectory[0].task).toBe(task.action);
    });

    it('does not add trajectory if success is false', () => {
      const state: EngineState = { ...defaultState, cycleCount: 1 };
      const task = baseTask({ type: 'PROACTIVE_IMPROVEMENT' });
      const now = new Date();
      vi.useFakeTimers({ now });
      updateEvolutionDocs(CWD, state, task, false);
      vi.useRealTimers();

      const written = fs.writeFileSync.mock.calls[0][1];
      const parsed = JSON.parse(written);
      expect(parsed.trajectory).toHaveLength(0);
    });

    it('does not add trajectory if task type is not PROACTIVE_IMPROVEMENT', () => {
      const state: EngineState = { ...defaultState, cycleCount: 1 };
      const task = baseTask({ type: 'VIOLATION_FIX' });
      const now = new Date();
      vi.useFakeTimers({ now });
      updateEvolutionDocs(CWD, state, task, true);
      vi.useRealTimers();

      const written = fs.writeFileSync.mock.calls[0][1];
      const parsed = JSON.parse(written);
      expect(parsed.trajectory).toHaveLength(0);
    });

    it('truncates trajectory to 50 entries', () => {
      // Simulate existing file with 45 entries
      const existingTrajectory = Array.from({ length: 45 }, (_, i) => ({
        cycle: i,
        task: `task${i}`,
        module: 'm',
        impact: 'i',
        timestamp: new Date().toISOString(),
      }));
      const existing = { lastUpdate: new Date().toISOString(), trajectory: existingTrajectory, upcoming: [] };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(existing));

      const state: EngineState = { ...defaultState, cycleCount: 100 };
      const task = baseTask({ type: 'PROACTIVE_IMPROVEMENT' });
      const now = new Date();
      vi.useFakeTimers({ now });
      updateEvolutionDocs(CWD, state, task, true);
      vi.useRealTimers();

      const written = fs.writeFileSync.mock.calls[0][1];
      const parsed = JSON.parse(written);
      // Should have original 45 + 1 new = 46, which is <= 50
      expect(parsed.trajectory).toHaveLength(46);
    });

    it('handles corrupted JSON by ignoring and starting fresh', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('invalid json{');
      const state: EngineState = { ...defaultState, cycleCount: 1 };
      const task = baseTask({ type: 'PROACTIVE_IMPROVEMENT' });
      const now = new Date();
      vi.useFakeTimers({ now });
      updateEvolutionDocs(CWD, state, task, true);
      vi.useRealTimers();

      expect(fs.writeFileSync).toHaveBeenCalled();
      const written = fs.writeFileSync.mock.calls[0][1];
      const parsed = JSON.parse(written);
      expect(parsed.trajectory).toHaveLength(1); // new entry only, not crash
    });
  });

  describe('updateAgentProfile', () => {
    it('creates new profile file if none exists on failure', () => {
      const task = baseTask();
      const now = new Date();
      vi.useFakeTimers({ now });
      updateAgentProfile(CWD, task, false, 'Test failure');
      vi.useRealTimers();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        PROFILE_PATH,
        expect.stringContaining('"weaknesses"')
      );
      const written = fs.writeFileSync.mock.calls[0][1];
      const parsed = JSON.parse(written);
      expect(parsed.weaknesses).toHaveLength(1);
      expect(parsed.weaknesses[0].reason).toBe('Test failure');
    });

    it('does not add weakness if success', () => {
      const task = baseTask();
      const now = new Date();
      vi.useFakeTimers({ now });
      updateAgentProfile(CWD, task, true);
      vi.useRealTimers();

      const written = fs.writeFileSync.mock.calls[0][1];
      const parsed = JSON.parse(written);
      expect(parsed.weaknesses).toHaveLength(0);
    });

    it('does not add weakness if failure but no reason provided', () => {
      const task = baseTask();
      const now = new Date();
      vi.useFakeTimers({ now });
      updateAgentProfile(CWD, task, false); // no failureReason
      vi.useRealTimers();

      const written = fs.writeFileSync.mock.calls[0][1];
      const parsed = JSON.parse(written);
      expect(parsed.weaknesses).toHaveLength(0);
    });

    it('truncates weaknesses to 50 entries', () => {
      const existingWeaknesses = Array.from({ length: 45 }, (_, i) => ({
        taskId: `t${i}`,
        module: 'm',
        action: 'a',
        reason: 'r',
        timestamp: new Date().toISOString(),
      }));
      const existing = { weaknesses: existingWeaknesses, fragileModules: [], errorProneStacks: [], highCostChanges: [] };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(existing));

      const task = baseTask();
      const now = new Date();
      vi.useFakeTimers({ now });
      updateAgentProfile(CWD, task, false, 'new failure');
      vi.useRealTimers();

      const written = fs.writeFileSync.mock.calls[0][1];
      const parsed = JSON.parse(written);
      expect(parsed.weaknesses).toHaveLength(46); // 45+1 (<=50)
    });

    it('handles corrupted profile JSON gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('corrupt');
      const task = baseTask();
      const now = new Date();
      vi.useFakeTimers({ now });
      updateAgentProfile(CWD, task, false, 'fail');
      vi.useRealTimers();

      expect(fs.writeFileSync).toHaveBeenCalled();
      const written = fs.writeFileSync.mock.calls[0][1];
      const parsed = JSON.parse(written);
      expect(parsed.weaknesses).toHaveLength(1);
    });
  });
});
