import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock registry
const mockRegistry = {
  listAll: vi.fn(),
  get: vi.fn()
};
vi.mock('../../../extensions/capability-system/registry.js', () => ({
  getCapabilityRegistry: () => mockRegistry
}));

import { createCapabilityRouterTool, truncateToVisualLines, keyHint } from '../../../extensions/capability-system/extension.js';
import type { Capability } from '../../../extensions/capability-system/types.js';

describe('Capability Router Tool (extra)', () => {
  let api: any;
  let tool: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRegistry.listAll.mockReturnValue([]);
    mockRegistry.get.mockReturnValue(undefined);
    api = { exec: vi.fn().mockResolvedValue({ code: 0, stdout: '', stderr: '' }) };
    tool = createCapabilityRouterTool(api);
  });

  describe('truncateToVisualLines', () => {
    it('handles empty text', () => {
      const res = truncateToVisualLines('', 5, 10);
      expect(res.visualLines).toEqual([]);
      expect(res.skippedCount).toBe(0);
    });

    it('splits long lines', () => {
      const long = 'a'.repeat(25);
      const res = truncateToVisualLines(long, 2, 10);
      expect(res.visualLines.length).toBeLessThanOrEqual(2);
      expect(res.skippedCount).toBeGreaterThan(0);
    });

    it('respects maxLines', () => {
      const text = 'line1\nline2\nline3';
      const res = truncateToVisualLines(text, 2, 10);
      expect(res.visualLines.length).toBe(2);
      expect(res.skippedCount).toBe(1);
    });
  });

  describe('keyHint', () => {
    it('returns fallback when key undefined', () => {
      expect(keyHint('enter', 'Submit')).toBe('Submit');
    });
  });

  describe('execute', () => {
    it('handles capability.execute throwing', async () => {
      const cap: Capability = {
        id: 'test.error',
        name: 'Error',
        description: '',
        pluginId: 'p',
        promptSnippet: '',
        promptGuidelines: [],
        parameters: { type: 'object', properties: {} },
        outputSchema: {},
        execute: vi.fn().mockRejectedValue(new Error('Boom'))
      };
      mockRegistry.listAll.mockReturnValue([cap]);
      mockRegistry.get.mockReturnValue(cap);

      const result = await tool.execute('call', { capability: 'test.error', params: {} }, null, null, {} as any);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ Boom');
    });
  });

  describe('renderResult', () => {
    it('renders empty output gracefully', () => {
      mockRegistry.get.mockReturnValue(null);
      const result = { content: [], details: {} };
      const comp = tool.renderResult(result, { expanded: false }, { fg: (s: string) => s }, { state: {}, lastComponent: null, invalidate: vi.fn(), isError: false });
      expect(comp).toBeDefined();
    });

    it('handles expanded option', () => {
      mockRegistry.get.mockReturnValue(null);
      const result = { content: [{ type: 'text', text: 'some output' }], details: {} };
      const comp = tool.renderResult(result, { expanded: true }, { fg: (s: string) => s }, { state: {}, lastComponent: null, invalidate: vi.fn(), isError: false });
      expect(comp).toBeDefined();
    });
  });

  describe('renderCall', () => {
    it('formats command with array params', () => {
      const comp = tool.renderCall(
        { capability: 'git.commit', params: { files: ['a.txt', 'b.txt'], message: 'fix' } },
        { fg: (s: string) => s, bold: (s: string) => s },
        {}
      );
      expect(comp).toBeDefined();
    });

    it('handles object params', () => {
      const comp = tool.renderCall(
        { capability: 'dev.test', params: { config: { runtime: 120, coverage: true } } },
        { fg: (s: string) => s, bold: (s: string) => s },
        {}
      );
      expect(comp).toBeDefined();
    });
  });
});
