import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerMemoryTool } from '../../../extensions/tools/memory-tool.js';
import type { ExtensionAPI, ExtensionContext } from '@earendil-works/pi-coding-agent';

function mockTheme() {
  return {
    fg: (color: string, text: string) => `[${color}:${text}]`,
    bold: (text: string) => `**${text}**`,
    dim: (text: string) => `::${text}::`,
    muted: (text: string) => `--${text}--`,
    accent: (text: string) => `++${text}++`,
    warning: (text: string) => `!!${text}!!`,
    success: (text: string) => `$${text}$$`,
    error: (text: string) => `@@${text}@@`,
    toolTitle: (text: string) => `##${text}##`,
  } as any;
}

describe('memory tool renderResult', () => {
  let mockApi: ExtensionAPI;
  let tool: any;

  beforeEach(() => {
    mockApi = {
      registerTool: vi.fn((t) => { tool = t; }),
      appendEntry: vi.fn(),
      on: vi.fn(),
    } as any;
    registerMemoryTool(mockApi);
  });

  function renderResult(action: string, details: any = {}) {
    const result = { content: [{ type: 'text' as const, text: '' }], details: { ...details, action }, isError: false };
    return tool.renderResult(result, { expanded: false, isPartial: false }, mockTheme(), {} as ExtensionContext);
  }

  it('renders add success with stored id', () => {
    const out = renderResult('add', { memories: [{ id: 4 }] });
    expect(out.text).toContain('Stored');
    expect(out.text).toContain('#4');
  });

  it('renders list when count > 0', () => {
    const out = renderResult('list', { memories: [{ id: 1 }, { id: 2 }] });
    expect(out.text).toContain('2 memories');
  });

  it('renders list empty state', () => {
    const out = renderResult('list', { memories: [] });
    // dimmed "No memories"
    expect(out.text).toContain('No memories');
  });

  it('renders get success', () => {
    const out = renderResult('get', {});
    expect(out.text).toContain('get');
  });

  it('renders delete success', () => {
    const out = renderResult('delete', {});
    expect(out.text).toContain('delete');
  });

  it('renders clear success', () => {
    const out = renderResult('clear', {});
    expect(out.text).toContain('clear');
  });

  it('renders search success', () => {
    const out = renderResult('search', { query: 'test', count: 2 });
    expect(out.text).toContain('search');
  });

  it('renders default with muted content when no content returns empty muted', () => {
    const out = renderResult('unknown', {});
    // default: th.fg("muted", result.content?.[0]?.text || "")
    expect(out.text).toContain('muted');
  });

  it('renders error when result.isError', () => {
    const result = { content: [], details: { error: 'fail' }, isError: true };
    const out = tool.renderResult(result, { expanded: false, isPartial: false }, mockTheme(), {} as any);
    expect(out.text).toContain('Error: fail');
  });

  it('renders processing when isPartial', () => {
    const result = { content: [], details: {}, isError: false };
    const out = tool.renderResult(result, { expanded: false, isPartial: true }, mockTheme(), {} as any);
    expect(out.text).toContain('Processing');
  });
});
