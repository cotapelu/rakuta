import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProviderModels, KILO_MODELS } from '../../../../extensions/providers/models/index.js';

// Mock the generated models module
vi.mock('../../../../extensions/providers/models/custom-models.generated.js', () => ({
  CUSTOM_MODELS: {
    myProvider: {
      model1: { id: 'model1', name: 'Model 1' },
      model2: { id: 'model2', name: 'Model 2' },
    },
  },
}));

describe('Providers Models Index', () => {
  beforeEach(() => {
    // Reset module cache to apply mock
    vi.resetModules();
  });

  it('returns generated models when provider exists', async () => {
    // Re-import after mock to ensure the module picks up the mocked generated models
    const { getProviderModels: getModels } = await import('../../../../extensions/providers/models/index.js');
    const models = getModels('myProvider');
    expect(models).toHaveLength(2);
    expect(models[0]).toMatchObject({ id: 'model1', name: 'Model 1' });
    expect(models[1]).toMatchObject({ id: 'model2', name: 'Model 2' });
  });

  it('falls back to hardcoded KILO_MODELS for kilo provider', async () => {
    const { getProviderModels: getModels } = await import('../../../../extensions/providers/models/index.js');
    const models = getModels('kilo');
    expect(models).toEqual(KILO_MODELS);
  });

  it('returns empty array for unknown provider', async () => {
    const { getProviderModels: getModels } = await import('../../../../extensions/providers/models/index.js');
    const models = getModels('unknown');
    expect(models).toEqual([]);
  });
});
