import { createLogger } from "../utils/logger.js";
import type { Violation } from "./types.js";
import * as path from "node:path";
import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const logger = createLogger('QualityGate');

export interface QualityGateResult {
  passed: boolean;
  score: number;
  violations: Violation[];
  coverage: CoverageMetrics;
  buildStatus: 'success' | 'failure' | 'skipped';
  testResults: TestResults;
}

export interface CoverageMetrics {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
  allAboveThreshold: boolean;
}

export interface TestResults {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
}

export class QualityGate {
  private cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  async runGate(): Promise<QualityGateResult> {
    logger.log('Running quality gate...');

    // Run build first
    const buildStatus = await this.runBuild();

    // Run lint and parse violations
    const lintResult = await this.runLint();
    const violations = this.parseLintViolations(lintResult);

    // Get coverage
    const coverage = await this.getCoverage();

    // Run tests to get detailed results
    const testResults = await this.runTests();

    // Calculate score (0-100)
    const score = this.calculateScore(coverage, testResults, violations, buildStatus);

    // Determine if gate passed (strict criteria)
    const passed = score >= 90 && coverage.allAboveThreshold && testResults.failed === 0 && buildStatus === 'success';

    logger.log(`Quality gate: ${passed ? 'PASSED' : 'FAILED'} (score: ${score}, coverage: ${coverage.branches}% branches, ${testResults.passed}/${testResults.total} tests)`);

    return {
      passed,
      score,
      violations,
      coverage,
      buildStatus,
      testResults,
    };
  }

  private async runBuild(): Promise<'success' | 'failure'> {
    try {
      await execFileAsync('npm', ['run', 'build'], { cwd: this.cwd });
      return 'success';
    } catch (error: any) {
      if (error.code !== 0) {
        logger.warn('Build failed', { exitCode: error.code });
        return 'failure';
      }
      return 'success';
    }
  }

  private async runLint(): Promise<{ stdout: string; stderr: string }> {
    try {
      const { stdout, stderr } = await execFileAsync('npm', ['run', 'lint'], { cwd: this.cwd });
      return { stdout, stderr };
    } catch (error: any) {
      return { stdout: error.stdout || '', stderr: error.stderr || String(error) };
    }
  }

  private async getCoverage(): Promise<CoverageMetrics> {
    try {
      const coverageFile = path.join(this.cwd, 'coverage', 'coverage-summary.json');
      const altFile = path.join(this.cwd, 'coverage-report.json');

      let file: string | null = null;
      if (existsSync(coverageFile)) file = coverageFile;
      else if (existsSync(altFile)) file = altFile;
      else {
        logger.warn('No coverage file found, running tests with coverage');
        await this.runTestsWithCoverage();
        if (existsSync(coverageFile)) file = coverageFile;
        else if (existsSync(altFile)) file = altFile;
        else return { statements: 0, branches: 0, functions: 0, lines: 0, allAboveThreshold: false };
      }

      const data = JSON.parse(readFileSync(file, 'utf-8'));
      const total = data.total || data;

      const statements = total.statements?.pct ?? total.s?.pct ?? 0;
      const branches = total.branches?.pct ?? total.b?.pct ?? 0;
      const functions = total.functions?.pct ?? total.f?.pct ?? 0;
      const lines = total.lines?.pct ?? total.l?.pct ?? 0;

      const allAboveThreshold = Math.min(statements, branches, functions, lines) >= 80;

      return {
        statements: Math.round(statements * 100) / 100,
        branches: Math.round(branches * 100) / 100,
        functions: Math.round(functions * 100) / 100,
        lines: Math.round(lines * 100) / 100,
        allAboveThreshold,
      };
    } catch (error) {
      logger.error('Coverage read error', { error });
      return { statements: 0, branches: 0, functions: 0, lines: 0, allAboveThreshold: false };
    }
  }

  private async runTests(): Promise<TestResults> {
    try {
      // Use vitest directly via child process to get JSON output
      const { stdout, stderr } = await execFileAsync('npm', ['test', '--', '--reporter=json'], { cwd: this.cwd });
      const output = stdout || stderr;

      // Parse vitest JSON output
      const jsonMatch = output.match(/\{.*\}\s*$/s);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          total: result.numTotalTests || 0,
          passed: result.numPassedTests || 0,
          failed: result.numFailedTests || 0,
          skipped: result.numPendingTests || 0,
          durationMs: result.duration || 0,
        };
      }

