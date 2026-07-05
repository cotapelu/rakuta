import { describe, it, expect } from 'vitest';
import { applyOp, formatSummary, type TodoPhase } from '../../../extensions/tools/todos-tool';

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

  describe('normalizeInProgress via update', () => {
    it('does not promote any task when all are completed', () => {
      const phases: TodoPhase[] = [{ id: 'p1', name: 'P1', tasks: [
        { id: 't1', content: 'A', status: 'completed' },
        { id: 't2', content: 'B', status: 'completed' }
      ]}];
      const nextTid = 3, nextPid = 1;
      const result = applyOp(phases, nextTid, nextPid, { update: { id: 't1', content: 'A-modified' } });
      expect(result.errors).toHaveLength(0);
      const statuses = result.phases[0].tasks.map(t => t.status);
      expect(statuses).toEqual(['completed', 'completed']);
    });
  });

  describe('normalizeInProgress with multiple in_progress tasks', () => {
    it('demotes extra in_progress tasks to pending, leaving exactly one in_progress', () => {
      const phases: TodoPhase[] = [
        {
          id: 'phase-1',
          name: 'Phase 1',
          tasks: [
            { id: 'task-1', content: 'A', status: 'in_progress' },
            { id: 'task-2', content: 'B', status: 'in_progress' },
            { id: 'task-3', content: 'C', status: 'pending' }
          ]
        }
      ];
      const nextTid = 4, nextPid = 2;
      // Use update on a pending task to trigger normalization without altering in_progress tasks
      const result = applyOp(phases, nextTid, nextPid, { update: { id: 'task-3', content: 'C-modified' } });
      expect(result.errors).toHaveLength(0);
      const tasks = result.phases[0].tasks;
      const inProgCount = tasks.filter(t => t.status === 'in_progress').length;
      const pendingCount = tasks.filter(t => t.status === 'pending').length;
      expect(inProgCount).toBe(1);
      expect(pendingCount).toBe(2);
      // The first in_progress (task-1) remains in_progress; the second (task-2) demoted to pending
      const t1 = tasks.find(t => t.id === 'task-1');
      const t2 = tasks.find(t => t.id === 'task-2');
      expect(t1?.status).toBe('in_progress');
      expect(t2?.status).toBe('pending');
    });
  });

  describe('applyOp fallthrough error', () => {
    it('returns error when no operation specified', () => {
      const phases: TodoPhase[] = [];
      const result = applyOp(phases, 1, 1, {});
      expect(result.errors).toContain('No operation specified');
    });
  });

  describe('formatSummary errors', () => {
    it('includes errors in output when errors present', () => {
      const phases: TodoPhase[] = [{ id: 'p1', name: 'P1', tasks: [] }];
      const text = formatSummary(phases, ['oops']);
      expect(text).toContain('Errors: oops');
    });
  });
});
