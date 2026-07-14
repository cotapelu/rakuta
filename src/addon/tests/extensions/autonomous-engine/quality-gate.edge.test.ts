import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QualityGate } from '../../../extensions/autonomous-engine/quality-gate.js';
import type { Violation } from '../../../extensions/autonomous-engine/types.js';

// Mock logger to suppress output
vi.mock('../../../extensions/autonomous-engine/utils/logger.js', () => ({
  createLogger: () => ({
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}));

describe('QualityGate Unit', () => {
  let qg: QualityGate;

  beforeEach(() => {
    qg = new QualityGate('/workspace');
  });

  describe('classifyType', () => {
    it('classifies security rules', () => {
      const any = qg as any;
      expect(any.classifyType('no-eval')).toBe('SECURITY');
      expect(any.classifyType('no-implied-eval')).toBe('SECURITY');
      expect(any.classifyType('no-unsanitized')).toBe('SECURITY');
    });

    it('classifies performance rules', () => {
      const any = qg as any;
      expect(any.classifyType('no-loop-func')).toBe('PERFORMANCE');
      expect(any.classifyType('no-extend-native')).toBe('PERFORMANCE');
    });

    it('classifies quality rules', () => {
      const any = qg as any;
      expect(any.classifyType('max-lines')).toBe('QUALITY');
      expect(any.classifyType('complexity')).toBe('QUALITY');
    });

    it('defaults to QUALITY for unknown', () => {
      const any = qg as any;
      expect(any.classifyType('unknown-rule')).toBe('QUALITY');
    });
  });

  describe('parseLintViolations', () => {
    it('parses ESLint errors and warnings', () => {
      const any = qg as any;
      const input = { stdout: `src/file.ts:10:5 - Error: Unexpected any (no-explicit-any)\nsrc/file.ts:20:1 - Warning: Line too long (max-len)`, stderr: '' };
      const violations: Violation[] = any.parseLintViolations(input);
      expect(violations.length).toBe(2);
      expect(violations[0].type).toBe('QUALITY'); // no-explicit-any not in security list? Actually in quality? But classifyType('no-explicit-any') returns 'QUALITY' because not in securityRules list.
      expect(violations[0].severity).toBe('HIGH');
      expect(violations[0].file).toBe('src/file.ts');
      expect(violations[0].line).toBe(10);
      expect(violations[0].ruleId).toBe('no-explicit-any');
    });

    it('parses TypeScript errors', () => {
      const any = qg as any;
      const input = { stdout: '', stderr: 'src/app.ts(15,10): error TS2322: Type error' };
      const violations: Violation[] = any.parseLintViolations(input);
      expect(violations.length).toBe(1);
      expect(violations[0].type).toBe('QUALITY');
      expect(violations[0].severity).toBe('HIGH');
      expect(violations[0].ruleId).toBe('typescript-type-error');
    });

    it('returns empty array when no violations', () => {
      const any = qg as any;
      const input = { stdout: '', stderr: '' };
      const violations: Violation[] = any.parseLintViolations(input);
      expect(violations.length).toBe(0);
    });
  });

  describe('calculateScore', () => {
    it('gives full 40 when all coverage metrics above 80%', () => {
      const any = qg as any;
      const coverage = { statements: 90, branches: 92, functions: 95, lines: 93, allAboveThreshold: true };
      const testResults = { total: 10, passed: 10, failed: 0, skipped: 0, durationMs: 100 };
      const violations: Violation[] = [];
      const buildStatus: 'success' = 'success';
      const score = any.calculateScore(coverage, testResults, violations, buildStatus);
      expect(score).toBeGreaterThanOrEqual(90);
    });

    it('penalizes violations', () => {
      const any = qg as any;
      const coverage = { statements: 90, branches: 90, functions: 90, lines: 90, allAboveThreshold: true };
      const testResults = { total: 10, passed: 10, failed: 0, skipped: 0, durationMs: 100 };
      const violations: Violation[] = [
        { type: 'SECURITY', severity: 'CRITICAL', file: '', line: 0, column: 0, message: '', ruleId: 'no-eval' },
        { type: 'QUALITY', severity: 'HIGH', file: '', line: 0, column: 0, message: '', ruleId: 'max-lines' }
      ];
      const score = any.calculateScore(coverage, testResults, violations, 'success');
      expect(score).toBeLessThan(100);
    });

    it('deducts points for test failures', () => {
      const any = qg as any;
      const coverage = { statements: 90, branches: 90, functions: 90, lines: 90, allAboveThreshold: true };
      const testResults = { total: 10, passed: 5, failed: 5, skipped: 0, durationMs: 100 };
      const violations: Violation[] = [];
      const score = any.calculateScore(coverage, testResults, violations, 'success');
      // passRate = 5/10 = 0.5 -> 15 points from tests (0.5 *30 =15)
      // coverage 40 points, build 20, quality surcharge maybe 10, total <= 75? approximate
      expect(score).toBeLessThan(80);
    });
  });
});
