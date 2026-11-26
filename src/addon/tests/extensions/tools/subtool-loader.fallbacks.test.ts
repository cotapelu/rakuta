import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mutable capture variables (not used in these tests but needed for mocks)
let capturedBashArgs: any = undefined;
let capturedReadArgs: any = undefined;
let capturedLsArgs: any = undefined;
let capturedFindArgs: any = undefined;
let capturedGrepArgs: any = undefined;

// Mock the pi-coding-agent SDK
vi.mock('@earendil-works/pi-coding-agent', () => ({
  createReadToolDefinition: vi.fn(() => ({
    execute: vi.fn().mockImplementation(async (id: string, args: any) => {
      capturedReadArgs = args;
      return { content: [{ type: 'text', text: 'read result' }] };
    })
  })),
  createLsToolDefinition: vi.fn(() => ({
    execute: vi.fn().mockImplementation(async (id: string, args: any) => {
      capturedLsArgs = args;
      return { content: [{ type: 'text', text: 'ls result' }] };
    })
  })),
  createFindToolDefinition: vi.fn(() => ({
    execute: vi.fn().mockImplementation(async (id: string, args: any) => {
      capturedFindArgs = args;
      return { content: [{ type: 'text', text: 'find result' }] };
    })
  })),
  createGrepToolDefinition: vi.fn(() => ({
    execute: vi.fn().mockImplementation(async (id: string, args: any) => {
      capturedGrepArgs = args;
      return { content: [{ type: 'text', text: 'grep result' }] };
    })
  })),
  createBashToolDefinition: vi.fn(() => ({
    execute: vi.fn().mockImplementation(async (id: string, args: any) => {
      capturedBashArgs = args;
      return { content: [{ type: 'text', text: 'bash result' }] };
    })
  })),
  Text: class Text { constructor(public text: string) {} },
}));

import { createSubLoaderToolDefinition } from '../../../extensions/tools/subtool-loader';
import {
  createReadToolDefinition,
  createLsToolDefinition,
  createFindToolDefinition,
  createGrepToolDefinition,
  createBashToolDefinition,
} from '@earendil-works/pi-coding-agent';
import type { ExtensionContext } from '@earendil-works/pi-coding-agent';

const CWD = '/test';
function makeCtx(cwd = CWD): ExtensionContext {
  // ctx.exec backs the http sub-tool (curl); default: success, no output
  return {
    cwd,
    exec: vi.fn().mockResolvedValue({ code: 0, stdout: '', stderr: '', killed: false })
  } as any;
}

describe('subtool-loader fallback handling', () => {
  let tool: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset captured args
    capturedBashArgs = undefined;
    capturedReadArgs = undefined;
    capturedLsArgs = undefined;
    capturedFindArgs = undefined;
    capturedGrepArgs = undefined;
    tool = createSubLoaderToolDefinition();
  });

  it('http returns the sub-tool stdout as content', async () => {
    const ctx = makeCtx();
    (ctx as any).exec.mockResolvedValue({ code: 0, stdout: 'sub-tool output', stderr: '', killed: false });
    const result: any = await tool.execute('call1', { subtool: 'http', args: { url: 'https://test' } }, null, () => {}, ctx);
    expect(result.isError).toBe(false);
    expect(result.content).toEqual([{ type: 'text', text: 'sub-tool output' }]);
    expect(result.details).toMatchObject({ url: 'https://test' });
  });

  it('http preserves sub-tool details and adds url/method/headers', async () => {
    const ctx = makeCtx();
    (ctx as any).exec.mockResolvedValue({ code: 0, stdout: 'ok', stderr: '', killed: false });
    const result: any = await tool.execute('call1', {
      subtool: 'http',
      args: { url: 'https://test', method: 'POST', headers: { X: 'y' } }
    }, null, () => {}, ctx);
    expect(result.isError).toBe(false);
    expect(result.content).toEqual([{ type: 'text', text: 'ok' }]);
    expect(result.details).toEqual({
      exitCode: 0,
      killed: false,
      url: 'https://test',
      method: 'POST',
      headers: { X: 'y' }
    });
  });

  it('read fallback when result.content undefined returns empty array', async () => {
    (createReadToolDefinition as any).mockImplementation(() => ({
      execute: vi.fn().mockResolvedValue({})
    }));
    const result: any = await tool.execute('call1', { subtool: 'read', args: { path: '/x' } }, null, () => {}, makeCtx());
    expect(result.isError).toBe(false);
    expect(result.content).toEqual([]);
  });

  it('ls fallback when result.isError undefined defaults to false', async () => {
    (createLsToolDefinition as any).mockImplementation(() => ({
      execute: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ls' }] })
    }));
    const result: any = await tool.execute('call1', { subtool: 'ls', args: {} }, null, () => {}, makeCtx());
    expect(result.isError).toBe(false); // default coalescing
  });
});
