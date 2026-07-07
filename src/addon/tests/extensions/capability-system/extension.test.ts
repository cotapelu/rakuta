import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock plugin-loader
vi.mock('../../../extensions/capability-system/plugin-loader.js', () => ({
  createPluginLoader: vi.fn(),
  getGlobalLoader: vi.fn(),
  setGlobalLoader: vi.fn()
}));

// Mock registry
vi.mock('../../../extensions/capability-system/registry.js', () => ({
  getCapabilityRegistry: vi.fn()
}));

// Mock prompt-integration
vi.mock('../../../extensions/capability-system/prompt-integration.js', () => ({
  createCapabilityDiscoveryCapability: vi.fn(() => ({ id: 'system.capabilities' }))
}));

import capabilitySystemExtension from '../../../extensions/capability-system/extension';
import { createPluginLoader, getGlobalLoader, setGlobalLoader } from '../../../extensions/capability-system/plugin-loader';
import { getCapabilityRegistry } from '../../../extensions/capability-system/registry';

describe('capabilitySystemExtension', () => {
  let api: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for createPluginLoader to return a loader with loadAll
    const mockLoader = { loadAll: vi.fn().mockResolvedValue({ totalPlugins: 0, totalCapabilities: 0, errors: [] }) };
    (createPluginLoader as any).mockReturnValue(mockLoader);

    // Default registry: has() false, register() noop
    const mockRegistry = {
      has: vi.fn().mockReturnValue(false),
      register: vi.fn(),
      listAll: vi.fn().mockReturnValue([])
    };
    (getCapabilityRegistry as any).mockReturnValue(mockRegistry);

    api = { registerTool: vi.fn(), registerCommand: vi.fn() };
  });

  it('initializes plugin loader and registers capability router tool', async () => {
    await capabilitySystemExtension(api);

    expect(createPluginLoader).toHaveBeenCalled();
    const loader = (createPluginLoader as any).mock.results[0].value;
    expect(loader.loadAll).toHaveBeenCalled();

    expect(api.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'capability.router',
        description: expect.any(String),
        execute: expect.any(Function)
      })
    );
  });

  it('does not re-register discovery capability if already present', async () => {
    const mockRegistry = {
      has: vi.fn().mockReturnValue(true),
      register: vi.fn(),
      listAll: vi.fn().mockReturnValue([])
    };
    (getCapabilityRegistry as any).mockReturnValue(mockRegistry);

    await capabilitySystemExtension(api);

    expect(mockRegistry.register).not.toHaveBeenCalled();
  });
});
