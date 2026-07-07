import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the pi-coding-agent SDK
vi.mock('@earendil-works/pi-coding-agent', () => ({
  createReadToolDefinition: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'read result' }] })
  })),
  createLsToolDefinition: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ls result' }] })
  })),
  createFindToolDefinition: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'find result' }] })
  })),
  createGrepToolDefinition: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'grep result' }] })
  })),
  createBashToolDefinition: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'bash result' }] })
  })),
  Text: class Text { constructor(public text: string) {} },
}));

import { createSubLoaderToolDefinition } from '../../../extensions/tools/subtool-loader';
import type { ExtensionContext } from '@earendil-works/pi-coding-agent';
import { createReadToolDefinition } from '@earendil-works/pi-coding-agent';

const CWD = '/test';
function makeCtx(cwd = CWD): ExtensionContext {
  return { cwd } as any;
}

describe('subtool-loader caching', () => {
  let tool: any;

  beforeEach(() => {
    vi.clearAllMocks();
    tool = createSubLoaderToolDefinition();
  });

  it('caches tool instances for identical subtool calls', async () => {
    const args = { subtool: 'read', args: { path: '/some/file' } };
    const ctx = makeCtx();
    // First call should create tool
    await tool.execute('call1', args, null, () => {}, ctx);
    // Second identical call should reuse cached tool
    await tool.execute('call2', args, null, () => {}, ctx);
    // Verify that the createReadToolDefinition was called exactly once
    expect(createReadToolDefinition).toHaveBeenCalledTimes(1);
  });
});