      // Fallback: parse text output
      const totalMatch = output.match(/(\d+)\s+tests?\s+passed/);
      const failedMatch = output.match(/(\d+)\s+(?:failed|error)/);
      return {
        total: totalMatch ? parseInt(totalMatch[1]) : 0,
        passed: totalMatch ? parseInt(totalMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0,
        skipped: 0,
        durationMs: 0,
      };
    } catch (error: any) {
      logger.error('Tests failed', { exitCode: error.code });
      return { total: 0, passed: 0, failed: 1, skipped: 0, durationMs: 0 };
    }
  }

  private async runTestsWithCoverage(): Promise<void> {
    try {
      await execFileAsync('npm', ['test', '--', '--coverage'], { cwd: this.cwd });
    } catch {
      // ignore - coverage file may still be generated
    }
  }

  private parseLintViolations(result: { stdout: string; stderr: string }): Violation[] {
    const violations: Violation[] = [];
    const combined = result.stdout + result.stderr;

    // ESLint format: file:line:col - Error: message (ruleId)
    const regex = /(.+?):(\d+):(\d+)\s*-\s*(Error|Warning):\s*(.+?)\s*\((.+?)\)/g;
    let match;

    while ((match = regex.exec(combined)) !== null) {
      const [, file, line, col, level, message, ruleId] = match;
      violations.push({
        type: this.classifyType(ruleId),
        severity: level === 'Error' ? 'HIGH' : 'LOW',
        file,
        line: parseInt(line, 10),
        column: parseInt(col, 10),
        message,
        ruleId,
      });
    }

    // Also check for TypeScript errors
    const tsRegex = /(.+?)\((\d+),(\d+)\):\s*(error)\s+TS\d+:\s*(.+)/g;
    let tsMatch;
    while ((tsMatch = tsRegex.exec(combined)) !== null) {
      const [, file, line, col, , message] = tsMatch;
      violations.push({
        type: 'QUALITY',
        severity: 'HIGH',
        file,
        line: parseInt(line, 10),
        column: parseInt(col, 10),
        message,
        ruleId: 'typescript-type-error',
      });
    }

    return violations;
  }

  private classifyType(ruleId: string): Violation['type'] {
    const securityRules = ['no-eval', 'no-implied-eval', 'no-unsanitized', 'no-multi-str', 'camelcase'];
    const performanceRules = ['no-loop-func', 'no-extend-native', 'no-array-constructor'];
    const qualityRules = ['max-lines', 'max-lines-per-function', 'complexity', 'max-nested-callbacks'];

    if (securityRules.includes(ruleId)) return 'SECURITY';
    if (performanceRules.includes(ruleId)) return 'PERFORMANCE';
    if (qualityRules.includes(ruleId)) return 'QUALITY';
    return 'QUALITY';
  }

  private calculateScore(coverage: CoverageMetrics, testResults: TestResults, violations: Violation[], buildStatus: 'success' | 'failure' | 'skipped'): number {
    let score = 0;

    // Coverage contribution: 40 points (must be at least 80% in all metrics)
    if (coverage.allAboveThreshold) {
      score += 40;
    } else {
      const minCoverage = Math.min(coverage.statements, coverage.branches, coverage.functions, coverage.lines);
      score += (minCoverage / 100) * 40;
    }

    // Test pass rate: 30 points
    if (testResults.total > 0) {
      const passRate = testResults.passed / testResults.total;
      score += passRate * 30;
    } else {
      score += 15; // no tests = partial
    }

    // Violation penalty: up to -30 points
    const criticalCount = violations.filter(v => v.severity === 'CRITICAL').length;
    const highCount = violations.filter(v => v.severity === 'HIGH').length;
    const mediumCount = violations.filter(v => v.severity === 'MEDIUM').length;
    const lowCount = violations.filter(v => v.severity === 'LOW').length;

    const violationPenalty = (criticalCount * 8) + (highCount * 4) + (mediumCount * 2) + (lowCount * 1);
    score -= Math.min(violationPenalty, 30);

    // Build success: 20 points
    if (score >= 60 && buildStatus === 'success') {
      score += 20;
    } else if (buildStatus === 'success') {
      score += 10;
    } else {
      score += 0;
    }

    // Quality surcharge: 10 points for zero violations
    if (violations.length === 0) {
      score += 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

export default QualityGate;
