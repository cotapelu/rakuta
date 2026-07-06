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
  updateAgentProfile,
  updateEvolutionDocs,
} from '../../../extensions/autonomous-engine/extension';
import type { TaskQueueItem } from '../../../extensions/autonomous-engine/types';

const CWD = '/test/cwd';
const PROFILE_PATH = path.join(CWD, 'docs/AGENT_PROFILE.md');
const EVOLUTION_PATH = path.join(CWD, 'docs/EVOLUTION.md');

function createTask(overrides: Partial<TaskQueueItem> = {}): TaskQueueItem {
  return {
    id: 't1',
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

describe('extension docs update error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fs.existsSync.mockReturnValue(false);
  });

  describe('updateAgentProfile', () => {
    it('catches and logs error when writeFileSync throws', () => {
      const task = createTask();
      (fs.writeFileSync as any).mockImplementation(() => { throw new Error('disk full'); });
      // Should not throw
      expect(() => updateAgentProfile(CWD, task, false, 'fail')).not.toThrow();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('handles readFileSync throw gracefully', () => {
      // Simulate existing file but corrupted
      fs.existsSync.mockReturnValue(true);
      (fs.readFileSync as any).mockImplementation(() => { throw new Error('corrupt'); });
      const task = createTask();
      // Should not throw
      expect(() => updateAgentProfile(CWD, task, false, 'fail')).not.toThrow();
    });
  });

  describe('updateEvolutionDocs', () => {
    it('catches and logs error when writeFileSync throws', () => {
      const state = { cycleCount: 1 } as any;
      const task = createTask({ type: 'PROACTIVE_IMPROVEMENT' });
      (fs.writeFileSync as any).mockImplementation(() => { throw new Error('disk full'); });
      expect(() => updateEvolutionDocs(CWD, state, task, true)).not.toThrow();
    });

    it('handles readFileSync error gracefully', () => {
      const state = { cycleCount: 1 } as any;
      const task = createTask({ type: 'PROACTIVE_IMPROVEMENT' });
      fs.existsSync.mockReturnValue(true);
      (fs.readFileSync as any).mockImplementation(() => { throw new Error('corrupt'); });
      expect(() => updateEvolutionDocs(CWD, state, task, true)).not.toThrow();
    });
  });
});
