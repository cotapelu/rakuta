import { describe, it, expect } from 'vitest';
import { execute as benchmarkExecute } from '../../../../../extensions/capability-system/plugins/codebase/capabilities/benchmark.js';

describe('benchmark.execute (basic)', () => {
  it('runs analyze_file scenario without throwing', async () => {
    // Provide a tiny iteration count and a no-op exec to keep runtime minimal
    const execStub = async (_cmd: string, _args: string[], _options?: any) => {
      return { code: 0, stdout: '', stderr: '' };
    };
    const result = await benchmarkExecute(
      { scenario: 'analyze_file', iterations: 1, warmup: 0 },
      { cwd: process.cwd(), exec: execStub }
    );
    expect(result).toBeDefined();
    expect(result.result).toBeDefined();
    expect(result.result.scenario).toBe('analyze_file');
    expect(['number', 'string'].includes(typeof result.result.p50Ms)).toBe(true);
    // passSLO may be true or false depending on system; just ensure property exists
    expect(typeof result.result.passSLO).toBe('boolean');
  });
});
