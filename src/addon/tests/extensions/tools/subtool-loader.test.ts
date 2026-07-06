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
  // Minimal Text for renderCall (not tested)
  Text: class Text { constructor(public text: string) {} },
}));

import {
  createSubLoaderToolDefinition,
} from '../../../extensions/tools/subtool-loader';
import type { ExtensionContext } from '@earendil-works/pi-coding-agent';

const CWD = '/test';

function makeCtx(cwd = CWD): ExtensionContext {
  return { cwd } as any;
}

describe('subtool-loader', () => {
  let tool: any;

  beforeEach(() => {
    vi.clearAllMocks();
    tool = createSubLoaderToolDefinition();
  });

  it('returns error if subtool missing', async () => {
    const result = await tool.execute('call1', { subtool: '' as any, args: {} }, null, () => {}, makeCtx());
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Missing required parameter: subtool');
  });

  it('returns error for unknown subtool', async () => {
    const result = await tool.execute('call1', { subtool: 'unknown', args: {} }, null, () => {}, makeCtx());
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown sub-tool');
  });

  describe('http subtool validation', () => {
    it('error if url missing', async () => {
      const result = await tool.execute('call1', { subtool: 'http', args: {} }, null, () => {}, makeCtx());
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required parameter: url');
    });

    it('error if url invalid', async () => {
      const result = await tool.execute('call1', { subtool: 'http', args: { url: 'not a url' } }, null, () => {}, makeCtx());
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid URL');
    });

    it('success for valid http url', async () => {
      const result = await tool.execute('call1', { subtool: 'http', args: { url: 'https://example.com' } }, null, () => {}, makeCtx());
      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');
    });
  });

  // Skipping caching test due to require/mocking limitations
});
