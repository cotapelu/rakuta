/**
 * Extra unit tests for autonomous-engine/quality-gate.ts
 * Target: cover remaining branches (52 uncovered)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QualityGate } from '../../../extensions/autonomous-engine/quality-gate';
import type { CoverageMetrics, TestResults, Violation } from '../../../extensions/autonomous-engine/quality-gate';

// Mock node:child_process
vi.mock('node:child_process', async () => {
  const actual = await vi.importActual('node:child_process');
  return { ...actual, execFile: vi.fn() };
});

// Mock node:fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

import { execFile } from 'node:child_process';
import * as fs from 'node:fs';

const CWD = '/test/cwd';

describe('QualityGate extra coverage', () => {
  let gate: QualityGate;
  beforeEach(() => {
    vi.clearAllMocks();
    gate = new QualityGate(CWD);
  });

  describe('runBuild', () => {
    it('returns success when build succeeds', async () => {
      (execFile as any).mockImplementation((cmd, args, opts, cb) => cb(null, {}));
      const result = await (gate as any).runBuild();
      expect(result).toBe('success');
    });

    it('returns failure when build fails (non-zero exit)', async () => {
      (execFile as any).mockImplementation((cmd, args, opts, cb) => cb({ code: 1, stdout: '', stderr: '' }));
      const result = await (gate as any).runBuild();
      expect(result).toBe('failure');
    });

    it('returns success if error.code === 0 (edge)', async () => {
      (execFile as any).mockImplementation((cmd, args, opts, cb) => cb({ code: 0 }));
      const result = await (gate as any).runBuild();
      expect(result).toBe('success');
    });

    it('returns failure on thrown exception', async () => {
      (execFile as any).mockImplementation(() => { throw new Error('boom'); });
      const result = await (gate as any).runBuild();
      expect(result).toBe('failure');
    });
  });

  describe('runLint', () => {
    it('returns stdout and stderr on success', async () => {
      (execFile as any).mockImplementation((cmd, args, opts, cb) => cb(null, { stdout: 'out', stderr: 'err' }));
      const result = await (gate as any).runLint();
      expect(result).toEqual({ stdout: 'out', stderr: 'err' });
    });

    it('returns empty stdout and stringified error on failure with stdout/stderr', async () => {
      const err = new Error('fail'); err.stdout = 'errout'; err.stderr = 'errerr';
      (execFile as any).mockImplementation((cmd, args, opts, cb) => cb(err));
      const result = await (gate as any).runLint();
      expect(result.stdout).toBe('errout');
      expect(result.stderr).toBe('errerr');
    });

    it('defaults to empty strings if error lacks stdout/stderr', async () => {
      (execFile as any).mockImplementation((cmd, args, opts, cb) => cb(new Error('boom')));
      const result = await (gate as any).runLint();
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('boom');
    });
  });

  describe('getCoverage', () => {
    it('returns zeros when no coverage file exists and runTestsWithCoverage also fails', async () => {
      fs.existsSync.mockReturnValue(false);
      (execFile as any).mockImplementation((cmd, args, opts, cb) => cb(null, {}));
      const coverage = await (gate as any).getCoverage();
      expect(coverage).toEqual({ statements: 0, branches: 0, functions: 0, lines: 0, allAboveThreshold: false });
      expect(execFile).toHaveBeenCalled(); // runTestsWithCoverage invoked
    });

    it('reads alt coverage file when primary missing', async () => {
      fs.existsSync
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        total: { statements: { pct: 85 }, branches: { pct: 80 }, functions: { pct: 90 }, lines: { pct: 88 } }
      }));
      // Ensure execFile not called
      (execFile as any).mockImplementation(() => { throw new Error('execFile not expected'); });
      const coverage = await (gate as any).getCoverage();
      expect(coverage.statements).toBe(85);
      expect(coverage.branches).toBe(80);
      expect(coverage.allAboveThreshold).toBe(true);
      expect(execFile).not.toHaveBeenCalled();
    });

    it('creates coverage file by running tests when none exist initially', async () => {
      fs.existsSync
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      const coverageData = { total: { statements: { pct: 90 }, branches: { pct: 85 }, functions: { pct: 95 }, lines: { pct: 92 } } };
      fs.readFileSync.mockReturnValue(JSON.stringify(coverageData));
      (execFile as any).mockImplementation((cmd, args, opts, cb) => cb(null, {}));
      const coverage = await (gate as any).getCoverage();
      expect(coverage.statements).toBe(90);
      expect(execFile).toHaveBeenCalled();
    });

    it('uses fallback keys (s, b, f, l) when standard missing', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        total: { s: { pct: 70 }, b: { pct: 75 }, f: { pct: 80 }, l: { pct: 72 } }
      }));
      (execFile as any).mockImplementation(() => { throw new Error('execFile not expected'); });
      const coverage = await (gate as any).getCoverage();
      expect(coverage.statements).toBe(70);
      expect(coverage.branches).toBe(75);
      expect(coverage.functions).toBe(80);
      expect(coverage.lines).toBe(72);
      expect(coverage.allAboveThreshold).toBe(false);
    });

    it('handles malformed JSON', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('invalid json');
      (execFile as any).mockImplementation(() => { throw new Error('execFile not expected'); });
      const coverage = await (gate as any).getCoverage();
      expect(coverage).toEqual({ statements: 0, branches: 0, functions: 0, lines: 0, allAboveThreshold: false });
    });

    it('computes allAboveThreshold based on minimum', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        total: { statements: { pct: 85 }, branches: { pct: 79 }, functions: { pct: 90 }, lines: { pct: 88 } }
      }));
      (execFile as any).mockImplementation(() => { throw new Error('execFile not expected'); });
      const coverage = await (gate as any).getCoverage();
      expect(coverage.allAboveThreshold).toBe(false);
    });
  });

  describe('runTests', () => {
    it('parses vitest JSON output', async () => {
      const json = '{"numTotalTests":5,"numPassedTests":5,"numFailedTests":0,"numPendingTests":0,"duration":100}';
      (execFile as any).mockImplementation((cmd, args, opts, cb) => cb(null, { stdout: 'log\n' + json, stderr: '' }));
      const result = await (gate as any).runTests();
      expect(result).toEqual({ total: 5, passed: 5, failed: 0, skipped: 0, durationMs: 100 });
    });

    it('falls back to text parsing when no JSON', async () => {
      (execFile as any).mockImplementation((cmd, args, opts, cb) => cb(null, { stdout: '10 tests passed (5 failed)', stderr: '' }));
      const result = await (gate as any).runTests();
      expect(result.total).toBe(10);
      expect(result.passed).toBe(10);
      expect(result.failed).toBe(5);
    });

    it('returns zeros when text parsing fails', async () => {
      (execFile as any).mockImplementation((cmd, args, opts, cb) => cb(null, { stdout: 'All tests seem fine', stderr: '' }));
      const result = await (gate as any).runTests();
      expect(result.total).toBe(0);
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('returns failure when execFile rejects', async () => {
      (execFile as any).mockImplementation((cmd, args, opts, cb) => cb(new Error('fail')));
      const result = await (gate as any).runTests();
      expect(result.failed).toBe(1);
      expect(result.total).toBe(0);
    });
  });

  describe('parseLintViolations classification', () => {
    const parse = (gate: QualityGate) => (result: { stdout: string; stderr: string }) => (gate as any).parseLintViolations(result);

    it('classifies security rules', () => {
      const ruleIds = ['no-eval', 'no-implied-eval', 'no-unsanitized', 'no-multi-str', 'camelcase'];
      for (const rule of ruleIds) {
        const violations = parse(gate)({ stdout: `file.ts:1:1 - Error: msg (${rule})`, stderr: '' });
        expect(violations[0].type).toBe('SECURITY');
      }
    });

    it('classifies performance rules', () => {
      const ruleIds = ['no-loop-func', 'no-extend-native', 'no-array-constructor'];
      for (const rule of ruleIds) {
        const violations = parse(gate)({ stdout: `file.ts:1:1 - Error: msg (${rule})`, stderr: '' });
        expect(violations[0].type).toBe('PERFORMANCE');
      }
    });

    it('classifies quality rules', () => {
      const ruleIds = ['max-lines', 'max-lines-per-function', 'complexity', 'max-nested-callbacks'];
      for (const rule of ruleIds) {
        const violations = parse(gate)({ stdout: `file.ts:1:1 - Error: msg (${rule})`, stderr: '' });
        expect(violations[0].type).toBe('QUALITY');
      }
    });
  });

  describe('calculateScore edge cases', () => {
    const calc = (gate: QualityGate) => (coverage: CoverageMetrics, testResults: TestResults, violations: Violation[], buildStatus: 'success' | 'failure' | 'skipped') => {
      return (gate as any).calculateScore(coverage, testResults, violations, buildStatus);
    };

    it('adds base 15 points when total tests = 0', () => {
      const coverage: CoverageMetrics = { statements: 90, branches: 90, functions: 90, lines: 90, allAboveThreshold: true };
      const testResults: TestResults = { total: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0 };
      const violations: Violation[] = [];
      // 40 (coverage) + 15 = 55, build success (<60) +10 = 65, zero violations +10 = 75
      const score = calc(gate)(coverage, testResults, violations, 'success');
      expect(score).toBe(75);
    });

    it('applies quality surcharge only when zero violations', () => {
      const coverage: CoverageMetrics = { statements: 50, branches: 50, functions: 50, lines: 50, allAboveThreshold: false };
      // covScore = 20, testScore = 30 (passRate 1) -> 50, build success +10 -> 60, +10 surcharge = 70
      const testResults: TestResults = { total: 1, passed: 1, failed: 0, skipped: 0, durationMs: 0 };
      let violations: Violation[] = [];
      let score = calc(gate)(coverage, testResults, violations, 'success');
      expect(score).toBe(70);
      violations = [{ type: 'QUALITY', severity: 'LOW', file: 'a', line: 1, column: 1, message: 'm', ruleId: 'r' }];
      score = calc(gate)(coverage, testResults, violations, 'success');
      // base 20+30=50, -1 penalty=49, build +10=59, no surcharge => 59
      expect(score).toBe(59);
    });

    it('build success adds 20 when score >=60, else 10', () => {
      const coverage: CoverageMetrics = { statements: 90, branches: 90, functions: 90, lines: 90, allAboveThreshold: true };
      const testResults: TestResults = { total: 10, passed: 10, failed: 0, skipped: 0, durationMs: 0 };
      const violations: Violation[] = [];
      // 40 + 30 = 70 -> >=60, success +20 = 90, +10 zero = 100 (capped)
      let score = calc(gate)(coverage, testResults, violations, 'success');
      expect(score).toBe(100);
      // With build failure: 70 + 0 + 10 = 80
      score = calc(gate)(coverage, testResults, violations, 'failure');
      expect(score).toBe(80);
    });

    it('caps violation penalty at 30', () => {
      const coverage: CoverageMetrics = { statements: 90, branches: 90, functions: 90, lines: 90, allAboveThreshold: true };
      const testResults: TestResults = { total: 10, passed: 10, failed: 0, skipped: 0, durationMs: 0 };
      // 40 + 30 = 70, minus 30 -> 40, build success +10 -> 50, no surcharge -> 50
      const violations: Violation[] = Array(10).fill({
        type: 'SECURITY' as const,
        severity: 'CRITICAL' as const,
        file: 'a', line: 1, column: 1, message: 'm', ruleId: 'r'
      });
      const score = calc(gate)(coverage, testResults, violations, 'success');
      expect(score).toBe(50);
    });

    it('handles score dip below zero and clamps', () => {
      const coverage: CoverageMetrics = { statements: 0, branches: 0, functions: 0, lines: 0, allAboveThreshold: false };
      const testResults: TestResults = { total: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0 };
      const violations: Violation[] = Array(5).fill({
        type: 'SECURITY' as const,
        severity: 'CRITICAL' as const,
        file: 'a', line: 1, column: 1, message: 'm', ruleId: 'r'
      });
      // covScore = 0, test +=15 -> 15, penalty 5*8=40 capped 30 -> -15, build success +10 -> -5, no surcharge -> -5 -> clamp to 0
      const score = calc(gate)(coverage, testResults, violations, 'success');
      expect(score).toBe(0);
    });
  });

  describe('runTestsWithCoverage error tolerance', () => {
    it('tolerates errors from runTestsWithCoverage and continues', async () => {
      fs.existsSync.mockReturnValue(false);
      (execFile as any).mockImplementation((cmd, args, opts, cb) => cb(new Error('exec failed')));
      const coverage = await (gate as any).getCoverage();
      expect(coverage).toEqual({ statements: 0, branches: 0, functions: 0, lines: 0, allAboveThreshold: false });
    });
  });
});
