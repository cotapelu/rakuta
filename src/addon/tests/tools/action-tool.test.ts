import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock actions/index.js first (hoisted)
vi.mock('../../extensions/tools/actions/index.js', () => ({
  actions: {}
}));

// Now import the mocked actions object
import { actions as mockedActions } from '../../extensions/tools/actions/index.js';
import { createActionTool, registerActionTool } from '../../extensions/tools/action-tool.js';
import type { ExtensionAPI, ToolResult } from '@earendil-works/pi-coding-agent';

// Helper to set up mock action
function setupMockAction(name: string, opts: { description?: string; execute?: any; getParameters?: () => any }) {
  mockedActions[name] = {
    description: opts.description || 'No description',
    execute: opts.execute || vi.fn(async () => ({ isError: false, content: [], details: {} })),
    getParameters: opts.getParameters,
  };
}

describe('ActionTool', () => {
  beforeEach(() => {
    // Reset mock actions
    Object.keys(mockedActions).forEach(key => delete mockedActions[key]);
    vi.clearAllMocks();
  });

  describe('createActionTool', () => {
    it('should create tool definition with correct basics', () => {
      setupMockAction('test.echo', { description: 'Echo back' });
      const tool = createActionTool();
      expect(tool.name).toBe('action_tool');
      expect(tool.label).toBe('Action Tool');
      expect(tool.description).toContain('Comprehensive tool');
    });

    it('should list available actions in parameters enum', () => {
      setupMockAction('test.echo', {});
      setupMockAction('test.error', {});
      const tool = createActionTool();
      expect(tool.parameters.properties.action.enum).toContain('test.echo');
      expect(tool.parameters.properties.action.enum).toContain('test.error');
    });

    it('should include action guidelines with examples', () => {
      setupMockAction('test.echo', {
        description: 'Echo',
        getParameters: () => ({
          type: 'object',
          properties: { message: { type: 'string' } },
          required: ['message'],
        }),
      });
      const tool = createActionTool();
      const guidelines = tool.promptGuidelines as string[];
      expect(guidelines.some(l => l.includes('test.echo'))).toBe(true);
      expect(guidelines.some(l => l.includes('Example:'))).toBe(true);
    });
  });

  describe('execute', () => {
    it('should return error if action missing', async () => {
      const tool = createActionTool();
      const result = await tool.execute('call', {}, undefined, undefined, {} as any);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required parameter: action');
    });

    it('should return error for unknown action', async () => {
      const tool = createActionTool();
      const result = await tool.execute('call', { action: 'unknown.action' }, undefined, undefined, {} as any);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown action: unknown.action');
    });

    it('should call action.execute with args, cwd, signal, ctx', async () => {
      const echoExec = vi.fn(async (args: any) => ({ isError: false, content: [{ type: 'text', text: args.message }], details: {} }));
      setupMockAction('test.echo', { execute: echoExec });
      const tool = createActionTool();
      const ctx = { session: { cwd: '/tmp' } } as any;
      const result = await tool.execute('call', { action: 'test.echo', message: 'hello' }, undefined, undefined, ctx);

      expect(result.isError).toBe(false);
      expect(echoExec).toHaveBeenCalledWith({ message: 'hello' }, '/tmp', undefined, ctx);
    });

    it('should use process.cwd if ctx.session.cwd undefined', async () => {
      const echoExec = vi.fn(async () => ({ isError: false, content: [], details: {} }));
      setupMockAction('test.echo', { execute: echoExec });
      const tool = createActionTool();
      const ctx = { session: undefined } as any;
      const originalCwd = process.cwd;
      vi.spyOn(process, 'cwd').mockReturnValue('/original');
      const result = await tool.execute('call', { action: 'test.echo' }, undefined, undefined, ctx);
      expect(echoExec).toHaveBeenCalledWith(expect.any(Object), '/original', undefined, ctx);
      vi.restoreAllMocks();
    });

    it('should propagate action errors (isError true)', async () => {
      setupMockAction('test.error', {
        execute: vi.fn(async () => ({ isError: true, content: [{ type: 'text', text: 'Oops' }], details: {} })),
      });
      const tool = createActionTool();
      const result = await tool.execute('call', { action: 'test.error' }, undefined, undefined, {} as any);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Oops');
    });

    it('should catch exceptions and return error result', async () => {
      setupMockAction('test.echo', {
        execute: vi.fn(async () => { throw new Error('unexpected'); }),
      });
      const tool = createActionTool();
      const result = await tool.execute('call', { action: 'test.echo', message: 'oops' }, undefined, undefined, {} as any);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error in action');
      expect(result.details.error).toBe('unexpected');
    });
  });

  // Additional tests for createActionTool coverage
  describe('createActionTool edge cases', () => {
    it('should handle actions with no getParameters', () => {
      setupMockAction('plain.action', {});
      const tool = createActionTool();
      const guidelines = tool.promptGuidelines as string[];
      const line = guidelines.find(l => l.includes('plain.action'));
      expect(line).toContain('Example: action_tool({ action: \'plain.action\', args: {} })');
    });

    it('should handle actions with optional parameters and defaults', () => {
      setupMockAction('opt.action', {
        description: 'Optional',
        getParameters: () => ({
          type: 'object',
          properties: {
            required1: { type: 'string' },
            optional1: { type: 'number', default: 42 },
          },
          required: ['required1'],
        }),
      });
      const tool = createActionTool();
      const guidelines = tool.promptGuidelines as string[];
      const line = guidelines.find(l => l.includes('opt.action'));
      expect(line).toContain('Example:');
      expect(line).toContain('required1');
      expect(line).toContain('42');
    });

    it('should handle actions with array and object types', () => {
      setupMockAction('complex.action', {
        description: 'Complex',
        getParameters: () => ({
          type: 'object',
          properties: {
            list: { type: 'array', items: { type: 'string' } },
            config: { type: 'object' },
          },
          required: ['list'],
        }),
      });
      const tool = createActionTool();
      const guidelines = tool.promptGuidelines as string[];
      const line = guidelines.find(l => l.includes('complex.action'));
      expect(line).toContain('list');
      expect(line).toContain('[]'); // array default empty
      // config is optional without default, so not shown
    });

    it('should handle getParameters throwing (fallback to generic)', () => {
      setupMockAction('bad.action', {
        description: 'Bad schema',
        getParameters: () => { throw new Error('schema error'); },
      });
      const tool = createActionTool();
      const guidelines = tool.promptGuidelines as string[];
      const line = guidelines.find(l => l.includes('bad.action'));
      expect(line).toContain('Example: action_tool({ action: \'bad.action\', args: {} })');
    });

    it('should handle empty actions registry', () => {
      const tool = createActionTool();
      expect(tool.parameters.properties.action.enum).toHaveLength(0);
      // Even with no actions, guidelines include header lines
      expect(tool.promptGuidelines).toContain('Use action_tool for performing system operations.');
      expect(tool.promptGuidelines).toContain('Available actions:');
    });

    it('should handle optional parameters without defaults', () => {
      setupMockAction('optnodefault.action', {
        description: 'Optional no default',
        getParameters: () => ({
          type: 'object',
          properties: {
            required1: { type: 'string' },
            optional1: { type: 'number' },
          },
          required: ['required1'],
        }),
      });
      const tool = createActionTool();
      const guidelines = tool.promptGuidelines as string[];
      const line = guidelines.find(l => l.includes('optnodefault.action'));
      expect(line).toContain('Example:');
      expect(line).toContain('required1');
      expect(line).not.toContain('optional1'); // optional without default omitted
    });

    it('should handle actions with only optional parameters (no required)', () => {
      setupMockAction('optonly.action', {
        description: 'All optional',
        getParameters: () => ({
          type: 'object',
          properties: {
            opt1: { type: 'string', default: 'default' },
          },
          required: [],
        }),
      });
      const tool = createActionTool();
      const guidelines = tool.promptGuidelines as string[];
      const line = guidelines.find(l => l.includes('optonly.action'));
      // Since no required params, example stays generic
      expect(line).toContain('Example: action_tool({ action: \'optonly.action\', args: {} })');
    });
  });

  describe('registerActionTool', () => {
    it('should register the tool with API', () => {
      const api = { registerTool: vi.fn() } as unknown as ExtensionAPI;
      registerActionTool(api);
      expect(api.registerTool).toHaveBeenCalledWith(expect.objectContaining({ name: 'action_tool' }));
    });
  });

  // Additional type coverage tests
  describe('createActionTool type handling', () => {
    it('should handle number parameter type', () => {
      setupMockAction('num.action', {
        description: 'Number',
        getParameters: () => ({
          type: 'object',
          properties: { count: { type: 'number' } },
          required: ['count'],
        }),
      });
      const tool = createActionTool();
      const line = (tool.promptGuidelines as string[]).find(l => l.includes('num.action'));
      expect(line).toContain('"count":1');
    });

    it('should handle boolean parameter type', () => {
      setupMockAction('bool.action', {
        description: 'Boolean',
        getParameters: () => ({
          type: 'object',
          properties: { flag: { type: 'boolean' } },
          required: ['flag'],
        }),
      });
      const tool = createActionTool();
      const line = (tool.promptGuidelines as string[]).find(l => l.includes('bool.action'));
      expect(line).toContain('"flag":true');
    });

    it('should handle array parameter type', () => {
      setupMockAction('arr.action', {
        description: 'Array',
        getParameters: () => ({
          type: 'object',
          properties: { items: { type: 'array' } },
          required: ['items'],
        }),
      });
      const tool = createActionTool();
      const line = (tool.promptGuidelines as string[]).find(l => l.includes('arr.action'));
      expect(line).toContain('"items":[]');
    });

    it('should handle object parameter type', () => {
      setupMockAction('obj.action', {
        description: 'Object',
        getParameters: () => ({
          type: 'object',
          properties: { config: { type: 'object' } },
          required: ['config'],
        }),
      });
      const tool = createActionTool();
      const line = (tool.promptGuidelines as string[]).find(l => l.includes('obj.action'));
      expect(line).toContain('"config":{}');
    });
  });
});
