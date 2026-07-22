import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { VERSION as PI_VERSION } from '@earendil-works/pi-coding-agent';

// Mock fs
vi.mock('fs', () => {
  const existsSync = vi.fn();
  const readFileSync = vi.fn();
  return { existsSync, readFileSync };
});

vi.mock('fs/promises', async () => {
  const actual = await vi.importActual('fs/promises');
  return { ...actual as any, unlink: vi.fn().mockResolvedValue(undefined) };
});

// Mock global fetch
global.fetch = vi.fn();

describe('piclaw-header extension (coverage)', () => {
  let handlers: { [event: string]: Function } = {};

  const mockApi = {
    on: vi.fn((event, handler) => {
      handlers[event] = handler;
    }),
  };

  async function initExtension() {
    vi.resetModules();
    const mod = await import('../../extensions/piclaw-header');
    return mod.default(mockApi);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};
    (existsSync as any).mockReturnValue(false);
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ version: '9.9.9' }) });
  });

  it('handles hasUI false without setting header', async () => {
    await initExtension();
    const setHeader = vi.fn();
    const ctx = { hasUI: false, ui: { setHeader } };
    const handler = handlers['session_start'];
    expect(handler).toBeDefined();
    await handler(null, ctx);
    expect(setHeader).not.toHaveBeenCalled();
  });

  it('falls back to defaults when package.json exists but has no name or version', async () => {
    (existsSync as any).mockReturnValue(true);
    (readFileSync as any).mockReturnValue(JSON.stringify({})); // no name, version
    await initExtension();

    const setHeader = vi.fn();
    const ctx = { hasUI: true, ui: { setHeader } };
    const handler = handlers['session_start'];
    await handler(null, ctx);
    expect(setHeader).toHaveBeenCalled();
    const renderFn = setHeader.mock.calls[0][0];
    const theme = { fg: (c: string, s: string) => s, bold: (s: string) => s, dim: (s: string) => s, warning: (s: string) => s, accent: (s: string) => s };
    const textComp = renderFn(null, theme);
    expect(textComp.text).toContain('piclaw');
    expect(textComp.text).toContain('0.0.1');
  });

  it('falls back to defaults when package.json read fails (exception)', async () => {
    (existsSync as any).mockReturnValue(true);
    (readFileSync as any).mockImplementation(() => {
      throw new Error('read error');
    });
    await initExtension();

    const setHeader = vi.fn();
    const ctx = { hasUI: true, ui: { setHeader } };
    const handler = handlers['session_start'];
    await handler(null, ctx);
    expect(setHeader).toHaveBeenCalled();
    const renderFn = setHeader.mock.calls[0][0];
    const theme = { fg: (c: string, s: string) => s, bold: (s: string) => s, dim: (s: string) => s, warning: (s: string) => s, accent: (s: string) => s };
    const textComp = renderFn(null, theme);
    expect(textComp.text).toContain('piclaw');
    expect(textComp.text).toContain('0.0.1');
  });
});
