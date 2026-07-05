import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTodoTool } from '../../../extensions/tools/todos-tool';

describe('todos-tool multiple operations error', () => {
  let api: any;
  let tool: any;
  const cwd = '/test';

  beforeEach(() => {
    api = { on: vi.fn(), exec: vi.fn(), sendMessage: vi.fn() };
    tool = createTodoTool(api);
  });

  it('returns error when multiple operations specified', async () => {
    const result = await tool.execute('call', {
      add_phase: { name: 'P1' },
      add_task: { phase: 'phase-1', content: 'T' }
    }, undefined, undefined, { cwd });
    expect(result.isError).toBe(true);
    expect(result.details?.error).toContain('Multiple operations detected');
  });
});
