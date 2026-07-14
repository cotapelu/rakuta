import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock registry
const mockRegistry = {
  listAll: vi.fn(),
  get: vi.fn()
};
vi.mock('../../../extensions/capability-system/registry.js', () => ({
  getCapabilityRegistry: () => mockRegistry
}));

import { createCapabilityRouterTool } from '../../../extensions/capability-system/extension.js';
import type { Capability } from '../../../extensions/capability-system/types.js';

describe('Capability Router Tool (timing & cache)', () => {
  let api: any;
  let tool: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRegistry.listAll.mockReturnValue([]);
    mockRegistry.get.mockReturnValue(undefined);
    api = { exec: vi.fn().mockResolvedValue({ code: 0, stdout: '', stderr: '' }) };
    tool = createCapabilityRouterTool(api);
  });

  it('handles interval start/stop in renderResult', () => {
    const state: any = { startedAt: Date.now(), endedAt: undefined, interval: undefined };
    const context: any = { state, lastComponent: null, invalidate: vi.fn(), isError: false };
    const result = { content: [{ type: 'text', text: 'ok' }], details: {} };

    // First partial render should set interval
    tool.renderResult(result, { isPartial: true }, { fg: (s: string) => s }, context);
    expect(state.interval).toBeDefined();

    // Subsequent partial renders should not create new interval
    const interval1 = state.interval;
    tool.renderResult(result, { isPartial: true }, { fg: (s: string) => s }, context);
    expect(state.interval).toBe(interval1);

    // Final render should clear interval
    tool.renderResult(result, { isPartial: false }, { fg: (s: string) => s }, context);
    expect(state.interval).toBeUndefined();
    expect(state.endedAt).toBeDefined();
  });

  it('handles cache invalidation on width change', () => {
    const state: any = { cachedWidth: undefined, cachedLines: undefined, cachedSkipped: undefined };
    const context: any = { state, lastComponent: null, invalidate: vi.fn(), isError: false };
    const result = { content: [{ type: 'text', text: 'line1\nline2' }], details: {} };

    // First render caches width
    tool.renderResult(result, { expanded: false }, { fg: (s: string) => s }, context);
    expect(state.cachedWidth).toBeDefined();

    // Change width (simulate resize) should invalidate
    state.cachedWidth = 20; // different from actual
    tool.renderResult(result, { expanded: false }, { fg: (s: string) => s }, context);
    expect(state.cachedLines).toBeUndefined();
  });
});
