import { describe, it, expect } from 'vitest';
import {
  computeCoverageDelta,
  computeFailureRate,
  computeTestDelta,
  hasRegression,
  buildMetricsLog,
  mapPriority,
} from '../../../../extensions/autonomous-engine/helpers/metrics-helpers.js';

describe('metrics-helpers', () => {
  describe('computeCoverageDelta', () => {
    it('returns N/A lines when no previous coverage', () => {
      const current = { statements: 80, branches: 70, functions: 85, lines: 82 };
      const result = computeCoverageDelta(undefined, current);
      expect(result).toContain('N/A');
    });

    it('computes positive deltas correctly', () => {
      const prev = { statements: 78, branches: 68, functions: 84, lines: 80 };
      const current = { statements: 80, branches: 70, functions: 85, lines: 82 };
      const result = computeCoverageDelta(prev, current);
      expect(result).toContain('+2.00%');
      expect(result).toContain('78.00%→80.00%');
    });

    it('computes negative deltas correctly', () => {
      const prev = { statements: 80, branches: 70, functions: 85, lines: 82 };
      const current = { statements: 78, branches: 68, functions: 84, lines: 80 };
      const result = computeCoverageDelta(prev, current);
      expect(result).toContain('-2.00%');
    });
  });

  describe('computeFailureRate', () => {
    it('returns 0 when total is 0', () => {
      const testResults = { total: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0 };
      expect(computeFailureRate(testResults)).toBe(0);
    });

    it('computes failure rate correctly', () => {
      const testResults = { total: 100, passed: 95, failed: 5, skipped: 0, durationMs: 1000 };
      expect(computeFailureRate(testResults)).toBe(5);
    });
  });

  describe('computeTestDelta', () => {
    it('computes delta when stateLastTotal defined', () => {
      expect(computeTestDelta(100, 110)).toBe(10);
      expect(computeTestDelta(100, 90)).toBe(-10);
    });

    it('computes delta when stateLastTotal undefined', () => {
      expect(computeTestDelta(undefined, 110)).toBe(110);
    });
  });

  describe('hasRegression', () => {
    it('detects regression in statements', () => {
      const prev = { statements: 80, branches: 70, functions: 85, lines: 82 };
      const current = { statements: 78, branches: 72, functions: 86, lines: 83 };
      expect(hasRegression(prev, current)).toBe(true);
    });

    it('detects regression in branches', () => {
      const prev = { statements: 80, branches: 70, functions: 85, lines: 82 };
      const current = { statements: 81, branches: 68, functions: 86, lines: 83 };
      expect(hasRegression(prev, current)).toBe(true);
    });

    it('returns false when all metrics improved or stable', () => {
      const prev = { statements: 80, branches: 70, functions: 85, lines: 82 };
      const current = { statements: 81, branches: 72, functions: 86, lines: 83 };
      expect(hasRegression(prev, current)).toBe(false);
    });
  });

  describe('mapPriority', () => {
    it('maps 1 to CRITICAL', () => expect(mapPriority(1)).toBe('CRITICAL'));
    it('maps 2 to HIGH', () => expect(mapPriority(2)).toBe('HIGH'));
    it('maps 3 to MEDIUM', () => expect(mapPriority(3)).toBe('MEDIUM'));
    it('maps 4 (or other) to LOW', () => expect(mapPriority(4)).toBe('LOW'));
    it('maps 0 to LOW', () => expect(mapPriority(0)).toBe('LOW'));
  });

  describe('buildMetricsLog', () => {
    it('generates a log with all fields', () => {
      const timestamp = '2025-07-14 12:00';
      const cycleCount = 5;
      const task = { action: 'test', module: 'core', type: 'PROACTIVE_IMPROVEMENT', priority: 2, estimatedMinutes: 30 };
      const risk: 'Low' = 'Low';
      const coverageDeltaLines = '  - Statements: +2.00% (78.00%→80.00%)\n  - Branches: +2.00% (70.00%→72.00%)';
      const testDelta = 5;
      const testResults = { total: 100, passed: 98, failed: 2, skipped: 0, durationMs: 5000 };
      const auditPassed = true;
      const regression = false;
      const log = buildMetricsLog(timestamp, cycleCount, task, risk, coverageDeltaLines, testDelta, testResults, auditPassed, regression);
      expect(log).toContain('Cycle 5');
      expect(log).toContain('Task: test');
      expect(log).toContain('Risk: Low');
      expect(log).toContain('Test Delta: +5');
      expect(log).toContain('✅ Audit passed');
    });
  });
});
