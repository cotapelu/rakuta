import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock node:fs writeFile to throw
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      writeFile: vi.fn().mockRejectedValue(new Error('disk full')),
    },
  };
});

import { createTodoTool } from '../../../extensions/tools/todos-tool';
import type { ExtensionContext } from '@earendil-works/pi-coding-agent';

describe('todos-tool write error handling', () => {
  let api: any;
  let ctx: ExtensionContext;
  let tool: any;

  beforeEach(() => {
    api = {
      on: vi.fn(),
      sendMessage: vi.fn().mockResolvedValue(undefined),
    };
    ctx = {
      cwd: process.cwd(),
      sessionManager: { getBranch: () => [] },
    } as any;
    tool = createTodoTool(api);
  });

  it('returns error when fs.writeFile fails', async () => {
    const result = await tool.execute('test', { add_phase: { name: 'P1' } }, undefined, undefined, ctx);
    expect(result.isError).toBe(true);
    expect(result.details?.storage).toBe('memory');
    expect(result.content[0].text).toContain('Save failed');
    expect(result.details?.error).toContain('disk full');
  });
});
