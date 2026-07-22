import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock render-utils
vi.mock('../../../extensions/utils/render-utils.js', () => ({
  styleError: (theme: any, text: string) => text,
}));

// Mock @earendil-works/pi-tui Text
vi.mock('@earendil-works/pi-tui', () => ({
  Text: class Text {
    text: string;
    constructor(text: string, _x: number, _y: number) {
      this.text = text;
    }
  },
}));

import { registerMemoryRenderer } from '../../../extensions/renderers/memory-renderer.ts';

describe('Memory Renderer Edge Cases', () => {
  let mockApi: any;
  let capturedRenderer: any;

  beforeEach(() => {
    mockApi = { registerMessageRenderer: vi.fn() };
    capturedRenderer = null;
    (mockApi.registerMessageRenderer as any).mockImplementation((type: string, fn: any) => {
      if (type === 'memory_result') capturedRenderer = fn;
    });
    registerMemoryRenderer(mockApi);
  });

  function mockTheme() {
    return {
      fg: (c: string, v: string) => v,
      bold: (v: string) => v,
      dim: (v: string) => v,
      warning: (v: string) => v,
      accent: (v: string) => v,
      muted: (v: string) => v,
    };
  }

  it('returns early if api.registerMessageRenderer is not a function', () => {
    const badApi = { registerMessageRenderer: 'not a function' } as any;
    // Should not throw
    registerMemoryRenderer(badApi);
    // Nothing to capture; verify no registration happened
    expect(badApi.registerMessageRenderer).toBe('not a function');
  });

  it('skips action line when details.action is falsy', () => {
    const msg = {
      details: { memories: [] }, // no action
      content: [{ text: 'Some content' }]
    };
    const result = capturedRenderer(msg, {}, mockTheme());
    expect(result.text).not.toContain('Action:');
    expect(result.text).toContain('Some content');
  });

  it('does not show tags line when memory has no tags in get view', () => {
    const mem = { id: 5, text: 'Note', created: Date.now() }; // no tags
    const msg = {
      details: { action: 'get', target: mem },
      content: []
    };
    const result = capturedRenderer(msg, {}, mockTheme());
    expect(result.text).toContain('Memory #5');
    expect(result.text).toContain('Note');
    expect(result.text).not.toContain('Tags:');
  });
});
