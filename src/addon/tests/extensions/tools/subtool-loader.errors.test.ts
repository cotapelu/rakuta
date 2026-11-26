import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the pi-coding-agent SDK with bash tool throwing
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
    execute: vi.fn().mockImplementation(async () => {
      throw new Error('bash failed');
    })
  })),
  Text: class Text { constructor(public text: string) {} },
}));

import { createSubLoaderToolDefinition } from '../../../extensions/tools/subtool-loader';
import type { ExtensionContext } from '@earendil-works/pi-coding-agent';

const CWD = '/test';
function makeCtx(cwd = CWD): ExtensionContext {
  // The http sub-tool shells out via ctx.exec; simulate a transport failure
  return { cwd, exec: vi.fn().mockRejectedValue(new Error('network down')) } as any;
}

describe('subtool-loader error handling', () => {
  let tool: any;

  beforeEach(() => {
    tool = createSubLoaderToolDefinition();
  });

  it('returns error if the http sub-tool transport throws', async () => {
    const result = await tool.execute('call1', { subtool: 'http', args: { url: 'https://example.com' } }, null, () => {}, makeCtx());
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('network down');
  });
});
