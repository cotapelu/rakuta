import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock registry BEFORE importing extension
const mockRegistry = {
  _caps: new Map(),
  listAll: vi.fn(),
  get: vi.fn(),
  register: vi.fn(),
  unregister: vi.fn()
};
vi.mock('../../../extensions/capability-system/registry.js', () => ({
  getCapabilityRegistry: () => mockRegistry
}));

// Now import the tool builder
import { createCapabilityRouterTool } from '../../../extensions/capability-system/extension.js';
import type { Capability, CapabilityContext } from '../../../extensions/capability-system/types.js';

describe('Capability Router Tool', () => {
  let api: any;
  let tool: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRegistry.listAll.mockReturnValue([]);
    mockRegistry.get.mockReturnValue(undefined);
    api = {
      exec: vi.fn().mockResolvedValue({ code: 0, stdout: '', stderr: '' })
    };
    tool = createCapabilityRouterTool(api);
  });

  describe('execute', () => {
    it('returns error if capability param missing', async () => {
      const result = await tool.execute('call1', {}, null, null, {} as CapabilityContext);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Missing 'capability'");
    });

    it('returns not_found error if capability unknown', async () => {
      mockRegistry.listAll.mockReturnValue([
        { id: 'git.status', name: 'Git Status' },
        { id: 'dev.test', name: 'Run Tests' }
      ]);
      const result = await tool.execute('call2', { capability: 'unknown.cap' }, null, null, {} as CapabilityContext);
      expect(result.isError).toBe(true);
      expect(result.details.error).toBe('not_found');
    });

    it('calls capability.execute and returns result', async () => {
      const cap: Capability = {
        id: 'system.test',
        name: 'Test Cap',
        description: 'Test',
        pluginId: 'test',
        promptSnippet: '',
        promptGuidelines: [],
        parameters: { type: 'object', properties: {} },
        outputSchema: {},
        execute: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'OK' }],
          isError: false
        })
      };
      mockRegistry.listAll.mockReturnValue([cap]);
      mockRegistry.get.mockReturnValue(cap);

      const result = await tool.execute('call3', { capability: 'system.test', params: {} }, null, null, {} as CapabilityContext);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe('OK');
      expect(cap.execute).toHaveBeenCalledWith('call3', {}, null, null, expect.any(Object));
      expect(result.details?.capabilityId).toBe('system.test');
    });

    it('handles capability.execute throwing', async () => {
      const cap: Capability = {
        id: 'system.error',
        name: 'Error Cap',
        description: 'Err',
        pluginId: 'test',
        promptSnippet: '',
        promptGuidelines: [],
        parameters: { type: 'object', properties: {} },
        outputSchema: {},
        execute: vi.fn().mockRejectedValue(new Error('Boom'))
      };
      mockRegistry.listAll.mockReturnValue([cap]);
      mockRegistry.get.mockReturnValue(cap);

      const result = await tool.execute('call4', { capability: 'system.error', params: {} }, null, null, {} as CapabilityContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ Boom');
      expect(result.details?.error).toBe('Boom');
    });
  });

  describe('renderCall', () => {
    it('formats command string', () => {
      const comp = tool.renderCall(
        { capability: 'git.status', params: { repo: '/path', all: true } },
        { fg: (s: string) => s, bold: (s: string) => s },
        {}
      );
      expect(comp).toBeDefined();
    });
  });

  describe('renderResult', () => {
    it('uses custom renderer if capability has one', () => {
      const cap: Capability = {
        id: 'custom.render',
        name: 'Custom',
        description: '',
        pluginId: 'test',
        promptSnippet: '',
        promptGuidelines: [],
        parameters: { type: 'object', properties: {} },
        outputSchema: {},
        execute: vi.fn().mockResolvedValue({}),
        renderResult: vi.fn().mockReturnValue({ type: 'custom' })
      };
      mockRegistry.get.mockReturnValue(cap);

      const result = { content: [{ type: 'text', text: 'hi' }], details: { capabilityId: 'custom.render' } };
      const fakeTheme = { fg: (style: string, text: string) => text, bold: (text: string) => text };
      const context = { state: {}, lastComponent: null, invalidate: vi.fn(), isError: false };

      const custom = tool.renderResult(result, {}, fakeTheme, context);
      expect(custom).toEqual({ type: 'custom' });
    });

    it('builds default component when no custom renderer', () => {
      mockRegistry.get.mockReturnValue(null);
      const result = { content: [{ type: 'text', text: 'output line 1\nline2' }], details: {} };
      const comp = tool.renderResult(result, { expanded: false }, { fg: (s: string) => s }, { state: {}, lastComponent: null, invalidate: vi.fn(), isError: false });
      expect(comp).toBeDefined();
    });
  });
});
