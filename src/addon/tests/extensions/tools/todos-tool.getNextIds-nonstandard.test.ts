import { describe, it, expect } from 'vitest';
import { TodoState } from '../../../extensions/tools/todos-tool';

describe('TodoState getNextIds with nonstandard IDs', () => {
  it('ignores non-matching IDs and computes next from matching ones', () => {
    const state = new TodoState();
    const phases = [
      { id: 'custom-phase', name: 'Custom', tasks: [] },
      { id: 'phase-2', name: 'Phase2', tasks: [{ id: 'task-5', content: 'T', status: 'pending' }] }
    ];
    state.replacePhases(phases);
    // phase-2 -> nextPhaseId = 3; task-5 -> nextTaskId = 6
    expect(state.nextPhaseId).toBe(3);
    expect(state.nextTaskId).toBe(6);
  });

  it('falls back to 1 when no standard IDs present', () => {
    const state = new TodoState();
    const phases = [
      { id: 'my-phase', name: 'My', tasks: [{ id: 'my-task', content: 'T', status: 'pending' }] }
    ];
    state.replacePhases(phases);
    expect(state.nextPhaseId).toBe(1);
    expect(state.nextTaskId).toBe(1);
  });
});
