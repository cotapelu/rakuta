import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker } from '../../../../extensions/tools/utils/circuit-breaker.js';

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;
  let clockNow: number;

  beforeEach(() => {
    vi.useFakeTimers();
    clockNow = Date.now();
    vi.setSystemTime?.(clockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('constructor uses defaults when no options provided', () => {
    cb = new CircuitBreaker();
    expect(cb['failureThreshold']).toBe(5);
    expect(cb['timeoutMs']).toBe(60 * 1000);
    expect(cb['halfOpenMax']).toBe(1);
  });

  it('constructor accepts custom options', () => {
    cb = new CircuitBreaker({ failureThreshold: 3, timeoutMs: 1000, halfOpenMax: 2 });
    expect(cb['failureThreshold']).toBe(3);
    expect(cb['timeoutMs']).toBe(1000);
    expect(cb['halfOpenMax']).toBe(2);
  });

  describe('CLOSED state', () => {
    it('executes function successfully and stays CLOSED', async () => {
      cb = new CircuitBreaker();
      const fn = vi.fn().mockResolvedValue('ok');
      const result = await cb.execute(fn);
      expect(result).toBe('ok');
      expect(cb.getState()).toBe('closed');
      expect(cb.getFailureCount()).toBe(0);
    });

    it('increments failures on error and transitions to OPEN when threshold reached', async () => {
      cb = new CircuitBreaker({ failureThreshold: 2 });
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));

      // First failure
      await expect(cb.execute(failFn)).rejects.toThrow('fail');
      expect(cb.getState()).toBe('closed'); // still closed until threshold
      expect(cb.getFailureCount()).toBe(1);

      // Second failure reaches threshold -> OPEN
      await expect(cb.execute(failFn)).rejects.toThrow('fail');
      expect(cb.getState()).toBe('open');
      expect(cb.getFailureCount()).toBe(2);
    });
  });

  describe('OPEN state', () => {
    beforeEach(() => {
      cb = new CircuitBreaker({ failureThreshold: 1, timeoutMs: 5000 });
      // Force open by causing a failure
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));
      return cb.execute(failFn).catch(() => {});
    });

    it('throws fast error when OPEN and timeout not elapsed', async () => {
      const okFn = vi.fn().mockResolvedValue('ok');
      await expect(cb.execute(okFn)).rejects.toThrow('Circuit breaker is OPEN - service unavailable');
      expect(cb.getState()).toBe('open');
    });

    // Removed redundant test: "transitions to HALF-OPEN after timeout and allows execution" as it's covered by HALF-OPEN block
  });

  describe('HALF-OPEN state', () => {
    beforeEach(async () => {
      cb = new CircuitBreaker({ failureThreshold: 1, timeoutMs: 1000, halfOpenMax: 2 });
      // Open the circuit
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));
      await cb.execute(failFn).catch(() => {});
      expect(cb.getState()).toBe('open');
      // Advance time to half-open
      vi.advanceTimersByTime(1000);
    });

    it('allows success and returns to CLOSED', async () => {
      const okFn = vi.fn().mockResolvedValue('success');
      const result = await cb.execute(okFn);
      expect(result).toBe('success');
      expect(cb.getState()).toBe('closed');
    });

    it('allows up to halfOpenMax failures then re-opens', async () => {
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));
      // First failure in half-open: allowed, then circuit goes back to open
      await expect(cb.execute(failFn)).rejects.toThrow('fail');
      expect(cb.getState()).toBe('open');
      // Second failure while open should throw fast error
      await expect(cb.execute(failFn)).rejects.toThrow('Circuit breaker is OPEN - service unavailable');
    });
  });
});
