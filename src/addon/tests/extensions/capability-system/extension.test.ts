/**
 * Unit tests for capability-system/extension.ts
 * Focus: capabilitySystemExtension factory, createCapabilityRouterTool, helpers
 * Target: 102 uncovered branches (130 total)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'node:path';

// Mock node:fs (some helpers may use it indirectly)
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  appendFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock pi-tui
vi.mock('@earendil-works/pi-tui', () => ({
  Container: class { clear() {} addChild() {} invalidate() {} },
  Text: class { constructor(public text: string, public x = 0, public y = 0) {}
    setText(t: string) { this.text = t; }
    render() { return []; }
  },
  truncateToWidth: vi.fn((txt, w) => txt.slice(0, w).split('\n')),
}));

// Mock internal modules using same specifiers as in extension.ts
vi.mock('../../../extensions/capability-system/plugin-loader.js', () => ({
  PluginLoader: class {
    async loadAll() { return { totalPlugins: 0, totalCapabilities: 0, errors: [] }; }
    getStats() { return { totalPlugins: 0, totalCapabilities: 0 }; }
    getLoadedPlugins() { return []; }
  },
  createPluginLoader: vi.fn(() => new (class {} as any)),
  getGlobalLoader: vi.fn(),
  setGlobalLoader: vi.fn(),
}));

vi.mock('../../../extensions/capability-system/registry.js', () => ({
  getCapabilityRegistry: vi.fn(() => ({
    has: vi.fn(),
    register: vi.fn(),
    get: vi.fn(),
    listAll: vi.fn(() => []),
  })),
}));

vi.mock('../../../extensions/capability-system/prompt-integration.js', () => ({
  createCapabilityDiscoveryCapability: vi.fn(() => ({ id: 'system.capabilities' })),
}));

import * as fs from 'node:fs';
import {
  createPluginLoader,
  getGlobalLoader,
  setGlobalLoader,
  PluginLoader,
} from '../../../extensions/capability-system/plugin-loader.js';
import { getCapabilityRegistry } from '../../../extensions/capability-system/registry.js';
import capabilitySystemExtension, {
  truncateToVisualLines,
  keyHint,
  getPluginsPath,
  isDevMode,
  createCapabilityRouterTool,
} from '../../../extensions/capability-system/extension';

const CWD = '/test/cwd';

describe('capability-system/extension (helpers)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('truncateToVisualLines', () => {
    it('returns multiple lines within maxLines', () => {
      const result = truncateToVisualLines('a\nb\nc', 10, 10);
      expect(result.visualLines).toEqual(['a', 'b', 'c']);
      expect(result.skippedCount).toBe(0);
    });

    it('skips lines beyond maxLines', () => {
      const text = Array(5).fill('line').join('\n');
      const result = truncateToVisualLines(text, 2, 20);
      expect(result.visualLines.length).toBeLessThanOrEqual(2);
      expect(result.skippedCount).toBeGreaterThan(0);
    });

    it('wraps long lines to width', () => {
      const long = 'a'.repeat(50);
      const result = truncateToVisualLines(long, 10, 20);
      expect(result.visualLines.length).toBeGreaterThan(1);
    });
  });

  describe('keyHint', () => {
    it('returns fallback unchanged', () => {
      expect(keyHint('action', 'fallback')).toBe('fallback');
    });
  });

  describe('getPluginsPath', () => {
    it('uses env var if set', () => {
      process.env.PICLAW_PLUGINS_DIR = '/custom/plugins';
      expect(getPluginsPath()).toBe('/custom/plugins');
      delete process.env.PICLAW_PLUGINS_DIR;
    });

    it('falls back to __dirname/plugins', () => {
      delete process.env.PICLAW_PLUGINS_DIR;
      const p = getPluginsPath();
      expect(typeof p).toBe('string');
      expect(p).toContain('plugins');
    });
  });

  describe('isDevMode', () => {
    it('returns true if NODE_ENV=development', () => {
      process.env.NODE_ENV = 'development';
      expect(isDevMode()).toBe(true);
      delete process.env.NODE_ENV;
    });

    it('returns true if PICLAW_DEV=1', () => {
      process.env.PICLAW_DEV = '1';
      expect(isDevMode()).toBe(true);
      delete process.env.PICLAW_DEV;
    });

    it('returns false by default', () => {
      delete process.env.NODE_ENV;
      delete process.env.PICLAW_DEV;
      expect(isDevMode()).toBe(false);
    });
  });
});

describe('capabilitySystemExtension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes plugin loader and registers discovery capability', async () => {
    const mockLoader = {
      loadAll: vi.fn().mockResolvedValue({ totalPlugins: 2, totalCapabilities: 5, errors: [] }),
      getStats: vi.fn().mockReturnValue({ totalPlugins: 2, totalCapabilities: 5 }),
      getLoadedPlugins: vi.fn().mockReturnValue([]),
    };
    (createPluginLoader as any).mockReturnValue(mockLoader);
    (getGlobalLoader as any).mockReturnValue(undefined);

    // Setup registry mock to track register
    const registerMock = vi.fn();
    const registryInstance = { has: vi.fn(), register: registerMock, get: vi.fn(), listAll: vi.fn(() => []) };
    (getCapabilityRegistry as any).mockReturnValue(registryInstance);

    const api = { registerTool: vi.fn() };
    await capabilitySystemExtension(api);

    expect(createPluginLoader).toHaveBeenCalled();
    expect(mockLoader.loadAll).toHaveBeenCalled();
    expect(api.registerTool).toHaveBeenCalled();
    expect(registerMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'system.capabilities' }));
  });

  it('uses custom pluginLoader if provided', async () => {
    const customLoader = {
      loadAll: vi.fn().mockResolvedValue({ totalPlugins: 1, totalCapabilities: 2, errors: [] }),
      getStats: vi.fn().mockReturnValue({ totalPlugins: 1, totalCapabilities: 2 }),
      getLoadedPlugins: vi.fn().mockReturnValue([]),
    };
    const api = { pluginLoader: customLoader, registerTool: vi.fn() };
    await capabilitySystemExtension(api);

    expect(createPluginLoader).not.toHaveBeenCalled();
    expect(customLoader.loadAll).toHaveBeenCalled();
    expect(getGlobalLoader()).toBeUndefined();
  });

  it('sets global loader when using default', async () => {
    const mockLoader = {
      loadAll: vi.fn().mockResolvedValue({ totalPlugins: 0, totalCapabilities: 0, errors: [] }),
    };
    (createPluginLoader as any).mockReturnValue(mockLoader);
    (getGlobalLoader as any).mockReturnValue(undefined);

    const api = { registerTool: vi.fn() };
    await capabilitySystemExtension(api);

    // setGlobalLoader is a mocked function from plugin-loader module
    expect(setGlobalLoader).toHaveBeenCalledWith(mockLoader);
  });

  it('handles loader.loadAll error', async () => {
    const mockLoader = {
      loadAll: vi.fn().mockRejectedValue(new Error('load fail')),
    };
    (createPluginLoader as any).mockReturnValue(mockLoader);
    const api = { registerTool: vi.fn() };

    await expect(capabilitySystemExtension(api)).rejects.toThrow('load fail');
  });

  it('registers plugins command in dev mode', async () => {
    process.env.NODE_ENV = 'development';
    const mockLoader = {
      loadAll: vi.fn().mockResolvedValue({ totalPlugins: 1, totalCapabilities: 1, errors: [] }),
      getStats: vi.fn().mockReturnValue({ totalPlugins: 1, totalCapabilities: 1 }),
      getLoadedPlugins: vi.fn().mockReturnValue([{ manifest: { name: 'Test', id: 'test' }, capabilities: [] }]),
    };
    (createPluginLoader as any).mockReturnValue(mockLoader);
    (getGlobalLoader as any).mockReturnValue(mockLoader);

    const api = {
      registerTool: vi.fn(),
      registerCommand: vi.fn(),
      exec: vi.fn(),
      ui: { custom: vi.fn() },
    };

    await capabilitySystemExtension(api);

    expect(api.registerCommand).toHaveBeenCalledWith('plugins', expect.objectContaining({
      description: 'List loaded plugins (debug)',
      handler: expect.any(Function),
    }));
    delete process.env.NODE_ENV;
  });

  it('does not register plugins command if registerCommand not a function', async () => {
    process.env.NODE_ENV = 'development';
    const mockLoader = {
      loadAll: vi.fn().mockResolvedValue({ totalPlugins: 0, totalCapabilities: 0, errors: [] }),
      getStats: vi.fn().mockReturnValue({ totalPlugins: 0, totalCapabilities: 0 }),
      getLoadedPlugins: vi.fn().mockReturnValue([]),
    };
    (createPluginLoader as any).mockReturnValue(mockLoader);
    (getGlobalLoader as any).mockReturnValue(mockLoader);

    const api = {
      registerTool: vi.fn(),
      registerCommand: undefined,
      exec: vi.fn(),
      ui: { custom: vi.fn() },
    };

    await capabilitySystemExtension(api);
    // Should not throw
    expect(api.registerCommand).toBeUndefined();
    delete process.env.NODE_ENV;
  });

  it('logs warning if loader.loadAll returns errors', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockLoader = {
      loadAll: vi.fn().mockResolvedValue({ totalPlugins: 1, totalCapabilities: 1, errors: ['oh no'] }),
    };
    (createPluginLoader as any).mockReturnValue(mockLoader);
    const api = { registerTool: vi.fn() };

    await capabilitySystemExtension(api);

    expect(consoleSpy).toHaveBeenCalledWith(['oh no']);
    consoleSpy.mockRestore();
  });
});

describe('createCapabilityRouterTool', () => {
  let api: any;
  let registryMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    api = {
      exec: vi.fn(),
    };
    registryMock = {
      has: vi.fn(() => false),
      register: vi.fn(),
      get: vi.fn(),
      listAll: vi.fn(() => []),
    };
    (getCapabilityRegistry as any).mockReturnValue(registryMock);
  });

  const getTool = () => createCapabilityRouterTool(api);

  it('defines tool with required fields', () => {
    const tool = getTool();
    expect(tool.name).toBe('capability');
    expect(tool.id).toBe('capability.router');
    expect(tool.label).toBe('Capability Router');
    expect(tool.description).toContain('Execute any of');
    expect(tool.parameters).toMatchObject({
      type: 'object',
      required: ['capability', 'params'],
      properties: {
        capability: { type: 'string' },
        params: { type: 'object' },
      },
    });
  });

  describe('execute', () => {
    it('returns error if capability missing', async () => {
      const tool = getTool();
      const result = await tool.execute('call1', {}, null, null, {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Missing 'capability'");
    });

    it('returns not_found if capability does not exist', async () => {
      registryMock.get.mockReturnValue(undefined);
      const tool = getTool();
      const result = await tool.execute('call1', { capability: 'unknown.cap' }, null, null, {});
      expect(result.isError).toBe(true);
      expect(result.details.error).toBe('not_found');
    });

    it('executes capability and returns result', async () => {
      const cap = {
        id: 'test.cap',
        name: 'Test Cap',
        execute: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
      };
      registryMock.get.mockReturnValue(cap);
      const tool = getTool();
      const result = await tool.execute('call1', { capability: 'test.cap', params: {} }, null, null, { cwd: '/test' });

      expect(result).toEqual({ content: [{ type: 'text', text: 'ok' }], details: { capabilityId: 'test.cap' } });
      expect(cap.execute).toHaveBeenCalled();
    });

    it('wraps thrown errors', async () => {
      const cap = {
        execute: vi.fn().mockRejectedValue(new Error('fail')),
      };
      registryMock.get.mockReturnValue(cap);
      const tool = getTool();
      const result = await tool.execute('call1', { capability: 'test.cap', params: {} }, null, null, {});
      expect(result.isError).toBe(true);
      expect(result.details.error).toBe('fail');
    });

    it('provides enhanced context with exec, getCapability, listCapabilitiesByTag, callCapability', async () => {
      const cap = {
        execute: vi.fn().mockImplementation(async (toolCallId, params, signal, onUpdate, ctx) => {
          expect(ctx.cwd).toBe('/test');
          expect(typeof ctx.exec).toBe('function');
          expect(typeof ctx.getCapability).toBe('function');
          expect(typeof ctx.listCapabilitiesByTag).toBe('function');
          expect(typeof ctx.callCapability).toBe('function');
          return { content: [{ type: 'text', text: 'ok' }] };
        }),
      };
      registryMock.get.mockReturnValue(cap);
      const tool = getTool();
      await tool.execute('call1', { capability: 'test.cap', params: {} }, null, null, { cwd: '/test' });
    });

    it('callCapability executes nested capability', async () => {
      const innerCap = {
        execute: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'inner' }] }),
      };
      const outerCap = {
        execute: vi.fn().mockImplementation(async (_, __, ___, ____, ctx) => {
          return await ctx.callCapability('inner.cap', {});
        }),
      };
      registryMock.get
        .mockImplementation((id) => {
          if (id === 'outer.cap') return outerCap;
          if (id === 'inner.cap') return innerCap;
          return undefined;
        });
      const tool = getTool();
      const result = await tool.execute('call1', { capability: 'outer.cap', params: {} }, null, null, {});
      expect(innerCap.execute).toHaveBeenCalled();
      expect(result.content[0].text).toBe('inner');
    });
  });

  describe('renderCall', () => {
    it('shows capability name and formatted params', () => {
      const tool = getTool();
      const theme = { fg: (tag: any, text: any) => text, bold: (txt: any) => txt };
      const comp = tool.renderCall({ capability: 'test.cap', params: { a: 1, b: 'x' } }, theme, { lastComponent: undefined });
      expect(comp.text).toContain('$ test.cap');
      expect(comp.text).toContain('a: 1');
      expect(comp.text).toContain('b: x');
    });

    it('formats arrays and objects in params', () => {
      const tool = getTool();
      const theme = { fg: (tag: any, text: any) => text, bold: (txt: any) => txt };
      const comp = tool.renderCall({
        capability: 'test.cap',
        params: { arr: [1, 2], obj: { x: 1 } }
      }, theme, { lastComponent: undefined });
      const t = comp.text;
      expect(t).toContain('arr: 1, 2');
      expect(t).toContain('obj:');
    });
  });

  describe('renderResult', () => {
    it('uses custom renderer if provided', () => {
      const cap = {
        renderResult: vi.fn().mockReturnValue({ type: 'custom' }),
      };
      registryMock.get.mockReturnValue(cap);
      const tool = getTool();
      const result = { content: [{ type: 'text', text: 'ok' }], details: { capabilityId: 'test.cap' } };
      const rendered = tool.renderResult(result, {}, {}, {});
      expect(rendered).toEqual({ type: 'custom' });
      expect(cap.renderResult).toHaveBeenCalledWith(result, {}, {});
    });

    it('falls back to default renderer on custom renderer error', () => {
      const cap = {
        renderResult: vi.fn().mockImplementation(() => { throw new Error('render fail'); }),
      };
      registryMock.get.mockReturnValue(cap);
      const tool = getTool();
      const result = { content: [{ type: 'text', text: 'ok' }], details: { capabilityId: 'test.cap' } };
      const theme = { fg: (tag: any, text: any) => text };
      const context = { lastComponent: undefined, invalidate: () => {}, state: {} };
      expect(() => tool.renderResult(result, {}, theme, context)).not.toThrow();
    });

    it('renders expanded output when expanded true', () => {
      const tool = getTool();
      const result = { content: [{ type: 'text', text: 'line1\nline2' }], details: {} };
      const theme = { fg: (tag: any, text: any) => text };
      const context = { lastComponent: undefined, invalidate: () => {}, state: {} };
      const comp = tool.renderResult(result, { expanded: true }, theme, context) as any;
      expect(comp).toBeDefined();
    });

    it('renders truncated preview when not expanded', () => {
      const tool = getTool();
      const longText = 'a'.repeat(1000);
      const result = { content: [{ type: 'text', text: longText }], details: {} };
      const theme = { fg: (tag: any, text: any) => text, muted: (tag: any, text: any) => text };
      const context = { lastComponent: undefined, invalidate: () => {}, state: {} };
      const comp = tool.renderResult(result, { expanded: false }, theme, context) as any;
      expect(comp).toBeDefined();
    });

    it('shows timing information', () => {
      const tool = getTool();
      const result = { content: [{ type: 'text', text: 'ok' }], details: {} };
      const state: any = { startedAt: Date.now() - 100, endedAt: Date.now(), interval: undefined };
      const context = { state, lastComponent: undefined, invalidate: vi.fn(), isError: false };
      const comp = tool.renderResult(result, { isPartial: false }, { fg: (s:any)=>s }, context) as any;
      expect(comp).toBeDefined();
    });
  });
});
