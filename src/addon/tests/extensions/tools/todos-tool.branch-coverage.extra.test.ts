import { describe, it, expect } from 'vitest';
import { applyOp, type TodoPhase } from '../../../extensions/tools/todos-tool';

describe('todos-tool applyOp additional branch coverage (extra)', () => {
  const nextTid = 1, nextPid = 1;

  describe('add_phase status handling', () => {
    it('mixed valid and invalid statuses default invalid ones to pending', () => {
      const phases: TodoPhase[] = [];
      const result = applyOp(phases, nextTid, nextPid, {
        add_phase: {
          name: 'P1',
          tasks: [
            { content: 'T1', status: 'pending' },
            { content: 'T2', status: 'invalid' },
            { content: 'T3', status: 'in_progress' }
          ]
        }
      });
      expect(result.errors).toHaveLength(0);
      const statuses = result.phases[0].tasks.map(t => t.status).sort();
      // After normalization: one in_progress (the explicit one), two pending (the defaulted and explicit pending)
      expect(statuses).toEqual(['in_progress', 'pending', 'pending']);
    });
  });

  describe('update edge cases', () => {
    it('update with empty ids array yields no errors and triggers normalization', () => {
      const phases: TodoPhase[] = [{ id: 'phase-1', name: 'P1', tasks: [{ id: 'task-1', content: 'A', status: 'pending' }] }];
      const result = applyOp(phases, nextTid, nextPid, { update: { ids: [], status: 'completed' } });
      expect(result.errors).toHaveLength(0);
      // No update occurred; normalizeInProgress promotes single pending to in_progress
      expect(result.phases[0].tasks[0].status).toBe('in_progress');
    });
  });

  describe('remove_task isolation', () => {
    it('removes task only from the matching phase', () => {
      const phases: TodoPhase[] = [
        { id: 'p1', name: 'P1', tasks: [{ id: 't1', content: 'A', status: 'pending' }] },
        { id: 'p2', name: 'P2', tasks: [{ id: 't2', content: 'B', status: 'pending' }] }
      ];
      const result = applyOp(phases, nextTid, nextPid, { remove_task: { id: 't1' } });
      expect(result.errors).toHaveLength(0);
      expect(result.phases[0].tasks).toHaveLength(0);
      expect(result.phases[1].tasks).toHaveLength(1);
    });
  });

  describe('list operation', () => {
    it('returns phases unchanged', () => {
      const phases: TodoPhase[] = [{ id: 'p1', name: 'P1', tasks: [{ id: 't1', content: 'A', status: 'pending' }] }];
      const result = applyOp(phases, nextTid, nextPid, { list: {} });
      expect(result.errors).toHaveLength(0);
      expect(result.phases).toEqual(phases);
    });
  });
});
