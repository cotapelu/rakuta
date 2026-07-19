import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeLs,
  executeFind,
  executeGrep,
  executeRead,
} from '../../../extensions/tools/sub-tools/computer-use.js';

function mockExec(result: { stdout: string; stderr: string; code: number; killed: boolean }) {
  return {
    exec: vi.fn(async (cmd: string, args: string[], opts: any) => {
      return { ...result, signal: undefined };
    }),
  };
}

function makeCtx(result: ReturnType<typeof mockExec>) {
  return {
    exec: result.exec,
  };
}

describe('Computer Use Sub-Tool error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeLs', () => {
    it('returns error when ls exits non-zero', async () => {
      const ctx = makeCtx(mockExec({ stdout: '', stderr: 'perm denied', code: 1, killed: false }));
      const result = await executeLs({}, '/cwd', undefined, ctx);
      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(1);
    });

    it('returns error when exec throws', async () => {
      const ctx = { exec: vi.fn().mockRejectedValue(new Error('exec failed')) };
      const result = await executeLs({}, '/cwd', undefined, ctx);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ls error');
    });
  });

  describe('executeFind', () => {
    it('returns error when find exits non-zero', async () => {
      const ctx = makeCtx(mockExec({ stdout: '', stderr: 'not found', code: 1, killed: false }));
      const result = await executeFind({ pattern: '*.ts' }, '/cwd', undefined, ctx);
      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(1);
    });

    it('returns error when exec throws', async () => {
      const ctx = { exec: vi.fn().mockRejectedValue(new Error('find error')) };
      const result = await executeFind({ pattern: '*.js' }, '/cwd', undefined, ctx);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('find error');
    });
  });

  describe('executeGrep', () => {
    it('returns error when grep exits non-zero', async () => {
      const ctx = makeCtx(mockExec({ stdout: '', stderr: 'no matches', code: 1, killed: false }));
      const result = await executeGrep({ pattern: 'x' }, '/cwd', undefined, ctx);
      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(1);
    });

    it('returns error when exec throws', async () => {
      const ctx = { exec: vi.fn().mockRejectedValue(new Error('grep error')) };
      const result = await executeGrep({ pattern: 'test' }, '/cwd', undefined, ctx);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('grep error');
    });
  });

  describe('executeRead', () => {
    it('returns error when cat exits non-zero', async () => {
      const ctx = makeCtx(mockExec({ stdout: '', stderr: 'no such file', code: 1, killed: false }));
      const result = await executeRead({ path: 'missing.txt' }, '/cwd', undefined, ctx);
      expect(result.isError).toBe(true);
      expect(result.details.exitCode).toBe(1);
    });

    it('returns error when exec throws', async () => {
      const ctx = { exec: vi.fn().mockRejectedValue(new Error('read error')) };
      const result = await executeRead({ path: 'file.txt' }, '/cwd', undefined, ctx);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('read error');
    });
  });
});
