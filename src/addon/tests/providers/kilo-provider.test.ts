import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

const BASE_MODEL = { id: 'base-model', baseUrl: 'https://api.kilo.ai/api/gateway' };

const LIVE_PAYLOAD = {
  data: [
    {
      id: 'live-new',
      name: 'Live New',
      isFree: false,
      architecture: { input_modalities: ['text'] },
      top_provider: { context_length: 2000, max_completion_tokens: 200 },
      context_length: 2000,
      pricing: { prompt: '0.000001', completion: '0.000002' },
      supported_parameters: ['tools'],
    },
  ],
};

describe('Kilo Provider', () => {
  let mockApi: ExtensionAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = { registerProvider: vi.fn() } as any;
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps build-time roster when live fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    vi.doMock('../../extensions/providers/models/index.js', () => ({
      KILO_MODELS_ALL: [BASE_MODEL],
    }));

    const { registerKiloProvider } = await import('../../extensions/providers/kilo-provider.js');
    await registerKiloProvider(mockApi);

    expect(mockApi.registerProvider).toHaveBeenCalledWith('kilo', expect.objectContaining({
      baseUrl: 'https://api.kilo.ai/api/gateway',
      apiKey: '$KILO_API_KEY',
      api: 'openai-completions',
      models: [BASE_MODEL],
    }));
  });

  it('merges live rows on top of build-time roster', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(LIVE_PAYLOAD),
    }));
    vi.doMock('../../extensions/providers/models/index.js', () => ({
      KILO_MODELS_ALL: [BASE_MODEL],
    }));

    const { registerKiloProvider } = await import('../../extensions/providers/kilo-provider.js');
    await registerKiloProvider(mockApi);

    const call = (mockApi.registerProvider as any).mock.calls[0][1];
    const ids = call.models.map((m: any) => m.id);
    expect(ids).toContain('base-model');
    expect(ids).toContain('live-new');
  });

  it('skips free rows from the live listing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [{ id: 'free-one', isFree: true }] }),
    }));
    vi.doMock('../../extensions/providers/models/index.js', () => ({
      KILO_MODELS_ALL: [BASE_MODEL],
    }));

    const { registerKiloProvider } = await import('../../extensions/providers/kilo-provider.js');
    await registerKiloProvider(mockApi);

    const call = (mockApi.registerProvider as any).mock.calls[0][1];
    const ids = call.models.map((m: any) => m.id);
    expect(ids).toEqual(['base-model']);
  });
});
