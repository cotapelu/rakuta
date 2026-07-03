import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerCopyCommand } from '../../extensions/commands/copy-command.js';

// Mock the external copyToClipboard
vi.mock('@earendil-works/pi-coding-agent', () => ({
  copyToClipboard: vi.fn(),
}));

import { copyToClipboard } from '@earendil-works/pi-coding-agent';

function mockCtx(overrides: any = {}) {
  return {
    sessionManager: null,
    ui: {
      notify: vi.fn(),
    },
    ...overrides,
  };
}

function makeMessage(role: string, content: any) {
  return { role, content };
}

function makeNode(entry: any) {
  return { entry };
}

describe('Copy Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers command', () => {
    const api = { registerCommand: vi.fn() };
    registerCopyCommand(api);
    expect(api.registerCommand).toHaveBeenCalledWith('copy', expect.any(Object));
  });

  it('shows error if sessionManager not available', async () => {
    const api = { registerCommand: vi.fn() };
    registerCopyCommand(api);
    const handler = api.registerCommand.mock.calls[0][1].handler;
    const ctx = mockCtx({ sessionManager: null });
    await handler('', ctx);
    expect(ctx.ui.notify).toHaveBeenCalledWith('Session manager not available', 'error');
  });

  it('shows error if tree empty', async () => {
    const api = { registerCommand: vi.fn() };
    registerCopyCommand(api);
    const handler = api.registerCommand.mock.calls[0][1].handler;
    const ctx = mockCtx({ sessionManager: { getTree: () => [] } });
    await handler('', ctx);
    expect(ctx.ui.notify).toHaveBeenCalledWith('No session history', 'error');
  });

  it('shows error if no assistant message found', async () => {
    const api = { registerCommand: vi.fn() };
    registerCopyCommand(api);
    const handler = api.registerCommand.mock.calls[0][1].handler;
    const tree = [
      makeNode({ type: 'message', message: makeMessage('user', [{ type: 'text', text: 'hello' }]) }),
    ];
    const ctx = mockCtx({ sessionManager: { getTree: () => tree } });
    await handler('', ctx);
    expect(ctx.ui.notify).toHaveBeenCalledWith('No assistant response found', 'error');
  });

  it('copies last assistant message text', async () => {
    const api = { registerCommand: vi.fn() };
    registerCopyCommand(api);
    const handler = api.registerCommand.mock.calls[0][1].handler;
    const tree = [
      makeNode({ type: 'message', message: makeMessage('assistant', [{ type: 'text', text: 'Hi there!' }]) }),
      makeNode({ type: 'message', message: makeMessage('user', [{ type: 'text', text: 'Hello' }]) }),
    ];
    const ctx = mockCtx({ sessionManager: { getTree: () => tree } });
    (copyToClipboard as any).mockResolvedValue(undefined);
    await handler('', ctx);
    expect(copyToClipboard).toHaveBeenCalledWith('Hi there!');
    expect(ctx.ui.notify).toHaveBeenCalledWith('Copied last assistant response to clipboard', 'info');
  });

  it('concatenates multiple text parts', async () => {
    const api = { registerCommand: vi.fn() };
    registerCopyCommand(api);
    const handler = api.registerCommand.mock.calls[0][1].handler;
    const tree = [
      makeNode({
        type: 'message',
        message: makeMessage('assistant', [
          { type: 'text', text: 'Part1' },
          { type: 'text', text: 'Part2' },
        ]),
      }),
    ];
    const ctx = mockCtx({ sessionManager: { getTree: () => tree } });
    await handler('', ctx);
    expect(copyToClipboard).toHaveBeenCalledWith('Part1\nPart2');
  });

  it('handles copy error gracefully', async () => {
    const api = { registerCommand: vi.fn() };
    registerCopyCommand(api);
    const handler = api.registerCommand.mock.calls[0][1].handler;
    const tree = [
      makeNode({ type: 'message', message: makeMessage('assistant', [{ type: 'text', text: 'Oops' }]) }),
    ];
    const ctx = mockCtx({ sessionManager: { getTree: () => tree } });
    (copyToClipboard as any).mockRejectedValue(new Error('clipboard failure'));
    await handler('', ctx);
    expect(ctx.ui.notify).toHaveBeenCalledWith(expect.stringContaining('Failed to copy'), 'error');
  });

  it('skips non-message entries and finds assistant', async () => {
    const api = { registerCommand: vi.fn() };
    registerCopyCommand(api);
    const handler = api.registerCommand.mock.calls[0][1].handler;
    const tree = [
      makeNode({ type: 'tool_result' }), // not a message
      makeNode({ type: 'message', message: makeMessage('assistant', [{ type: 'text', text: 'Result' }]) }),
    ];
    const ctx = mockCtx({ sessionManager: { getTree: () => tree } });
    (copyToClipboard as any).mockResolvedValue(undefined);
    await handler('', ctx);
    expect(copyToClipboard).toHaveBeenCalledWith('Result');
  });

  it('does not copy if assistant message has empty content', async () => {
    const api = { registerCommand: vi.fn() };
    registerCopyCommand(api);
    const handler = api.registerCommand.mock.calls[0][1].handler;
    const tree = [
      makeNode({ type: 'message', message: { role: 'assistant', content: [] } }),
    ];
    const ctx = mockCtx({ sessionManager: { getTree: () => tree } });
    await handler('', ctx);
    expect(copyToClipboard).not.toHaveBeenCalled();
    expect(ctx.ui.notify).toHaveBeenCalledWith('No assistant response found', 'error');
  });

  it('handles message content that is not an array', async () => {
    const api = { registerCommand: vi.fn() };
    registerCopyCommand(api);
    const handler = api.registerCommand.mock.calls[0][1].handler;
    const tree = [
      makeNode({ type: 'message', message: { role: 'assistant', content: 'plain string' } }),
    ];
    const ctx = mockCtx({ sessionManager: { getTree: () => tree } });
    await handler('', ctx);
    expect(copyToClipboard).not.toHaveBeenCalled();
    expect(ctx.ui.notify).toHaveBeenCalledWith('No assistant response found', 'error');
  });

  it('handles assistant message with undefined content', async () => {
    const api = { registerCommand: vi.fn() };
    registerCopyCommand(api);
    const handler = api.registerCommand.mock.calls[0][1].handler;
    const tree = [
      makeNode({ type: 'message', message: { role: 'assistant' } }), // no content
    ];
    const ctx = mockCtx({ sessionManager: { getTree: () => tree } });
    await handler('', ctx);
    expect(copyToClipboard).not.toHaveBeenCalled();
    expect(ctx.ui.notify).toHaveBeenCalledWith('No assistant response found', 'error');
  });
});
