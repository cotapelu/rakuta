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
      expect(stats.errors[0].error).toContain('Missing execute function');
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
});
