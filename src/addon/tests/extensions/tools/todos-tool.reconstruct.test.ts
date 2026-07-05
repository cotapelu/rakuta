import { describe, it, expect } from 'vitest';
import { TodoState } from '../../../extensions/tools/todos-tool';

function makeToolResult(phases: any[], isError?: boolean): any {
  return {
    type: 'message',
    message: {
      role: 'toolResult',
      toolName: 'todos',
      details: { phases },
      isError: isError || false
    }
  };
}

describe('TodoState reconstructFromEntries', () => {
  it('reconstructs from a valid toolResult entry', () => {
    const state = new TodoState();
    const phases = [{ id: 'p1', name: 'P1', tasks: [{ id: 't1', content: 'A', status: 'pending' }] }];
    const entries = [
      { type: 'message', message: { role: 'user', content: 'hi' } },
      makeToolResult(phases),
    ];
    const found = state.reconstructFromEntries(entries);
    expect(found).toBe(true);
    expect(state.phases).toEqual(phases);
  });

  it('skips non-message entries', () => {
    const state = new TodoState();
    const phases = [{ id: 'p1', name: 'P1', tasks: [] }];
    const entries: any[] = [
      { type: 'event', payload: {} },
      makeToolResult(phases),
    ];
    const found = state.reconstructFromEntries(entries);
    expect(found).toBe(true);
    expect(state.phases).toEqual(phases);
  });

  it('skips entries with role not toolResult', () => {
    const state = new TodoState();
    const phases = [{ id: 'p1', name: 'P1', tasks: [] }];
    const entries: any[] = [
      { type: 'message', message: { role: 'assistant', content: '...' } },
      makeToolResult(phases),
    ];
    const found = state.reconstructFromEntries(entries);
    expect(found).toBe(true);
    expect(state.phases).toEqual(phases);
  });

  it('skips entries with details but no phases', () => {
    const state = new TodoState();
    const entries: any[] = [
      makeToolResult([{ id: 'p1', name: 'P1', tasks: [] }]),
      { type: 'message', message: { role: 'toolResult', toolName: 'todos', details: { error: 'oops' } } },
    ];
    const found = state.reconstructFromEntries(entries);
    expect(found).toBe(true);
    // First entry with phases is chosen
    expect(state.phases).toEqual([{ id: 'p1', name: 'P1', tasks: [] }]);
  });

  it('returns false when no valid entries', () => {
    const state = new TodoState();
    const entries = [
      { type: 'message', message: { role: 'user', content: 'hi' } },
      { type: 'message', message: { role: 'assistant', content: '...' } },
    ];
    const found = state.reconstructFromEntries(entries);
    expect(found).toBe(false);
    expect(state.phases).toEqual([]);
  });

  it('chooses the latest valid toolResult (reverse iteration)', () => {
    const state = new TodoState();
    const phases1 = [{ id: 'p1', name: 'P1', tasks: [{ id: 't1', content: 'A', status: 'pending' }] }];
    const phases2 = [{ id: 'p2', name: 'P2', tasks: [{ id: 't2', content: 'B', status: 'pending' }] }];
    const entries = [
      makeToolResult(phases1),
      { type: 'message', message: { role: 'user', content: 'ignore' } },
      makeToolResult(phases2),
    ];
    const found = state.reconstructFromEntries(entries);
    expect(found).toBe(true);
    expect(state.phases).toEqual(phases2);
  });

  it('accepts toolName "todo_write" as valid', () => {
    const state = new TodoState();
    const phases = [{ id: 'p1', name: 'P1', tasks: [{ id: 't1', content: 'A', status: 'pending' }] }];
    const entries: any[] = [
      { type: 'message', message: { role: 'toolResult', toolName: 'todo_write', details: { phases } } },
    ];
    const found = state.reconstructFromEntries(entries);
    expect(found).toBe(true);
    expect(state.phases).toEqual(phases);
  });
});
