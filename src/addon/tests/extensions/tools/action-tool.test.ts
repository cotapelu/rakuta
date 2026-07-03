import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the actions registry; define mock actions inside the mock factory
vi.mock('../../../extensions/tools/actions/index.js', () => {
  const mockExecute = vi.fn().mockResolvedValue({
    isError: false,
    content: [{ type: 'text', text: 'action result' }],
    details: { custom: 'data' }
  });

  return {
    actions: {
      testAction: {
        description: 'Test Action',
        execute: mockExecute,
        getParameters: () => ({
          type: 'object',
          properties: {
            param1: { type: 'string' },
            flag: { type: 'boolean' }
          },
          required: ['param1']
        })
      },
      errorAction: {
        description: 'Error Action',
        execute: vi.fn().mockRejectedValue(new Error('action failed'))
      },
      failAction: {
        description: 'Fail Action',
        execute: vi.fn().mockResolvedValue({
          isError: true,
          content: [{ type: 'text', text: 'failed' }],
          details: { reason: 'bad' }
        })
      }
    }
  };
});

import { createActionTool } from '../../../extensions/tools/action-tool.js';

describe('action_tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error if action parameter is missing', async () => {
    const tool = createActionTool();
    const result = await tool.execute('call', {}, null, null, {} as any);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Missing required parameter: action');
  });

  it('should return error if action is unknown', async () => {
    const tool = createActionTool();
    const result = await tool.execute('call', { action: 'unknown_action' }, null, null, {} as any);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown action: unknown_action');
  });

  it('should call action execute and merge details', async () => {
    const tool = createActionTool();
    const result = await tool.execute('call', { action: 'testAction', param1: 'value', flag: true }, null, null, {} as any);

    // The mocked execute should have been called with args, cwd, signal, ctx
    // We can't easily access the mock directly because it's inside the mocked module; but we can infer from behavior
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toBe('action result');
    expect(result.details.action).toBe('testAction'); // merged
    expect(result.details.custom).toBe('data');
  });

  it('should propagate errors from action execute (rejected)', async () => {
    const tool = createActionTool();
    const result = await tool.execute('call', { action: 'errorAction' }, null, null, {} as any);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("❌ Error in action 'errorAction': action failed");
    expect(result.details.error).toBe('action failed');
  });

  it('should handle action returning isError true', async () => {
    const tool = createActionTool();
    const result = await tool.execute('call', { action: 'failAction' }, null, null, {} as any);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('failed');
    expect(result.details.action).toBe('failAction');
    expect(result.details.reason).toBe('bad');
  });
});
