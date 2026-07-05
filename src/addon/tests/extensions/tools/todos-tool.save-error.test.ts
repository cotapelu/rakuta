import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTodoTool } from '../../../extensions/tools/todos-tool';
import type { ExtensionContext } from '@earendil-works/pi-coding-agent';

// Mock node:fs rename (both sync and promises) to throw
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  const renameMock = vi.fn().mockRejectedValue(new Error('disk full'));
  return {
    ...actual,
    rename: renameMock,
    promises: {
      ...actual.promises,
      rename: renameMock,
    },
  };
});

describe('todos-tool save error handling (tool execute)', () => {
  let api: any;
  let ctx: ExtensionContext;
  let tool: ReturnType<typeof createTodoTool>;

  beforeEach(() => {
    api = {
      on: vi.fn(),
      sendMessage: vi.fn().mockResolvedValue(undefined),
    };
    ctx = {
      cwd: process.cwd(),
      sessionManager: {
        getBranch: () => [],
      },
    } as any;
    tool = createTodoTool(api);
  });

  it('returns error when fs.rename fails during add_phase', async () => {
    const result = await tool.execute('test', { add_phase: { name: 'P1', tasks: [{ content: 'T1' }] } }, undefined, undefined, ctx);
    expect(result.isError).toBe(true);
    expect(result.details?.storage).toBe('memory');
    // The error summary should include Save failed
    const summary = result.content[0].text;
    expect(summary).toMatch(/Save failed/);
    // The details.error should contain our mocked message
    expect(result.details?.error).toContain('disk full');
  });
});
