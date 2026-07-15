import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { PluginLoader } from '../../../extensions/capability-system/plugin-loader';

// Mock registry
let mockRegistry: any;

vi.mock('../../../extensions/capability-system/registry', () => ({
  getCapabilityRegistry: vi.fn(() => mockRegistry)
}));

describe('PluginLoader', () => {
  let testRoot: string;

  beforeEach(async () => {
    testRoot = await mkdtemp(join(tmpdir(), 'pluginloader_'));
    // Reset mock registry
    mockRegistry = {
      register: vi.fn(),
      unregister: vi.fn()
    };
  });

  afterEach(async () => {
    try {
      await rm(testRoot, { recursive: true, force: true });
    } catch (e) {}
  });

  function writeJSON(filePath: string, data: any): void {
    writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  describe('loadAll', () => {
    it('returns empty stats when pluginsDir does not exist', async () => {
      const nonexistent = join(testRoot, 'nonexistent_plugins');
      const loader = new PluginLoader({ pluginsDir: nonexistent });
      const stats = await loader.loadAll();
      expect(stats.totalPlugins).toBe(0);
      expect(stats.totalCapabilities).toBe(0);
      expect(stats.errors).toHaveLength(0);
    });

    it('returns empty stats when pluginsDir exists but has no subfolders', async () => {
      const pluginsDir = join(testRoot, 'plugins');
      const { mkdir } = await import('fs/promises');
      await mkdir(pluginsDir);
      const loader = new PluginLoader({ pluginsDir });
      const stats = await loader.loadAll();
      expect(stats.totalPlugins).toBe(0);
      expect(stats.totalCapabilities).toBe(0);
      expect(stats.errors).toHaveLength(0);
    });

    it('loads a valid plugin', async () => {
      const pluginsDir = join(testRoot, 'plugins');
      const { mkdir } = await import('fs/promises');
      await mkdir(pluginsDir);

      const pluginDir = join(pluginsDir, 'myplugin');
      await mkdir(pluginDir);

      // Write manifest.json
      writeJSON(join(pluginDir, 'manifest.json'), {
        id: 'myplugin',
        name: 'My Plugin',
        description: 'Test plugin',
        version: '1.0.0',
        tags: [],
        capabilities: [
          {
            id: 'testcap',
            name: 'Test Capability',
            description: 'A test capability',
            inputSchema: { type: 'object' },
            execute: 'cap.js'
          }
        ]
      });

      // Write capability file
      await writeFile(join(pluginDir, 'cap.js'),
        `export const schema = { type: 'object' };\n` +
        `export async function execute(params, ctx) {\n` +
        `  return { content: [{ type: 'text', text: 'ok' }], isError: false };\n` +
        `}`);

      const loader = new PluginLoader({ pluginsDir });
      const stats = await loader.loadAll();

      expect(stats.totalPlugins).toBe(1);
      expect(stats.totalCapabilities).toBe(1);
      expect(stats.errors).toHaveLength(0);
    });

    it('records errors for plugins with missing manifest', async () => {
      const pluginsDir = join(testRoot, 'plugins');
      const { mkdir } = await import('fs/promises');
      await mkdir(pluginsDir);

      const pluginDir = join(pluginsDir, 'badplugin');
      await mkdir(pluginDir);
      // No manifest.json

      const loader = new PluginLoader({ pluginsDir });
      const stats = await loader.loadAll();

      expect(stats.totalPlugins).toBe(0);
      expect(stats.errors).toHaveLength(1);
      expect(stats.errors[0].error).toContain('Missing manifest.json');
    });

    it('records errors for capability modules without execute function', async () => {
      const pluginsDir = join(testRoot, 'plugins');
      const { mkdir } = await import('fs/promises');
      await mkdir(pluginsDir);

      const pluginDir = join(pluginsDir, 'badschema');
      await mkdir(pluginDir);

      // Manifest with capability that points to a file missing execute export
      writeJSON(join(pluginDir, 'manifest.json'), {
        id: 'badschema',
        name: 'Bad Schema',
        description: 'Missing execute',
        version: '1.0.0',
        tags: [],
        capabilities: [
          {
            id: 'noexec',
            name: 'No Execute',
            description: 'No execute export',
            inputSchema: { type: 'object' },
            execute: 'noexec.js'
          }
        ]
      });

      // Write a module that only has schema, not execute
      await writeFile(join(pluginDir, 'noexec.js'),
        `export const schema = { type: 'object' };\n`);

      const loader = new PluginLoader({ pluginsDir });
      const stats = await loader.loadAll();

      expect(stats.totalPlugins).toBe(0);
      expect(stats.errors).toHaveLength(1);
      // Error could be missing execute or JSON parse; both indicate invalid plugin
      expect(stats.errors[0].error).toMatch(/execute|JSON/);
    });

    it('records errors for malformed manifest JSON', async () => {
      const pluginsDir = join(testRoot, 'plugins');
      const { mkdir } = await import('fs/promises');
      await mkdir(pluginsDir);

      const pluginDir = join(pluginsDir, 'badjson');
      await mkdir(pluginDir);
      // Write invalid JSON
      await writeFile(join(pluginDir, 'manifest.json'), '{ invalid json');

      const loader = new PluginLoader({ pluginsDir });
      const stats = await loader.loadAll();

      expect(stats.totalPlugins).toBe(0);
      expect(stats.errors).toHaveLength(1);
      expect(stats.errors[0].error).toMatch(/JSON|Syntax/);
    });
  });

  describe('duplicate plugin handling', () => {
    it('unloads previous plugin when loading another with same id', async () => {
      const pluginsDir = join(testRoot, 'plugins');
      const { mkdir } = await import('fs/promises');
      await mkdir(pluginsDir);

      // Create first plugin
      const plugin1Dir = join(pluginsDir, 'plugin1');
      await mkdir(plugin1Dir);
      writeJSON(join(plugin1Dir, 'manifest.json'), {
        id: 'dup',
        name: 'Duplicate 1',
        description: 'First',
        version: '1.0.0',
        tags: [],
        capabilities: [{ id: 'cap1', name: 'Cap1', description: '', inputSchema: { type: 'object' }, execute: 'cap1.js' }]
      });
      await writeFile(join(plugin1Dir, 'cap1.js'), `export const schema = {}; export async function execute() {}`);

      const loader = new PluginLoader({ pluginsDir });
      await loader.loadPlugin('plugin1');

      // Load second plugin with same id
      const plugin2Dir = join(pluginsDir, 'plugin2');
      await mkdir(plugin2Dir);
      writeJSON(join(plugin2Dir, 'manifest.json'), {
        id: 'dup',
        name: 'Duplicate 2',
        description: 'Second',
        version: '1.0.0',
        tags: [],
        capabilities: [{ id: 'cap2', name: 'Cap2', description: '', inputSchema: { type: 'object' }, execute: 'cap2.js' }]
      });
      await writeFile(join(plugin2Dir, 'cap2.js'), `export const schema = {}; export async function execute() {}`);

      await loader.loadPlugin('plugin2');

      const stats = loader.getStats();
      expect(stats.totalPlugins).toBe(1);
      // The remaining plugin should be plugin2 (cap2)
      const loaded = loader.getLoadedPlugins();
      expect(loaded.length).toBe(1);
      const plugin = loaded[0];
      expect(plugin.manifest.id).toBe('dup');
      // Capability ID is prefixed with plugin id
      expect(plugin.capabilities[0].id).toBe('dup.cap2');

      // unload should have been called
      expect(mockRegistry.unregister).toHaveBeenCalled();
    });
  });

  describe('unloadPlugin', () => {
    it('unloads an existing plugin and unregisters its capabilities', async () => {
      const pluginsDir = join(testRoot, 'plugins_multi');
      const { mkdir } = await import('fs/promises');
      await mkdir(pluginsDir);
      const pluginDir = join(pluginsDir, 'multi');
      await mkdir(pluginDir);
      writeJSON(join(pluginDir, 'manifest.json'), {
        id: 'multi',
        name: 'Multi',
        version: '1.0.0',
        description: 'Test plugin',
        tags: [],
        capabilities: [
          { id: 'cap1', name: 'Cap1', description: 'Capability 1', inputSchema: { type: 'object' }, execute: 'c1.js' },
          { id: 'cap2', name: 'Cap2', description: 'Capability 2', inputSchema: { type: 'object' }, execute: 'c2.js' }
        ]
      });
      await writeFile(join(pluginDir, 'c1.js'), `export const schema = {}; export async function execute() {}`);
      await writeFile(join(pluginDir, 'c2.js'), `export const schema = {}; export async function execute() {}`);

      const loader = new PluginLoader({ pluginsDir });
      await loader.loadPlugin('multi');

      let stats = loader.getStats();
      expect(stats.totalPlugins).toBe(1);
      expect(stats.totalCapabilities).toBe(2);
      let loaded = loader.getLoadedPlugins();
      expect(loaded.length).toBe(1);

      loader.unloadPlugin('multi');

      stats = loader.getStats();
      expect(stats.totalPlugins).toBe(0);
      expect(stats.totalCapabilities).toBe(0);
      loaded = loader.getLoadedPlugins();
      expect(loaded.length).toBe(0);
      // Two unregister calls (one per capability)
      expect(mockRegistry.unregister).toHaveBeenCalledTimes(2);
    });

    it('unloadPlugin does nothing if plugin not loaded', async () => {
      const pluginsDir = join(testRoot, 'plugins_nl');
      const { mkdir } = await import('fs/promises');
      await mkdir(pluginsDir);
      const loader = new PluginLoader({ pluginsDir });
      expect(() => loader.unloadPlugin('nonexistent')).not.toThrow();
      expect(mockRegistry.unregister).not.toHaveBeenCalled();
    });
  });

  describe('reloadPlugin', () => {
    it('reloads a plugin successfully', async () => {
      const pluginsDir = join(testRoot, 'plugins_reload');
      const { mkdir } = await import('fs/promises');
      await mkdir(pluginsDir);
      const pluginDir = join(pluginsDir, 'reloadme');
      await mkdir(pluginDir);
      writeJSON(join(pluginDir, 'manifest.json'), {
        id: 'reloadme',
        name: 'Reload Me',
        version: '1.0.0',
        description: 'Test plugin',
        tags: [],
        capabilities: [{ id: 'cap', name: 'Cap', description: 'Test capability', inputSchema: { type: 'object' }, execute: 'cap.js' }]
      });
      await writeFile(join(pluginDir, 'cap.js'), `export const schema = {}; export async function execute() {}`);

      const loader = new PluginLoader({ pluginsDir });
      await loader.loadPlugin('reloadme');

      const loadedBefore = loader.getLoadedPlugins();
      expect(loadedBefore.length).toBe(1);
      const plugin = loadedBefore[0];
      const reloaded = await plugin.reload();
      expect(reloaded).toBeDefined();
      const loadedAfter = loader.getLoadedPlugins();
      expect(loadedAfter.length).toBe(1);
      expect(loadedAfter[0].manifest.id).toBe('reloadme');
    });
  });
});
