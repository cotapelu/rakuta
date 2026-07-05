import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTodoTool, type ToolDefinition } from '../../../extensions/tools/todos-tool';
import type { ExtensionContext } from '@earendil-works/pi-coding-agent';

function makeMockApi() {
  return {
    on: vi.fn(),
    exec: vi.fn(),
    sendMessage: vi.fn(),
  };
}

function makeContext(cwd: string): ExtensionContext {
  return {
    cwd,
    ui: { setWidget: () => {} },
    on: () => {},
    exec: async () => ({}),
    diagnostics: { info: () => {}, warn: () => {}, error: () => {} },
    services: {
      authStorage: {},
      settingsManager: {},
      modelRegistry: {},
    },
    session: { sessionId: 'test' },
    sessionManager: { getBranch: () => [] },
  } as ExtensionContext;
}

describe('todos-tool save error handling (tool execute)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when fs.rename fails during add_phase', async () => {
    // Mock fs.rename to throw
    const fs = await import('node:fs');
    vi.spyOn(fs, 'rename').mockImplementation(async () => {
      throw new Error('disk full');
    });

    const cwd = '/test';
    const ctx = makeContext(cwd);
    const api = makeMockApi();
    const tool = createTodoTool(api) as ToolDefinition<any, any>;

    const result = await tool.execute('call1', { add_phase: { name: 'P1' } }, undefined, undefined, ctx);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/save failed|disk full/i);
    // storage should fallback to memory
    expect(result.details.storage).toBe('memory');
  });
});
