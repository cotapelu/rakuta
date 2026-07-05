import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @earendil-works/pi-tui Text
vi.mock('@earendil-works/pi-tui', () => ({
  Text: class Text {
    constructor(public text: string, _x: number, _y: number) {}
  },
}));

// Mock @earendil-works/pi-coding-agent tool factories as vi.fn()
vi.mock('@earendil-works/pi-coding-agent', () => ({
  createReadToolDefinition: vi.fn(),
  createLsToolDefinition: vi.fn(),
  createFindToolDefinition: vi.fn(),
  createGrepToolDefinition: vi.fn(),
  createBashToolDefinition: vi.fn(),
}));

// Import mocked factories
import {
  createReadToolDefinition,
  createLsToolDefinition,
  createFindToolDefinition,
  createGrepToolDefinition,
  createBashToolDefinition,
} from '@earendil-works/pi-coding-agent';

// Import the module under test
import {
  createSubLoaderToolDefinition,
  registerSubToolLoaderExtension,
} from '../../../extensions/tools/subtool-loader.js';

describe('SubTool Loader', () => {
  let ctx: any;
  let signal: AbortSignal;
  let onUpdate: any;
  let def: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Fresh context and helpers per test
    ctx = { cwd: '/workdir' };
    const controller = new AbortController();
    signal = controller.signal;
    onUpdate = vi.fn();
    def = createSubLoaderToolDefinition();

    // Default mock implementations: return a tool with a mock execute that resolves to success
    const mockExecute = vi.fn().mockResolvedValue({ isError: false, content: [] });
    const defaultTool = (subtool: string) => ({ name: subtool, execute: mockExecute });
    createReadToolDefinition.mockImplementation((cwd) => defaultTool('read'));
    createLsToolDefinition.mockImplementation((cwd) => defaultTool('ls'));
    createFindToolDefinition.mockImplementation((cwd) => defaultTool('find'));
    createGrepToolDefinition.mockImplementation((cwd) => defaultTool('grep'));
    createBashToolDefinition.mockImplementation((cwd, options) => defaultTool('bash'));
  });

  describe('createSubLoaderToolDefinition', () => {
    it('should have correct metadata', () => {
      const def = createSubLoaderToolDefinition();
      expect(def.name).toBe('subtool_loader');
      expect(def.label).toBe('SubTool Loader');
      expect(def.description).toContain('Unified access');
      expect(def.parameters).toMatchObject({
        type: 'object',
        properties: {
          subtool: { type: 'string', enum: ['http', 'ls', 'find', 'grep', 'read'] },
          args: { type: 'object' },
        },
        required: ['subtool', 'args'],
      });
      expect(typeof def.execute).toBe('function');
      expect(typeof def.renderCall).toBe('function');
    });

    it('renderCall returns formatted Text', () => {
      const def = createSubLoaderToolDefinition();
      const result = def.renderCall({ subtool: 'ls', args: { path: '/tmp' } }, null as any);
      expect(result.text).toBe('subtool_loader → ls (path="/tmp")');
    });
  });

  describe('registerSubToolLoaderExtension', () => {
    it('registers the tool with API', () => {
      const api = { registerTool: vi.fn() };
      registerSubToolLoaderExtension(api as any);
      expect(api.registerTool).toHaveBeenCalledTimes(1);
      expect(api.registerTool).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('executeSubtool (via tool.execute)', () => {
    it('returns error when subtool is empty', async () => {
      const result = await def.execute('call-1', { subtool: '', args: {} }, signal, onUpdate, ctx);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required parameter: subtool');
    });

    it('returns error when subtool is unknown', async () => {
      const result = await def.execute('call-2', { subtool: 'unknown', args: {} }, signal, onUpdate, ctx);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown sub-tool: unknown');
    });

    it('http returns error when url is missing', async () => {
      const result = await def.execute('call-3', { subtool: 'http', args: {} }, signal, onUpdate, ctx);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required parameter: url');
    });

    it('http returns error when url is invalid', async () => {
      const result = await def.execute('call-4', { subtool: 'http', args: { url: 'not a url' } }, signal, onUpdate, ctx);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid URL');
    });

    it('http constructs curl command and calls bash tool.execute', async () => {
      const url = 'https://example.com';
      const method = 'POST';
      const headers = { 'X-Test': 'value' };
      const body = 'test body';
      const result = await def.execute('call-5', { subtool: 'http', args: { url, method, headers, body } }, signal, onUpdate, ctx);
      expect(result.isError).toBe(false);
      // Check createBashToolDefinition was called with correct args
      expect(createBashToolDefinition).toHaveBeenCalledWith(ctx.cwd, { commandPrefix: '' });
      // Get the bash tool instance
      const bashTool = createBashToolDefinition.mock.results[0].value;
      expect(bashTool.execute).toHaveBeenCalledTimes(1);
      const [toolCallId, argObj] = bashTool.execute.mock.calls[0];
      expect(typeof toolCallId).toBe('string');
      const command = argObj.command;
      // Check command parts (quoted by JSON.stringify)
      expect(command).toContain('curl');
      expect(command).toContain(url);
      expect(command).toContain('-X');
      expect(command).toContain('POST');
      expect(command).toContain('-H');
      expect(command).toContain('X-Test');
      expect(command).toContain('value');
      expect(command).toContain('test body');
    });

    it('other subtool (read) calls appropriate factory and tool.execute', async () => {
      const path = '/etc/hosts';
      const result = await def.execute('call-6', { subtool: 'read', args: { path } }, signal, onUpdate, ctx);
      expect(result.isError).toBe(false);
      expect(createReadToolDefinition).toHaveBeenCalledWith(ctx.cwd);
      const readTool = createReadToolDefinition.mock.results[0].value;
      expect(readTool.execute).toHaveBeenCalledWith(
        expect.any(String),
        { path },
        signal,
        onUpdate,
        ctx
      );
    });

    it('other subtool (ls) works', async () => {
      const result = await def.execute('call-7', { subtool: 'ls', args: { path: '/tmp' } }, signal, onUpdate, ctx);
      expect(result.isError).toBe(false);
      expect(createLsToolDefinition).toHaveBeenCalledWith(ctx.cwd);
    });

    it('tool.execute rejection is caught and returned as error', async () => {
      // Override read tool execute to reject
      const mockReject = vi.fn().mockRejectedValue(new Error('fail'));
      createReadToolDefinition.mockReturnValue({ name: 'read', execute: mockReject });
      const result = await def.execute('call-8', { subtool: 'read', args: { path: '/file' } }, signal, onUpdate, ctx);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌ Error: fail');
    });

    it('caches tool per context and subtool', async () => {
      // First call for 'ls'
      await def.execute('call-9a', { subtool: 'ls', args: {} }, signal, onUpdate, ctx);
      expect(createLsToolDefinition).toHaveBeenCalledTimes(1);
      // Second call for same subtool and same context should use cache
      await def.execute('call-9b', { subtool: 'ls', args: {} }, signal, onUpdate, ctx);
      expect(createLsToolDefinition).toHaveBeenCalledTimes(1); // still 1
      // Different subtool should call its factory
      await def.execute('call-9c', { subtool: 'read', args: {} }, signal, onUpdate, ctx);
      expect(createReadToolDefinition).toHaveBeenCalledTimes(1);
    });

    it('different contexts have separate caches', async () => {
      const ctx2 = { cwd: '/other' };
      await def.execute('call-10a', { subtool: 'ls', args: {} }, signal, onUpdate, ctx);
      await def.execute('call-10b', { subtool: 'ls', args: {} }, signal, onUpdate, ctx2);
      expect(createLsToolDefinition).toHaveBeenCalledTimes(2); // called for each distinct context
    });
  });
});
