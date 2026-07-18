import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the pi-coding-agent SDK
vi.mock('@earendil-works/pi-coding-agent', () => ({
  createReadToolDefinition: vi.fn(() => ({
    execute: vi.fn().mockImplementation(async (id: string, args: any) => ({
      content: [{ type: 'text', text: 'read result' }]
    }))
  })),
  createLsToolDefinition: vi.fn(() => ({
    execute: vi.fn().mockImplementation(async (id: string, args: any) => ({
      content: [{ type: 'text', text: 'ls result' }]
    }))
  })),
  createFindToolDefinition: vi.fn(() => ({
    execute: vi.fn().mockImplementation(async (id: string, args: any) => ({
      content: [{ type: 'text', text: 'find result' }]
    }))
  })),
  createGrepToolDefinition: vi.fn(() => ({
    execute: vi.fn().mockImplementation(async (id: string, args: any) => ({
      content: [{ type: 'text', text: 'grep result' }]
    }))
  })),
  createBashToolDefinition: vi.fn(() => ({
    execute: vi.fn().mockImplementation(async (id: string, args: any) => ({
      content: [{ type: 'text', text: 'bash result' }]
    }))
  })),
  Text: class Text { constructor(public text: string) {} },
}));

import { createSubLoaderToolDefinition } from '../../../extensions/tools/subtool-loader';
import type { ExtensionContext } from '@earendil-works/pi-coding-agent';

const CWD = '/test';
function makeCtx(cwd = CWD): ExtensionContext {
  return { cwd } as any;
}

describe('subtool-loader renderCall', () => {
  let tool: any;

  beforeEach(() => {
    vi.clearAllMocks();
    tool = createSubLoaderToolDefinition();
  });

  it('renders "unknown" when args is undefined', () => {
    const out: any = tool.renderCall(undefined as any, {} as any, {} as any);
    expect(out.text).toBe('subtool_loader → unknown');
  });

  it('renders subtool and up to two arg previews', () => {
    const out: any = tool.renderCall(
      { subtool: 'read', args: { path: '/a', maxLines: 100, extra: 'x' } } as any,
      {} as any,
      {} as any
    );
    expect(out.text).toBe('subtool_loader → read (path="/a" maxLines=100)');
  });

  it('renders only subtool when args empty', () => {
    const out: any = tool.renderCall({ subtool: 'ls', args: {} } as any, {} as any, {} as any);
    expect(out.text).toBe('subtool_loader → ls');
  });
});
