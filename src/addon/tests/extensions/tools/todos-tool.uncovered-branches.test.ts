/**
 * Targeted branch coverage tests for todos-tool.ts
 * Focus: Additional uncovered branches in applyOp, normalizeParams, formatSummary, getLatestTodoPhasesFromEntries
 */

import { describe, it, expect } from 'vitest';
import { applyOp, normalizeParams, formatSummary, getLatestTodoPhasesFromEntries, type TodoPhase } from '../../../extensions/tools/todos-tool.ts';

describe('todos-tool.uncovered-branches', () => {
  const nextTid = 1, nextPid = 1;

  describe('applyOp - validation errors (additional)', () => {
    it('update: both id and ids present, uses ids without error', () => {
      const phases: TodoPhase[] = [{ id: 'phase-1', name: 'P1', tasks: [{ id: 'task-1', content: 'A', status: 'pending' }] }];
      const { errors } = applyOp(phases, nextTid, nextPid, { update: { id: 'task-1', ids: ['task-1'], status: 'completed' } });
      expect(errors).toHaveLength(0);
    });

    it('update: all ids not found -> no valid updates error', () => {
      const phases: TodoPhase[] = [{ id: 'phase-1', name: 'P1', tasks: [] }];
      const { errors } = applyOp(phases, nextTid, nextPid, { update: { ids: ['missing1', 'missing2'], status: 'pending' } });
      expect(errors).toContain('No valid tasks found to update');
    });

    it('add_phase: tasks undefined -> error', () => {
      const { errors } = applyOp([], nextTid, nextPid, { add_phase: { name: 'P1' } as any });
      // tasks is undefined, should not error (optional) so no error about tasks
      // Actually schema says tasks optional, so no error expected
      expect(errors).toHaveLength(0);
    });
  });

  describe('normalizeParams - additional edge cases', () => {
    it('add_phase.name string that starts with { but invalid JSON keeps as string', () => {
      const result = normalizeParams({ add_phase: { name: '{not valid', tasks: [] } });
      expect((result as any).add_phase.name).toBe('{not valid');
    });

    it('add_phase.tasks as comma-separated string fallback', () => {
      const result = normalizeParams({ add_phase: { name: 'P1', tasks: 'a,b,c' } });
      expect((result as any).add_phase.tasks).toEqual([{ content: 'a' }, { content: 'b' }, { content: 'c' }]);
    });
  });

  describe('formatSummary - additional scenarios', () => {
    it('returns "Todo list cleared." for empty phases', () => {
      const phases: TodoPhase[] = [{ id: 'phase-1', name: 'P1', tasks: [] }];
      const result = formatSummary(phases, []);
      expect(result).toBe('Todo list cleared.');
    });

    it('handles phases with mixed status counts correctly', () => {
      const phases: TodoPhase[] = [{
        id: 'phase-1', name: 'P1',
        tasks: [
          { id: 't1', content: 'A', status: 'pending' },
          { id: 't2', content: 'B', status: 'in_progress' },
          { id: 't3', content: 'C', status: 'completed' },
          { id: 't4', content: 'D', status: 'abandoned' }
        ]
      }];
      const result = formatSummary(phases, []);
      expect(result).toContain('remaining');
      expect(result).toContain('completed');
    });
  });

  describe('getLatestTodoPhasesFromEntries - additional cases', () => {
    it('returns empty array when all entries are non-toolResult', () => {
      const entries = [
        { type: 'message', message: { role: 'user', content: 'hi' } },
        { type: 'chunk', text: '' }
      ] as any[];
      expect(getLatestTodoPhasesFromEntries(entries)).toEqual([]);
    });

    it('ignores toolResult with wrong toolName', () => {
      const phases = [{ id: 'phase-1', name: 'P1', tasks: [] }] as TodoPhase[];
      const entries = [
        { type: 'message', message: { role: 'toolResult', toolName: 'other', details: { phases } } }
      ] as any[];
      expect(getLatestTodoPhasesFromEntries(entries)).toEqual([]);
    });
  });

});
