import { describe, it, expect } from 'vitest';
import { normalizeParams } from '../../../extensions/tools/todos-tool.ts';

describe('todos-tool normalizeParams branch coverage', () => {
  it('parses add_phase.tasks as comma-separated string when not JSON', () => {
    const result = normalizeParams({
      add_phase: { name: 'P1', tasks: 't1,t2,t3' }
    });
    expect(result.add_phase).toEqual({
      name: 'P1',
      tasks: [{ content: 't1' }, { content: 't2' }, { content: 't3' }]
    });
  });

  it('keeps original add_phase.name if JSON parse fails', () => {
    const result = normalizeParams({
      add_phase: { name: '{ invalid json', tasks: [] }
    });
    expect(result.add_phase.name).toBe('{ invalid json');
  });

  it('parses add_phase as JSON string successfully', () => {
    const result = normalizeParams({
      add_phase: '{"name":"P1","tasks":[{"content":"T1"}]}'
    });
    expect(result.add_phase).toEqual({ name: 'P1', tasks: [{ content: 'T1' }] });
  });

  // --- New tests for missing branches ---

  describe('stringified top-level params', () => {
    it('parses a global JSON string into object', () => {
      const result = normalizeParams('{"add_task":{"phase":"p1","content":"C"}}');
      expect(result.add_task).toEqual({ phase: 'p1', content: 'C' });
    });

    it('throws when params is a non-JSON string', () => {
      expect(() => normalizeParams('not json')).toThrow('Invalid JSON string');
    });

    it('throws when params is non-object (number)', () => {
      // @ts-ignore
      expect(() => normalizeParams(123)).toThrow('Parameters must be an object');
    });

    it('throws when params is null', () => {
      // @ts-ignore
      expect(() => normalizeParams(null)).toThrow('Parameters must be an object');
    });
  });

  describe('add_phase.name JSON replacement branch', () => {
    it('replaces add_phase with parsed JSON when name is a JSON object string', () => {
      const result = normalizeParams({
        add_phase: { name: '{"name":"P2","tasks":[{"content":"T2"}]}', tasks: [] }
      });
      expect(result.add_phase).toEqual({ name: 'P2', tasks: [{ content: 'T2' }] });
    });
  });

  describe('add_phase.tasks as valid JSON string', () => {
    it('parses tasks string as JSON array when valid', () => {
      const result = normalizeParams({
        add_phase: { name: 'P3', tasks: '[{"content":"T3"}]' }
      });
      expect(result.add_phase).toEqual({ name: 'P3', tasks: [{ content: 'T3' }] });
    });
  });

  describe('stringified operations', () => {
    it('parses add_task as JSON string', () => {
      const result = normalizeParams({ add_task: '{"phase":"p1","content":"A"}' });
      expect(result.add_task).toEqual({ phase: 'p1', content: 'A' });
    });

    it('throws on add_task string that is not valid JSON', () => {
      expect(() => normalizeParams({ add_task: 'not json' })).toThrow('add_task must be an object');
    });

    it('parses update as JSON string', () => {
      const result = normalizeParams({ update: '{"id":"t1","status":"completed"}' });
      expect(result.update).toEqual({ id: 't1', status: 'completed' });
    });

    it('throws on update string that is not valid JSON', () => {
      expect(() => normalizeParams({ update: 'invalid' })).toThrow('update must be an object');
    });

    it('parses remove_task as JSON string', () => {
      const result = normalizeParams({ remove_task: '{"id":"t1"}' });
      expect(result.remove_task).toEqual({ id: 't1' });
    });

    it('throws on remove_task string that is not valid JSON', () => {
      expect(() => normalizeParams({ remove_task: 'no json' })).toThrow('remove_task must be an object');
    });

    it('parses delete as JSON string', () => {
      const result = normalizeParams({ delete: '{}' });
      expect(result.delete).toEqual({});
    });

    it('throws on delete string that is not valid JSON', () => {
      expect(() => normalizeParams({ delete: 'xxx' })).toThrow('delete must be an object');
    });
  });
});
