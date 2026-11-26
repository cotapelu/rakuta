import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mutable capture variables for args passed to tool executes
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
  Text: class Text { constructor(public text: string) {} },
}));

import {
  createSubLoaderToolDefinition,
} from '../../../extensions/tools/subtool-loader';
import {
  createReadToolDefinition,
  createLsToolDefinition,
  createFindToolDefinition,
  createGrepToolDefinition,
} from '@earendil-works/pi-coding-agent';
import type { ExtensionContext } from '@earendil-works/pi-coding-agent';

const CWD = '/test';

function makeCtx(cwd = CWD): ExtensionContext {
  // exec is the runtime shell used by the http sub-tool (curl argv)
  return { cwd, exec: vi.fn().mockResolvedValue({ code: 0, stdout: 'ok', stderr: '' }) } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  capturedReadArgs = undefined;
  capturedLsArgs = undefined;
  capturedFindArgs = undefined;
  capturedGrepArgs = undefined;
});

describe('subtool-loader', () => {
  let tool: any;

  beforeEach(() => {
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
    expect(result.content[0].text).toContain('http, ls, find, grep, read');
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

    it('success for valid http url, delegates to http sub-tool (GET argv)', async () => {
      const ctx = makeCtx();
      const result = await tool.execute('call1', { subtool: 'http', args: { url: 'https://example.com' } }, null, () => {}, ctx);
      expect(result.isError).toBe(false);
      const [cmd, argv] = (ctx as any).exec.mock.calls[0];
      expect(cmd).toBe('curl');
      expect(argv).toContain('https://example.com');
      expect(argv).toContain('--max-time');
    });

    it('includes -X method when not GET', async () => {
      const ctx = makeCtx();
      const result = await tool.execute('call1', { subtool: 'http', args: { url: 'https://example.com', method: 'POST' } }, null, () => {}, ctx);
      expect(result.isError).toBe(false);
      const [, argv] = (ctx as any).exec.mock.calls[0];
      expect(argv).toContain('-X');
      expect(argv).toContain('POST');
    });

    it('includes -H headers when provided', async () => {
      const ctx = makeCtx();
      const result = await tool.execute('call1', { subtool: 'http', args: { url: 'https://example.com', headers: { 'Content-Type': 'application/json', 'X-Api-Key': '123' } } }, null, () => {}, ctx);
      expect(result.isError).toBe(false);
      const [, argv] = (ctx as any).exec.mock.calls[0];
      expect(argv).toContain('-H');
      expect(argv).toContain('Content-Type: application/json');
      expect(argv).toContain('X-Api-Key: 123');
    });

    it('sends POST body via temp file (--data @file)', async () => {
      const ctx = makeCtx();
      const result = await tool.execute('call1', { subtool: 'http', args: { url: 'https://example.com', method: 'POST', body: 'hello world' } }, null, () => {}, ctx);
      expect(result.isError).toBe(false);
      const [, argv] = (ctx as any).exec.mock.calls[0];
      expect(argv).toContain('--data');
      expect(argv.some((a: string) => a.startsWith('@'))).toBe(true);
    });

    it('http result details contain url, method, headers (plus sub-tool exit info)', async () => {
      const result = await tool.execute('call1', { subtool: 'http', args: { url: 'https://example.com', method: 'POST', headers: { 'X-Test': 'yes' } } }, null, () => {}, makeCtx());
      expect(result.isError).toBe(false);
      expect(result.details).toEqual({
        exitCode: 0,
        url: 'https://example.com',
        method: 'POST',
        headers: { 'X-Test': 'yes' },
      });
    });
  });

  describe('other subtools pass-through', () => {
    it('read passes args to SDK tool and returns its content', async () => {
      const result = await tool.execute('call1', { subtool: 'read', args: { path: '/etc/passwd' } }, null, () => {}, makeCtx());
      expect(result.isError).toBe(false);
      expect(result.content).toEqual([{ type: 'text', text: 'read result' }]);
      expect(capturedReadArgs).toEqual({ path: '/etc/passwd' });
    });

    it('ls passes args to SDK tool', async () => {
      const result = await tool.execute('call1', { subtool: 'ls', args: { path: '/tmp', all: true } }, null, () => {}, makeCtx());
      expect(result.isError).toBe(false);
      expect(result.content).toEqual([{ type: 'text', text: 'ls result' }]);
      expect(capturedLsArgs).toEqual({ path: '/tmp', all: true });
    });

    it('find passes args to SDK tool', async () => {
      const result = await tool.execute('call1', { subtool: 'find', args: { pattern: '*.ts', path: '/src' } }, null, () => {}, makeCtx());
      expect(result.isError).toBe(false);
      expect(result.content).toEqual([{ type: 'text', text: 'find result' }]);
      expect(capturedFindArgs).toEqual({ pattern: '*.ts', path: '/src' });
    });

    it('grep passes args to SDK tool', async () => {
      const result = await tool.execute('call1', { subtool: 'grep', args: { pattern: 'TODO', path: '/src', limit: 10, glob: '*.ts' } }, null, () => {}, makeCtx());
      expect(result.isError).toBe(false);
      expect(result.content).toEqual([{ type: 'text', text: 'grep result' }]);
      expect(capturedGrepArgs).toEqual({ pattern: 'TODO', path: '/src', limit: 10, glob: '*.ts' });
    });
  });

  it('catches error from SDK tool and returns isError for read', async () => {
    // Override createReadToolDefinition to reject
    (createReadToolDefinition as any).mockImplementation(() => ({
      execute: vi.fn().mockRejectedValue(new Error('read failed'))
    }));
    const result = await tool.execute('call1', { subtool: 'read', args: { path: '/x' } }, null, () => {}, makeCtx());
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('read failed');
  });

  it('caches tool definitions in the same context (factory called once for multiple uses)', async () => {
    // Execute same subtool twice
    const ctx = makeCtx();
    const tool1 = createSubLoaderToolDefinition();
    await tool1.execute('id1', { subtool: 'read', args: { path: '/first' } }, null, () => {}, ctx);
    await tool1.execute('id2', { subtool: 'read', args: { path: '/second' } }, null, () => {}, ctx);
    // Factory should have been called only once (the second call used cached tool)
    expect(createReadToolDefinition).toHaveBeenCalledTimes(1);
  });
});
