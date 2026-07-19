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

describe('piclaw-header extension', () => {
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

  it('uses default name and version when no package.json found', async () => {
    await initExtension();
    const setHeader = vi.fn();
    const ctx = { hasUI: true, ui: { setHeader } };
    const handler = handlers['session_start'];
    expect(handler).toBeDefined();
    await handler(null, ctx);
    expect(setHeader).toHaveBeenCalled();
    const renderFn = setHeader.mock.calls[0][0];
    const theme = { fg: (c: string, s: string) => s, bold: (s: string) => s, dim: (s: string) => s, warning: (s: string) => s, accent: (s: string) => s };
    const textComp = renderFn(null, theme);
    expect(textComp.text).toContain('piclaw');
    expect(textComp.text).toContain('0.0.1');
  });

  it('reads name and version from package.json when present', async () => {
    (existsSync as any).mockReturnValue(true);
    (readFileSync as any).mockReturnValue(JSON.stringify({ name: 'myapp', version: '2.3.4' }));
    await initExtension();
    const setHeader = vi.fn();
    const ctx = { hasUI: true, ui: { setHeader } };
    await handlers['session_start'](null, ctx);
    expect(setHeader).toHaveBeenCalled();
    const renderFn = setHeader.mock.calls[0][0];
    const theme = { fg: (c,s)=>s, bold: s=>s, dim: s=>s, warning: s=>s, accent: s=>s };
    const textComp = renderFn(null, theme);
    expect(textComp.text).toContain('myapp');
    expect(textComp.text).toContain('2.3.4');
  });

  it('skips version check when PI_SKIP_VERSION_CHECK set', async () => {
    process.env.PI_SKIP_VERSION_CHECK = '1';
    (existsSync as any).mockReturnValue(true);
    (readFileSync as any).mockReturnValue(JSON.stringify({ name: 'app', version: '1.0.0' }));
    await initExtension();
    const setHeader = vi.fn();
    const ctx = { hasUI: true, ui: { setHeader } };
    await handlers['session_start'](null, ctx);
    expect(setHeader).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
    delete process.env.PI_SKIP_VERSION_CHECK;
  });

  it('shows update banner when newer version available', async () => {
    (existsSync as any).mockReturnValue(true);
    (readFileSync as any).mockReturnValue(JSON.stringify({ name: 'app', version: '1.0.0' }));
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ version: '2.0.0' }) });
    await initExtension();
    const setHeader = vi.fn();
    const ctx = { hasUI: true, ui: { setHeader } };
    await handlers['session_start'](null, ctx);
    expect(setHeader).toHaveBeenCalled();
    const renderFn = setHeader.mock.calls[0][0];
    const theme = { fg: (c,s)=>s, bold: s=>s, dim: s=>s, warning: s=>s, accent: s=>s };
    const textComp = renderFn(null, theme);
    expect(textComp.text).toContain('Update Available');
    expect(textComp.text).toContain('2.0.0');
  });

  it('does not show update banner when up to date', async () => {
    (existsSync as any).mockReturnValue(true);
    (readFileSync as any).mockReturnValue(JSON.stringify({ name: 'app', version: '1.0.0' }));
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ version: PI_VERSION }) });
    await initExtension();
    const setHeader = vi.fn();
    const ctx = { hasUI: true, ui: { setHeader } };
    await handlers['session_start'](null, ctx);
    expect(setHeader).toHaveBeenCalled();
    const renderFn = setHeader.mock.calls[0][0];
    const theme = { fg: (c,s)=>s, bold: s=>s, dim: s=>s, warning: s=>s, accent: s=>s };
    const textComp = renderFn(null, theme);
    expect(textComp.text).not.toContain('Update Available');
  });

  // Additional edge cases to cover remaining branches
  it('skips version check when PI_OFFLINE set', async () => {
    process.env.PI_OFFLINE = '1';
    (existsSync as any).mockReturnValue(true);
    (readFileSync as any).mockReturnValue(JSON.stringify({ name: 'app', version: '1.0.0' }));
    await initExtension();
    const setHeader = vi.fn();
    const ctx = { hasUI: true, ui: { setHeader } };
    await handlers['session_start'](null, ctx);
    expect(setHeader).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
    delete process.env.PI_OFFLINE;
  });

  it('handles non-ok fetch response gracefully', async () => {
    (existsSync as any).mockReturnValue(true);
    (readFileSync as any).mockReturnValue(JSON.stringify({ name: 'app', version: '1.0.0' }));
    (global.fetch as any).mockResolvedValue({ ok: false, status: 500 } as any);
    await initExtension();
    const setHeader = vi.fn();
    const ctx = { hasUI: true, ui: { setHeader } };
    await handlers['session_start'](null, ctx);
    expect(setHeader).toHaveBeenCalled();
    const renderFn = setHeader.mock.calls[0][0];
    const theme = { fg: (c,s)=>s, bold: s=>s, dim: s=>s, warning: s=>s, accent: s=>s };
    const textComp = renderFn(null, theme);
    // Should not throw and should not show update banner
    expect(textComp.text).not.toContain('Update Available');
  });

  it('handles fetch error (network down)', async () => {
    (existsSync as any).mockReturnValue(true);
    (readFileSync as any).mockReturnValue(JSON.stringify({ name: 'app', version: '1.0.0' }));
    (global.fetch as any).mockRejectedValue(new Error('network failure'));
    await initExtension();
    const setHeader = vi.fn();
    const ctx = { hasUI: true, ui: { setHeader } };
    await handlers['session_start'](null, ctx);
    expect(setHeader).toHaveBeenCalled();
    const renderFn = setHeader.mock.calls[0][0];
    const theme = { fg: (c,s)=>s, bold: s=>s, dim: s=>s, warning: s=>s, accent: s=>s };
    const textComp = renderFn(null, theme);
    expect(textComp.text).not.toContain('Update Available');
  });
});
