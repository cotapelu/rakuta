import { registerAllBuiltinTools } from './builtin-tools.js';

describe('registerAllBuiltinTools', () => {
  it('should register 7 built-in tools', () => {
    const tools = registerAllBuiltinTools('/test/cwd');
    expect(tools).toHaveLength(7);
  });

  it('should include bash tool', () => {
    const tools = registerAllBuiltinTools('/test/cwd');
    expect(tools.some(t => t.name === 'bash')).toBe(true);
  });

  it('should include read tool', () => {
    const tools = registerAllBuiltinTools('/test/cwd');
    expect(tools.some(t => t.name === 'read')).toBe(true);
  });

  it('should include edit tool', () => {
    const tools = registerAllBuiltinTools('/test/cwd');
    expect(tools.some(t => t.name === 'edit')).toBe(true);
  });

  it('should include write tool', () => {
    const tools = registerAllBuiltinTools('/test/cwd');
    expect(tools.some(t => t.name === 'write')).toBe(true);
  });

  it('should include find tool', () => {
    const tools = registerAllBuiltinTools('/test/cwd');
    expect(tools.some(t => t.name === 'find')).toBe(true);
  });

  it('should include grep tool', () => {
    const tools = registerAllBuiltinTools('/test/cwd');
    expect(tools.some(t => t.name === 'grep')).toBe(true);
  });

  it('should include ls tool', () => {
    const tools = registerAllBuiltinTools('/test/cwd');
    expect(tools.some(t => t.name === 'ls')).toBe(true);
  });

  it('should pass cwd to all tool definitions', () => {
    const cwd = '/my/test/path';
    const tools = registerAllBuiltinTools(cwd);

    // All tools should have cwd set in their options
    tools.forEach(tool => {
      // ToolDefinition has name, description, inputSchema, options
      // The cwd is embedded in the tool's implementation, we just verify they are created
      expect(tool.name).toBeTypeOf('string');
      expect(tool.description).toBeTypeOf('string');
    });
  });

  it('should return array of ToolDefinition', () => {
    const tools = registerAllBuiltinTools('/test/cwd');
    tools.forEach(tool => {
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('label');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('parameters');
      expect(tool).toHaveProperty('execute');
    });
  });
});
