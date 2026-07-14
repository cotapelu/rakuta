import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mock registry instance
const mockRegistryInstance = {
  register: vi.fn(),
  unregister: vi.fn()
};

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  watch: vi.fn(() => ({ close: vi.fn() }))
}));

// Mock registry using shared instance
vi.mock('../../../extensions/capability-system/registry.js', () => ({
  getCapabilityRegistry: () => mockRegistryInstance
}));

vi.mock('../../../extensions/capability-system/guideline-generator.js', () => ({
  generateCapabilityGuidelines: vi.fn(() => []),
  extractMinimalParams: vi.fn(() => ({}))
}));

import { PluginLoader } from '../../../extensions/capability-system/plugin-loader.js';
import { existsSync, readdirSync, readFileSync } from 'fs';

describe('PluginLoader', () => {
  let loader: PluginLoader;

  const sampleManifest = {
    id: 'testplugin',
    name: 'Test Plugin',
    description: 'Test',
    version: '1.0.0',
    capabilities: [{ id: 'test_cap', name: 'Test Cap', description: 'T', execute: 'cap.js' }],
    tags: ['dev']
  };

  beforeEach(() => {
    vi.clearAllMocks();
    existsSync.mockReturnValue(false);
    readdirSync.mockReturnValue([]);
    loader = new PluginLoader();
  });

  describe('loadAll', () => {
    it('returns early if already loaded', async () => {
      (loader as any).isLoaded = true;
      const stats = await loader.loadAll();
      expect(stats.totalPlugins).toBe(0);
    });

    it('returns empty stats if pluginsDir absent', async () => {
      const stats = await loader.loadAll();
      expect(stats.totalPlugins).toBe(0);
      expect(stats.totalCapabilities).toBe(0);
    });

    it('loads plugins and returns stats', async () => {
      existsSync.mockReturnValue(true);
      readdirSync.mockReturnValue([{ isDirectory: () => true, name: 'testplugin' }]);
      readFileSync.mockReturnValue(JSON.stringify(sampleManifest));
      const dynamicImportSpy = vi.spyOn(loader as any, 'dynamicImport').mockResolvedValue({
        execute: vi.fn(),
        default: () => {}
      });

      const stats = await loader.loadAll();
      expect(stats.totalPlugins).toBe(1);
      expect(stats.totalCapabilities).toBe(1);
      expect(mockRegistryInstance.register).toHaveBeenCalled();
      dynamicImportSpy.mockRestore();
    });

    it('collects errors for failing plugins', async () => {
      existsSync.mockReturnValue(true);
      readdirSync.mockReturnValue([{ isDirectory: () => true, name: 'bad' }]);
      readFileSync.mockReturnValue('{}'); // invalid

      const stats = await loader.loadAll();
      expect(stats.errors.length).toBeGreaterThan(0);
    });
  });

  describe('loadPlugin', () => {
    beforeEach(() => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue(JSON.stringify(sampleManifest));
      vi.spyOn(loader as any, 'dynamicImport').mockResolvedValue({
        execute: vi.fn(),
        default: () => {}
      });
    });

    it('throws if manifest invalid', async () => {
      readFileSync.mockReturnValue('{}');
      await expect(loader.loadPlugin('folder')).rejects.toThrow("Missing 'id'");
    });

    it('unloads existing plugin before reloading', async () => {
      await loader.loadPlugin('testplugin');
      expect(loader.getLoadedPlugins()).toHaveLength(1);
      expect(mockRegistryInstance.register).toHaveBeenCalledTimes(1);
      // Clear call history
      mockRegistryInstance.register.mockClear();
      mockRegistryInstance.unregister.mockClear();
      // Load again same plugin folder (same manifest.id)
      await loader.loadPlugin('testplugin');
      // Should have unregistered the capability from previous load (full ID includes plugin ID)
      expect(mockRegistryInstance.unregister).toHaveBeenCalledWith('testplugin.test_cap');
      // And registered again
      expect(mockRegistryInstance.register).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStats', () => {
    it('counts total capabilities', () => {
      const loaded: any = {
        capabilities: [{ id: 'c1' }, { id: 'c2' }],
        manifest: { id: 'p1' }
      };
      (loader as any).loadedPlugins.set('p1', loaded);
      const stats = loader.getStats();
      expect(stats.totalPlugins).toBe(1);
      expect(stats.totalCapabilities).toBe(2);
    });
  });

  describe('unloadAll', () => {
    it('unregisters capabilities for all plugins', () => {
      const loaded: any = {
        capabilities: [{ id: 'c1' }, { id: 'c2' }],
        manifest: { id: 'p1' }
      };
      (loader as any).loadedPlugins.set('p1', loaded);
      loader.unloadAll();
      expect(mockRegistryInstance.unregister).toHaveBeenCalledWith('c1');
      expect(mockRegistryInstance.unregister).toHaveBeenCalledWith('c2');
    });
  });
});
