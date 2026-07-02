import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before any imports
vi.mock('./extensions/index.js', () => ({
  getAllBuiltinExtensions: vi.fn(() => []),
}));

describe('buildin/index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export registerAllBuiltin function', async () => {
    const index = await import('./index.js');
    expect(index.registerAllBuiltin).toBeDefined();
    expect(typeof index.registerAllBuiltin).toBe('function');
  });

  it('registerAllBuiltin should return only extensions', async () => {
    const index = await import('./index.js');
    const result = index.registerAllBuiltin('/fake/cwd');
    expect(result).toHaveProperty('extensions');
    expect(result.extensions).toEqual([]);
  });
});
