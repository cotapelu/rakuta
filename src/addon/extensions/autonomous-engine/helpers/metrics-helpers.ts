/**
 * Compute coverage delta strings.
 */
export function computeCoverageDelta(
  prev: { statements: number; branches: number; functions: number; lines: number } | undefined,
  current: { statements: number; branches: number; functions: number; lines: number }
): string {
  if (!prev) {
    return `  - Statements: N/A\n  - Branches: N/A\n  - Functions: N/A\n  - Lines: N/A`;
  }
  const fmt = (d: number) => (d >= 0 ? `+${d.toFixed(2)}%` : `${d.toFixed(2)}%`);
  const stmtDelta = current.statements - prev.statements;
  const branchDelta = current.branches - prev.branches;
  const funcDelta = current.functions - prev.functions;
  const lineDelta = current.lines - prev.lines;
  return (
    `  - Statements: ${fmt(stmtDelta)} (${prev.statements.toFixed(2)}%→${current.statements.toFixed(2)}%)\n` +
    `  - Branches: ${fmt(branchDelta)} (${prev.branches.toFixed(2)}%→${current.branches.toFixed(2)}%)\n` +
    `  - Functions: ${fmt(funcDelta)} (${prev.functions.toFixed(2)}%→${current.functions.toFixed(2)}%)\n` +
    `  - Lines: ${fmt(lineDelta)} (${prev.lines.toFixed(2)}%→${current.lines.toFixed(2)}%)`
  );
}

/**
 * Compute test failure rate.
 */
export function computeFailureRate(testResults: { total: number; passed: number; failed: number; skipped: number; durationMs: number }): number {
  if (testResults.total === 0) return 0;
  return (testResults.failed / testResults.total) * 100;
}

/**
 * Compute test delta.
 */
export function computeTestDelta(stateLastTotal: number | undefined, currentTotal: number): number {
  return currentTotal - (stateLastTotal || 0);
}

/**
 * Determine if any regression occurred.
 */
export function hasRegression(
  prev: { statements: number; branches: number; functions: number; lines: number } | undefined,
  current: { statements: number; branches: number; functions: number; lines: number }
): boolean {
  if (!prev) return false;
  return (
    current.statements < prev.statements ||
    current.branches < prev.branches ||
    current.functions < prev.functions ||
    current.lines < prev.lines
  );
}

/**
 * Build the metrics log entry.
 */
export function buildMetricsLog(
  timestamp: string,
  cycleCount: number,
  task: { action: string; module: string; type: string; priority: number; estimatedMinutes?: number },
  risk: 'Low' | 'Medium' | 'High',
  coverageDeltaLines: string,
  testDelta: number,
  testResults: { total: number; passed: number; failed: number; skipped: number; durationMs: number },
  auditPassed: boolean,
  regression: boolean
): string {
  const failureRate = computeFailureRate(testResults);
  const log = `
## [${timestamp}] Cycle ${cycleCount} - Task: ${task.action}
- Type: ${task.type === 'VIOLATION_FIX' ? 'Violation Fix' : 'Proactive Improvement'}
- Priority: ${mapPriority(task.priority)}
- Risk: ${risk}
- Duration: (estimated ${task.estimatedMinutes ? task.estimatedMinutes + 'm' : 'N/A'})
- Status: ✅ Success
- Test Delta: ${testDelta >= 0 ? '+' : ''}${testDelta} tests (total ${testResults.total})
- Coverage Delta:
${coverageDeltaLines}
- Performance: N/A
- Security: ${auditPassed ? '✅ Audit passed' : '❌ Audit failed'}
- Test Failure Rate: ${failureRate.toFixed(1)}%
- Rollback Count: 0
- Regressions: ${regression ? 'Yes' : 'No'}
- MTTR: N/A
${task.estimatedMinutes ? `- Cost: ~${task.estimatedMinutes}m` : ''}`;
  return log;
}

/**
 * Map priority number to string.
 */
export function mapPriority(p: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  switch (p) {
    case 1: return 'CRITICAL';
    case 2: return 'HIGH';
    case 3: return 'MEDIUM';
    default: return 'LOW';
  }
}
