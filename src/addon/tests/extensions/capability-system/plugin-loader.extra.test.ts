/**
 * Extra unit tests for capability-system/plugin-loader.ts
 * Target: cover remaining branches (53 uncovered)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { PluginLoader } from '../../../extensions/capability-system/plugin-loader';

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  watch: vi.fn(() => ({ close: vi.fn() })),
}));

// Mock guideline-generator
vi.mock('../../../extensions/capability-system/guideline-generator.ts', () => ({
  generateCapabilityGuidelines: vi.fn(() => []),
  extractMinimalParams: vi.fn(() => ({}))
}));

import { existsSync, watch } from 'fs';

describe('PluginLoader extra coverage', () => {
  let pluginsDir: string;
  let loader: PluginLoader;

  beforeEach(() => {
    vi.clearAllMocks();
    pluginsDir = '/tmp/plugins';
    (existsSync as any).mockReturnValue(true);
  });

  describe('createExecuteHandler', () => {
    it('injects capabilityId into result.details when details is object', async () => {
      loader = new PluginLoader({ pluginsDir });
      const handler = (loader as any).createExecuteHandler('cap1', async () => {
        return { content: [{ type: 'text', text: 'ok' }], details: { foo: 'bar' } };
      });
      const result = await handler('call1', {}, null, null, {});
      expect(result.details).toEqual({ foo: 'bar', capabilityId: 'cap1' });
    });

    it('replaces details with {capabilityId} when details is an array', async () => {
      loader = new PluginLoader({ pluginsDir });
      const handler = (loader as any).createExecuteHandler('cap1', async () => {
        return { content: [], details: [] as any };
      });
      const result = await handler('call1', {}, null, null, {});
      expect(result.details).toEqual({ capabilityId: 'cap1' });
    });

    it('replaces details with {capabilityId} when details is undefined', async () => {
      loader = new PluginLoader({ pluginsDir });
      const handler = (loader as any).createExecuteHandler('cap1', async () => {
        return { content: [] };
      });
      const result = await handler('call1', {}, null, null, {});
      expect(result.details).toEqual({ capabilityId: 'cap1' });
    });

    it('returns error result when executeFn throws', async () => {
      loader = new PluginLoader({ pluginsDir });
      const handler = (loader as any).createExecuteHandler('cap1', async () => {
        throw new Error('fail');
      });
      const result = await handler('call1', {}, null, null, {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('cap1 error: fail');
      expect(result.details).toEqual({ error: 'fail', capabilityId: 'cap1' });
    });
  });

  describe('startWatchMode', () => {
    it('sets up root watcher and ignores non-rename events', () => {
      const watchMock = vi.fn(() => ({ close: vi.fn() }));
      (watch as any).mockImplementation(watchMock);
      loader = new PluginLoader({ pluginsDir });
      const scheduleSpy = vi.spyOn(loader as any, 'scheduleNewPluginLoad').mockImplementation(() => {});
      const unloadSpy = vi.spyOn(loader as any, 'unloadPlugin').mockImplementation(() => {});
      (loader as any).startWatchMode(pluginsDir);
      const callback = watchMock.mock.calls[0][2] as Function;
      callback('change', 'file.ts'); // not rename
      expect(scheduleSpy).not.toHaveBeenCalled();
      expect(unloadSpy).not.toHaveBeenCalled();
    });

    it('ignores events with no filename', () => {
      const watchMock = vi.fn(() => ({ close: vi.fn() }));
      (watch as any).mockImplementation(watchMock);
      loader = new PluginLoader({ pluginsDir });
      const scheduleSpy = vi.spyOn(loader as any, 'scheduleNewPluginLoad').mockImplementation(() => {});
      const unloadSpy = vi.spyOn(loader as any, 'unloadPlugin').mockImplementation(() => {});
      (loader as any).startWatchMode(pluginsDir);
      const callback = watchMock.mock.calls[0][2];
      callback('rename', null);
      expect(scheduleSpy).not.toHaveBeenCalled();
      expect(unloadSpy).not.toHaveBeenCalled();
    });

    it('calls unloadPlugin when plugin folder deleted (existsSync false)', () => {
      (existsSync as any).mockReturnValue(false);
      const watchMock = vi.fn(() => ({ close: vi.fn() }));
      (watch as any).mockImplementation(watchMock);
      loader = new PluginLoader({ pluginsDir });
      const unloadSpy = vi.spyOn(loader as any, 'unloadPlugin').mockImplementation(() => {});
      (loader as any).startWatchMode(pluginsDir);
      const callback = watchMock.mock.calls[0][2];
      callback('rename', 'oldplugin');
      expect(unloadSpy).toHaveBeenCalledWith('oldplugin');
    });

    it('calls scheduleNewPluginLoad when new plugin folder appears (existsSync true)', () => {
      (existsSync as any).mockReturnValue(true);
      const watchMock = vi.fn(() => ({ close: vi.fn() }));
      (watch as any).mockImplementation(watchMock);
      loader = new PluginLoader({ pluginsDir });
      const scheduleSpy = vi.spyOn(loader as any, 'scheduleNewPluginLoad').mockImplementation(() => {});
      (loader as any).startWatchMode(pluginsDir);
      const callback = watchMock.mock.calls[0][2];
      callback('rename', 'newplugin');
      expect(scheduleSpy).toHaveBeenCalledWith('newplugin');
    });
  });

  describe('scheduleNewPluginLoad', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('clears existing timer for same plugin before scheduling new', () => {
      loader = new PluginLoader({ pluginsDir });
      const timers = new Map<string, NodeJS.Timeout>();
      (loader as any).newPluginTimers = timers;
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      (loader as any).scheduleNewPluginLoad('p1');
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(0);
      (loader as any).scheduleNewPluginLoad('p1');
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    });

    it('invokes loadPlugin after debounce delay when manifest exists', async () => {
      loader = new PluginLoader({ pluginsDir });
      const timers = new Map<string, NodeJS.Timeout>();
      (loader as any).newPluginTimers = timers;
      const loadPluginSpy = vi.spyOn(loader as any, 'loadPlugin').mockResolvedValue({
        totalPlugins: 1,
        totalCapabilities: 1,
        errors: [],
      });
      (existsSync as any).mockReturnValue(true);
      (loader as any).scheduleNewPluginLoad('p2');
      await vi.runAllTimersAsync();
      expect(loadPluginSpy).toHaveBeenCalledWith('p2');
    });

    it('does not invoke loadPlugin if manifest missing after delay', async () => {
      loader = new PluginLoader({ pluginsDir });
      const timers = new Map<string, NodeJS.Timeout>();
      (loader as any).newPluginTimers = timers;
      const loadPluginSpy = vi.spyOn(loader as any, 'loadPlugin');
      (existsSync as any).mockReturnValue(false);
      (loader as any).scheduleNewPluginLoad('p3');
      await vi.runAllTimersAsync();
      expect(loadPluginSpy).not.toHaveBeenCalled();
    });
  });
});
