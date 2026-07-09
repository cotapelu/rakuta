import { createLogger } from "../utils/logger.js";
import { execFile } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const logger = createLogger('SystemAudit');

export interface AuditFinding {
  dimension: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  location: string;
  exploit: string;
  impact: string;
  rootCause: string;
  fix: string;
  testCase: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
}

export interface AuditReport {
  passed: boolean;
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  findings: AuditFinding[];
  summary: string;
  compliance: ComplianceCheck[];
  observabilityGaps: ObservabilityGap[];
  recommendations: string[];
}

export interface ComplianceCheck {
  standard: string;
  status: 'compliant' | 'gap' | 'not-applicable';
  description: string;
  missingControls: string[];
}

export interface ObservabilityGap {
  category: 'logs' | 'metrics' | 'traces' | 'health' | 'alerts';
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
}

/**
 * SystemAudit - Comprehensive 10-dimensional audit per GOAL.md Section 11
 *
 * Dimensions:
 * 1. Business Logic Integrity
 * 2. End-to-End Flow Audit
 * 3. Concurrency & Race Condition
 * 4. Database & Data Integrity
 * 5. Caching & Consistency
 * 6. Idempotency
 * 7. Failure Scenarios
 * 8. Security Audit (STRIDE+DREAD)
 * 9. Scalability Analysis
 * 10. Observability & Monitoring
 */
export class SystemAudit {
  private cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  async runFullAudit(): Promise<AuditReport> {
    logger.log('Starting comprehensive system audit (10 dimensions)...');
    const allFindings: AuditFinding[] = [];

    // Run all 10 dimensions
    allFindings.push(...await this.auditBusinessLogicIntegrity());
    allFindings.push(...await this.auditEndToEndFlow());
    allFindings.push(...await this.auditConcurrency());
    allFindings.push(...await this.auditDatabaseIntegrity());
    allFindings.push(...await this.auditCachingConsistency());
    allFindings.push(...await this.auditIdempotency());
    allFindings.push(...await this.auditFailureScenarios());
    allFindings.push(...await this.auditSecuritySTRIDE());
    allFindings.push(...await this.auditScalability());
    allFindings.push(...await this.auditObservability());

    // Calculate score (max 100)
    const score = this.calculateScore(allFindings);

    // Determine overall risk
    const criticalCount = allFindings.filter(f => f.severity === 'CRITICAL').length;
    const highCount = allFindings.filter(f => f.severity === 'HIGH').length;
    const mediumCount = allFindings.filter(f => f.severity === 'MEDIUM').length;
    const lowCount = allFindings.filter(f => f.severity === 'LOW').length;

    let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (criticalCount > 0) overallRisk = 'CRITICAL';
    else if (highCount > 3) overallRisk = 'HIGH';
    else if (highCount > 0 || mediumCount > 5) overallRisk = 'MEDIUM';

    // Pass criteria: score >=90 AND zero CRITICAL issues (per GOAL.md Section 11.5)
    const passed = score >= 90 && criticalCount === 0;

    // Generate compliance check (GDPR, PCI, HIPAA, SOX, COPPA if applicable)
    const compliance = this.checkCompliance();

    // Observability gaps
    const observabilityGaps = this.identifyObservabilityGaps(allFindings);

    // Recommendations (prioritized)
    const recommendations = this.generateRecommendations(allFindings, score);

    // Summary
    const summary = `Audit complete: ${allFindings.length} findings (${criticalCount} critical, ${highCount} high, ${mediumCount} medium, ${lowCount} low). Overall risk: ${overallRisk}. Score: ${score}/100.`;

    logger.log(summary);

    return {
      passed,
      overallRisk,
      score,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      findings: allFindings,
      summary,
      compliance,
      observabilityGaps,
      recommendations,
    };
  }

  private calculateScore(findings: AuditFinding[]): number {
    let score = 100;

    // Deduct based on severity
    for (const f of findings) {
      switch (f.severity) {
        case 'CRITICAL': score -= 30; break;
        case 'HIGH': score -= 15; break;
        case 'MEDIUM': score -= 5; break;
        case 'LOW': score -= 1; break;
      }
    }

    // Bonus for comprehensive observability
    const obsGaps = this.identifyObservabilityGaps(findings);
    if (obsGaps.filter(g => g.severity === 'CRITICAL' || g.severity === 'HIGH').length === 0) {
      score += 5;
    }

    // Bonus for idempotency and comprehensive observability
    const hasIdempotencyIssues = findings.some(f => f.dimension === 'Idempotency' && f.severity !== 'LOW');
    if (!hasIdempotencyIssues) {
      score += 5;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // ========== DIMENSION 1: Business Logic Integrity ==========
  private async auditBusinessLogicIntegrity(): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    // Scan TypeScript files for common issues
    const tsFiles = this.findFiles('**/*.ts', { ignore: ['node_modules', 'dist', 'coverage'] });

    for (const file of tsFiles.slice(0, 50)) { // limit to first 50 for performance
      const content = readFileSync(path.join(this.cwd, file), 'utf-8');

      // Check for bypass validation (e.g., trustClient, skipValidation)
      if (/(skipValidation|bypass|trustClient|disableCheck|noVerify)/i.test(content)) {
        findings.push({
          dimension: 'Business Logic Integrity',
          severity: 'HIGH',
          location: file,
          exploit: 'Attacker can bypass validation by manipulating flags or parameters',
          impact: 'Data corruption, unauthorized operations, security breach',
          rootCause: 'Code contains validation bypass mechanisms',
          fix: 'Remove bypass flags; ensure all external inputs validated',
          testCase: 'Test with malformed/invalid inputs to ensure validation always enforced',
          priority: 'P1',
        });
      }

      // Check for dangerous assumptions (e.g., "if (!user) return;" without error)
      if (/(if\s*\(\s*!\s*\w+\s*\)\s*return\s*;)/.test(content) && !/throw\s+new\s+Error/.test(content)) {
        findings.push({
          dimension: 'Business Logic Integrity',
          severity: 'MEDIUM',
          location: file,
          exploit: 'Null/undefined inputs cause silent failures or undefined behavior',
          impact: 'Unexpected behavior, potential crashes, security vulnerabilities',
          rootCause: 'Missing error handling for null/undefined',
          fix: 'Add explicit error throwing for invalid state',
          testCase: 'Test with null/undefined inputs, verify errors thrown',
          priority: 'P2',
        });
      }

      // Check for client input manipulation (using req.body directly without schema validation)
      if (/req\.body|request\.body|ctx\.body/i.test(content) && !/zod|yup|joi|class-validator/i.test(content)) {
        findings.push({
          dimension: 'Business Logic Integrity',
          severity: 'HIGH',
          location: file,
          exploit: 'Attacker sends arbitrary JSON to manipulate business logic',
          impact: 'SQL injection, XSS, privilege escalation, data corruption',
          rootCause: 'No input validation schema on request bodies',
          fix: 'Implement input validation using Zod/Yup/Joi for all endpoints',
          testCase: 'Send malformed, oversized, or malicious payloads; verify rejection',
          priority: 'P1',
        });
      }

      // Check for implicit dependencies (global state without clear injection)
      if (/(global\.|window\.|process\.env\[)/i.test(content) && !/dependency\s+injection|constructor\s*\(/.test(content)) {
        findings.push({
          dimension: 'Business Logic Integrity',
          severity: 'MEDIUM',
          location: file,
          exploit: 'Hidden dependencies make code brittle and hard to test',
          impact: 'Unexpected behavior when environment changes, poor testability',
          rootCause: 'Direct use of globals instead of dependency injection',
          fix: 'Inject dependencies via constructor or function parameters',
          testCase: 'Write unit tests with mocked dependencies to verify isolation',
          priority: 'P2',
        });
      }
    }

    return findings;
  }

  // ========== DIMENSION 2: End-to-End Flow Audit ==========
  private async auditEndToEndFlow(): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    // Look for API routes and trace their flow
    const routeFiles = this.findFiles('**/*route*.ts', { ignore: ['node_modules'] });
    const apiFiles = this.findFiles('**/api/**/*.ts', { ignore: ['node_modules'] });

    for (const file of [...routeFiles, ...apiFiles].slice(0, 20)) {
      const content = readFileSync(path.join(this.cwd, file), 'utf-8');

      // Check if routes have proper error handling and rollback
      const hasTryCatch = /try\s*\{/.test(content);
      const hasTransaction = /transaction|beginTransaction|commit|rollback/i.test(content);
      const hasFinally = /finally\s*\{/.test(content);

      if (hasTransaction && !hasFinally) {
        findings.push({
          dimension: 'End-to-End Flow',
          severity: 'HIGH',
          location: file,
          exploit: 'Database transaction open on error, causing locks or leaks',
          impact: 'Deadlocks, resource exhaustion, data inconsistency',
          rootCause: 'Missing finally block to ensure transaction rollback',
          fix: 'Wrap DB operations in try-catch-finally; always rollback on error',
          testCase: 'Simulate DB error mid-transaction; verify rollback occurs',
          priority: 'P1',
        });
      }

      // Check for missing response handling (res.end, return, etc.)
      const hasResponse = /\.send\(|\.json\(|\.end\(/.test(content);
      const hasReturnAfterResponse = /return\s+res\.|res\.\w+\(\s*\)\s*;/.test(content);
      if (hasResponse && !hasReturnAfterResponse && !/async\s+await/.test(content)) {
        findings.push({
          dimension: 'End-to-End Flow',
          severity: 'MEDIUM',
          location: file,
          exploit: 'Code continues after response sent, causing "Headers already sent" errors',
          impact: 'Crashes, undefined behavior, security vulnerabilities',
          rootCause: 'Missing return after sending response',
          fix: 'Add return statement after res.send/res.json/res.end in non-async handlers',
          testCase: 'Call endpoint multiple times; check for Cannot set headers after sent errors',
          priority: 'P2',
        });
      }

      // Check for flow interruption (missing error propagation)
      if (/catch\s*\(\s*\w+\s*\)\s*\{\s*\}/.test(content)) {
        findings.push({
          dimension: 'End-to-End Flow',
          severity: 'MEDIUM',
          location: file,
          exploit: 'Silent error swallowing hides failures',
          impact: 'User receives no feedback, system state inconsistent',
          rootCause: 'Empty catch block or only logging without proper handling',
          fix: 'Either re-throw error or return appropriate error response; do not silently ignore',
          testCase: 'Trigger error in service layer; verify API returns proper error status',
          priority: 'P2',
        });
      }

      // Check for resource leak (file handles, connections not closed)
      if (/(fs\.readFile|createReadStream|database\.connect)/.test(content) && !/(close\(\)|release\(\)|destroy\(\)|end\(\))/.test(content)) {
        findings.push({
          dimension: 'End-to-End Flow',
          severity: 'HIGH',
          location: file,
          exploit: 'Unclosed resources accumulate, causing exhaustion',
          impact: 'Memory leak, file descriptor exhaustion, DB connection pool depletion',
          rootCause: 'Resources opened but not closed in all code paths',
          fix: 'Use try-finally to ensure resource cleanup; consider using pools',
          testCase: 'Open many resources; monitor file descriptors/memory; verify cleanup',
          priority: 'P0',
        });
      }
    }

    return findings;
  }

  // ========== DIMENSION 3: Concurrency & Race Condition ==========
  private async auditConcurrency(): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    const tsFiles = this.findFiles('**/*.ts', { ignore: ['node_modules', 'dist', 'coverage'] });

    for (const file of tsFiles.slice(0, 30)) {
      const content = readFileSync(path.join(this.cwd, file), 'utf-8');

      // Check for global mutable variables
      if (/^(let|var)\s+\w+\s*=\s*(?!function|class|import)/m.test(content)) {
        findings.push({
          dimension: 'Concurrency & Race Condition',
          severity: 'HIGH',
          location: file,
          exploit: 'Shared global mutable state can be modified by multiple async operations',
          impact: 'Race conditions, data corruption, unpredictable behavior',
          rootCause: 'Global variables modified without synchronization',
          fix: 'Avoid global mutable state; use local variables, queues, or proper locking (Mutex)',
          testCase: 'Simulate concurrent requests modifying same global; verify race condition',
          priority: 'P1',
        });
      }

      // Check for unsynchronized access to shared caches
      if (/(cache|Cache|CACHE)\s*\.\s*(set|get|delete|clear)/.test(content) && !/(lock|mutex|semaphore|queue|atomic)/i.test(content)) {
        findings.push({
          dimension: 'Concurrency & Race Condition',
          severity: 'MEDIUM',
          location: file,
          exploit: 'Concurrent cache operations can cause race conditions',
          impact: 'Cache corruption, stale data, crashes',
          rootCause: 'Cache accessed without synchronization in multi-threaded/async context',
          fix: 'Use thread-safe cache (Map with locks, ConcurrentHashMap) or actor model',
          testCase: 'Concurrent reads/writes to same cache key; verify consistency',
          priority: 'P2',
        });
      }

      // Check for non-atomic read-modify-write
      if (/count\s*\+\+/i.test(content) || /counter\s*\+=/i.test(content)) {
        findings.push({
          dimension: 'Concurrency & Race Condition',
          severity: 'HIGH',
          location: file,
          exploit: 'Non-atomic increment loses updates under concurrency',
          impact: 'Incorrect counts, lost updates, financial discrepancies',
          rootCause: 'Using non-atomic operations on shared counters',
          fix: 'Use atomic operations (AtomicInteger, Interlocked, lock around update)',
          testCase: 'Multiple concurrent increments; verify final count equals sum',
          priority: 'P0',
        });
      }

      // Check for missing Promise.all handling for parallel ops
      if (/Promise\.all\s*\(/.test(content) && !/catch\s*\(/.test(content)) {
        findings.push({
          dimension: 'Concurrency & Race Condition',
          severity: 'MEDIUM',
          location: file,
          exploit: 'Unhandled promise rejection from Promise.all crashes process',
          impact: 'Process termination, incomplete operations',
          rootCause: 'Promise.all without await or error handling',
          fix: 'Always await Promise.all and handle rejections with try-catch',
          testCase: 'Make one promise reject; verify error is caught and handled gracefully',
          priority: 'P2',
        });
      }

      // Check for event loop blocking (sync operations in async contexts)
      if (/async\s+\w+\s*\(.*\)\s*\{[^}]*\b(for|while)\s*\(.*\)\s*\{[^}]*\}\s*\}/.test(content) && /(readFileSync|writeFileSync|execSync|JSON\.parse\(.*\)\s*;)/i.test(content)) {
        findings.push({
          dimension: 'Concurrency & Race Condition',
          severity: 'MEDIUM',
          location: file,
          exploit: 'Blocking I/O in async function blocks event loop',
          impact: 'Poor throughput, high latency, unresponsive system',
          rootCause: 'Synchronous file/network operations in async context',
          fix: 'Use async versions (fs.promises.readFile, etc.) or offload to worker threads',
          testCase: 'Call blocking function with high load; measure response times',
          priority: 'P2',
        });
      }
    }

    return findings;
  }

  // ========== DIMENSION 4: Database & Data Integrity ==========
  private async auditDatabaseIntegrity(): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    // Check for transaction usage (scan all .ts files for DB writes)
    const allFiles = this.findFiles('**/*.ts', { ignore: ['node_modules', 'dist', 'coverage'] });

    for (const file of allFiles.slice(0, 50)) {
      const content = readFileSync(path.join(this.cwd, file), 'utf-8');

      // Check for missing transactions on writes
      if (/\.(create|update|delete|remove|save|insert)\s*\(/.test(content) && !/transaction|beginTransaction|commit|rollback/i.test(content)) {
        findings.push({
          dimension: 'Database & Data Integrity',
          severity: 'HIGH',
          location: file,
          exploit: 'Writes without transactions can leave data inconsistent on failure',
          impact: 'Partial updates, orphaned records, data corruption',
          rootCause: 'Database writes not wrapped in transactions',
          fix: 'Use transactions for all multi-step write operations; ensure atomicity',
          testCase: 'Simulate failure mid-write; verify no partial data persisted',
          priority: 'P0',
        });
      }

      // Check for missing unique constraints
      if (/schema\.createTable|CREATE TABLE/i.test(content) && !/UNIQUE|INDEX/i.test(content)) {
        findings.push({
          dimension: 'Database & Data Integrity',
          severity: 'MEDIUM',
          location: file,
          exploit: 'Duplicate records can be created, violating business rules',
          impact: 'Data duplication, integrity violations, business logic bypass',
          rootCause: 'Missing unique constraints on fields requiring uniqueness',
          fix: 'Add UNIQUE constraints (or composite indexes) on fields that must be unique',
          testCase: 'Attempt to insert duplicate; verify constraint violation error',
          priority: 'P2',
        });
      }

      // Check for missing foreign keys
      if (/references\s+\w+/i.test(content) && !/FOREIGN\s+KEY|ON\s+DELETE|ON\s+UPDATE/i.test(content)) {
        findings.push({
          dimension: 'Database & Data Integrity',
          severity: 'MEDIUM',
          location: file,
          exploit: 'Orphaned records when parent deleted',
          impact: 'Broken references, inconsistent queries, application crashes',
          rootCause: 'Foreign key relationships without cascade rules',
          fix: 'Define FOREIGN KEY constraints with appropriate ON DELETE/UPDATE actions',
          testCase: 'Delete parent record; verify children deleted or prevented by constraint',
          priority: 'P2',
        });
      }

      // Check for deadlock-prone lock ordering
      if (/(SELECT\s+.*\s+FOR\s+UPDATE|lockTable|acquireLock)/i.test(content) && !/(lockOrder|lock\s+order|consistent\s+order)/i.test(content)) {
        findings.push({
          dimension: 'Database & Data Integrity',
          severity: 'HIGH',
          location: file,
          exploit: 'Inconsistent lock ordering can cause deadlocks under concurrency',
          impact: 'Transactions abort, retries, poor performance',
          rootCause: 'Multiple lock acquisition points with no global order',
          fix: 'Establish a global lock ordering (e.g., alphabetical by table name)',
          testCase: 'Simulate two concurrent transactions acquiring locks in opposite order; verify deadlock occurs; fix ordering',
          priority: 'P1',
        });
      }

      // Check for unindexed queries on large tables (simple heuristic)
      if (/WHERE\s+\w+\s*=\s*[?@:]/i.test(content) && !/CREATE\s+INDEX|INDEX\s+ON/i.test(content)) {
        findings.push({
          dimension: 'Database & Data Integrity',
          severity: 'LOW',
          location: file,
          exploit: 'Full table scans on large tables cause slow queries',
          impact: 'Performance degradation, timeouts under load',
          rootCause: 'Missing index on frequently filtered columns',
          fix: 'Add database indexes on columns used in WHERE, JOIN, ORDER BY',
          testCase: 'Run EXPLAIN on query; verify index used',
          priority: 'P3',
        });
      }
    }

    return findings;
  }

  // ========== DIMENSION 5: Caching & Consistency ==========
  private async auditCachingConsistency(): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    const cacheFiles = this.findFiles(['**/*cache*.ts', '**/*redis*.ts'], { ignore: ['node_modules'] });

    for (const file of cacheFiles.slice(0, 15)) {
      const content = readFileSync(path.join(this.cwd, file), 'utf-8');

      // Check for stale cache (no TTL)
      if (/set\s*\(\s*['"`]key['"`]/.test(content) && !/ttl|expire|maxAge|TIME_TO_LIVE/i.test(content)) {
        findings.push({
          dimension: 'Caching & Consistency',
          severity: 'HIGH',
          location: file,
          exploit: 'Cache entries never expire, serving stale data indefinitely',
          impact: 'Users see outdated information; incorrect business decisions',
          rootCause: 'Cache entries lack expiration time (TTL)',
          fix: 'Set appropriate TTL on all cache entries based on data volatility',
          testCase: 'Update source data; wait past TTL; verify cache refreshed',
          priority: 'P1',
        });
      }

      // Check for cache invalidation after writes
      if (/\.(set|update|delete|create)\s*\(/.test(content) && !/(cache\.delete|cache\.clear|del\s*\(|invalidate)/i.test(content)) {
        findings.push({
          dimension: 'Caching & Consistency',
          severity: 'HIGH',
          location: file,
          exploit: 'Cache not invalidated after data change, serving stale data',
          impact: 'Inconsistent reads, user confusion, bugs',
          rootCause: 'Missing cache invalidation on data mutations',
          fix: 'Invalidate or update cache immediately after any write operation',
          testCase: 'Perform write; immediately read; verify fresh data, not stale cache',
          priority: 'P1',
        });
      }

      // Check for cache stampede (no lock or early recompute)
      if (/cache\.get\s*\(\s*['"`]key['"`]\s*,\s*async\s*\(/.test(content) && !/(lock|semaphore|queue|mutex|SETNX)/i.test(content)) {
        findings.push({
          dimension: 'Caching & Consistency',
          severity: 'MEDIUM',
          location: file,
          exploit: 'Multiple concurrent requests miss cache and all recompute, causing thundering herd',
          impact: 'Database overload, high latency, resource exhaustion',
          rootCause: 'Cache miss not protected by single flight pattern',
          fix: 'Implement single-flight: lock per key, queue requests, one recompute',
          testCase: 'Concurrent requests for same missing key; verify only one backend call',
          priority: 'P2',
        });
      }

      // Check for write-through vs write-back consistency
      if (/cache\.set\s*\(.*;\s*db\./i.test(content) && !/(await\s+db\.|Promise\.all)/i.test(content)) {
        findings.push({
          dimension: 'Caching & Consistency',
          severity: 'MEDIUM',
          location: file,
          exploit: 'Cache updated before DB write success can lead to inconsistency if DB fails',
          impact: 'Cache has data not in DB, causing phantom reads',
          rootCause: 'Write-through cache updates before DB transaction commits',
          fix: 'Write to DB first, then update cache; use transaction; handle failures',
          testCase: 'Simulate DB write failure after cache update; verify cache not updated',
          priority: 'P2',
        });
      }
    }

    return findings;
  }

  // ========== DIMENSION 6: Idempotency ==========
  private async auditIdempotency(): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    const allFiles = this.findFiles('**/*.ts', { ignore: ['node_modules', 'dist', 'coverage'] });

    for (const file of allFiles.slice(0, 50)) {
      const content = readFileSync(path.join(this.cwd, file), 'utf-8');

      // Find POST/PUT/DELETE endpoints
      const postPutMatches = content.matchAll(/(POST|PUT|DELETE)\s*\(['"`][^'"]+['"`]\s*,\s*async\s*\(/gi);

      for (const match of postPutMatches) {
        const endpoint = match[0];
        const endpointBlock = this.extractFunctionBlock(content, match.index);

        // Check for Idempotency-Key header usage
        if (!/idempotency|unique.*key|request.*id|operation.*id/i.test(endpointBlock)) {
          findings.push({
            dimension: 'Idempotency',
            severity: 'HIGH',
            location: file + ` (${endpoint})`,
            exploit: 'Duplicate requests (retry, network issue) cause double operation (double charge, double create)',
            impact: 'Financial loss, duplicate resources, inconsistent state',
            rootCause: 'No idempotency key handling for state-changing operations',
            fix: 'Require Idempotency-Key header; store processed keys; deduplicate using unique constraint on operation_id',
            testCase: 'Send same request twice with same Idempotency-Key; verify second is idempotent (no change)',
            priority: 'P0',
          });
        }

        // Check for safe retry behavior (even without explicit idempotency key)
        if (!/unique\s+constraint|ON\s+CONFLICT|upsert/i.test(endpointBlock)) {
          findings.push({
            dimension: 'Idempotency',
            severity: 'MEDIUM',
            location: file + ` (${endpoint})`,
            exploit: 'Retries create duplicates because operation not naturally idempotent',
            impact: 'Duplicate records, double execution',
            rootCause: 'Endpoint not idempotent by design (no unique constraint or conflict handling)',
            fix: 'Make endpoint idempotent using database unique constraints + ON CONFLICT DO NOTHING/UPDATE',
            testCase: 'Submit identical payload twice; verify only one resource created',
            priority: 'P1',
          });
        }
      }
    }

    return findings;
  }

  // ========== DIMENSION 7: Failure Scenarios ==========
  private async auditFailureScenarios(): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    // Check for timeout configurations
    const hasHttpTimeout = this.searchCode('http\\.request|axios\\.|fetch\\s*\\(', { alsoCheckTimeout: true });
    const hasDbTimeout = this.searchCode('createConnection|pool|query\(', { alsoCheckTimeout: true });

    if (!this.hasTimeoutConfigured()) {
      findings.push({
        dimension: 'Failure Scenarios',
        severity: 'HIGH',
        location: 'codebase',
        exploit: 'External calls (DB, HTTP) can hang indefinitely, blocking resources',
        impact: 'Resource exhaustion, denial of service, cascading failures',
        rootCause: 'No timeout set on I/O operations',
        fix: 'Set reasonable timeouts (e.g., 10s for DB, 5s for HTTP) on all I/O',
        testCase: 'Simulate slow external service; verify operation times out gracefully',
        priority: 'P0',
      });
    }

    // Check for retry logic (with backoff and jitter)
    const hasRetryLogic = this.searchCode('retry|Retry|catch.*again', { minOccurrences: 3 });
    if (!hasRetryLogic) {
      findings.push({
        dimension: 'Failure Scenarios',
        severity: 'MEDIUM',
        location: 'codebase',
        exploit: 'Transient failures (network glitch, DB hiccup) cause immediate user-visible errors',
        impact: 'Poor reliability, unnecessary errors',
        rootCause: 'No retry mechanism for transient failures',
        fix: 'Implement exponential backoff with jitter for retryable operations',
        testCase: 'Simulate transient failure (timeout); verify automatic retry succeeds',
        priority: 'P1',
      });
    }

    // Check for circuit breaker pattern
    const hasCircuitBreaker = this.searchCode('circuit.*breaker|CircuitBreaker|opened|closed|half-open', { caseInsensitive: true });
    if (!hasCircuitBreaker) {
      findings.push({
        dimension: 'Failure Scenarios',
        severity: 'MEDIUM',
        location: 'codebase',
        exploit: 'Repeated downstream failures overwhelm system and cause cascading collapse',
        impact: 'Complete outage, recovery slow',
        rootCause: 'No circuit breaker to fail fast and protect system',
        fix: 'Implement circuit breaker (failure threshold, timeout, half-open state)',
        testCase: 'Force downstream to fail repeatedly; verify circuit opens and fast-fails',
        priority: 'P2',
      });
    }

    // Check for bulkhead isolation (separate pools/queues)
    const hasBulkhead = this.searchCode('pool.*size|queue.*length|Bulkhead|separate.*pool', { caseInsensitive: true });
    if (!hasBulkhead) {
      findings.push({
        dimension: 'Failure Scenarios',
        severity: 'LOW',
        location: 'codebase',
        exploit: 'Single resource pool shared by all services; one overloaded service starves others',
        impact: 'Partial degradation, resource starvation',
        rootCause: 'No bulkhead isolation between components',
        fix: 'Use separate connection pools/queues per service/tenant',
        testCase: 'Overload one service; verify others remain unaffected',
        priority: 'P3',
      });
    }

    // Check for graceful shutdown
    const hasGracefulShutdown = this.searchCode('SIGTERM|SIGINT|process\.on\([\'"]close[\'"]|shutdown|graceful', { caseInsensitive: true });
    if (!hasGracefulShutdown) {
      findings.push({
        dimension: 'Failure Scenarios',
        severity: 'HIGH',
        location: 'codebase',
        exploit: 'Process killed mid-request causes incomplete operations and data corruption',
        impact: 'Data loss, inconsistent state, user errors',
        rootCause: 'No signal handling for graceful termination',
        fix: 'Handle SIGTERM/SIGINT: stop accepting new work, finish in-flight, cleanup resources',
        testCase: 'Send SIGTERM during request processing; verify graceful completion before exit',
        priority: 'P0',
      });
    }

    return findings;
  }

  // ========== DIMENSION 8: Security Audit (STRIDE+DREAD) ==========
  private async auditSecuritySTRIDE(): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    const allFiles = this.findFiles('**/*.ts', { ignore: ['node_modules', 'dist', 'coverage'] });

    for (const file of allFiles.slice(0, 50)) {
      const content = readFileSync(path.join(this.cwd, file), 'utf-8');

      // Spoofing: Check authentication on state-changing endpoints
      const hasAuthCheck = /(auth|requireAuth|verifyToken|isAuthenticated|middleware)/i.test(content);
      if (/POST|PUT|DELETE/i.test(content) && !hasAuthCheck) {
        findings.push({
          dimension: 'Security (STRIDE)',
          severity: 'CRITICAL',
          location: file,
          exploit: 'Unauthenticated attacker can modify data',
          impact: 'Data tampering, privilege escalation, complete compromise',
          rootCause: 'State-changing endpoint lacks authentication check',
          fix: 'Apply authentication middleware to all mutating endpoints',
          testCase: 'Send POST/PUT/DELETE without token; verify 401 Unauthorized',
          priority: 'P0',
        });
      }

      // Tampering: Check for SQL/NoSQL injection
      if (/\.(execute|query|raw|findOne|find)\s*\(\s*[`'"`].*\+/.test(content) || /SELECT.*\+|INSERT.*\+/i.test(content)) {
        findings.push({
          dimension: 'Security (STRIDE)',
          severity: 'CRITICAL',
          location: file,
          exploit: 'User input concatenated into queries → SQL/NoSQL injection',
          impact: 'Data exfiltration, modification, deletion, authentication bypass',
          rootCause: 'String concatenation in database queries',
          fix: 'Use parameterized queries/ORM with bound parameters only; never concatenate strings',
          testCase: 'Inject SQL payload (e.g., admin\' OR \'1\'=\'1); verify query fails safely',
          priority: 'P0',
        });
      }

      // Repudiation: Check for audit logging
      if (/DELETE|UPDATE|CREATE/.test(content) && !/auditLog|logAudit|audit\.log/i.test(content)) {
        findings.push({
          dimension: 'Security (STRIDE)',
          severity: 'MEDIUM',
          location: file,
          exploit: 'Malicious actions not logged, attacker denies wrongdoing',
          impact: 'Cannot trace breaches, poor forensic capability',
          rootCause: 'Missing audit trails for sensitive operations',
          fix: 'Log all authentication attempts, data changes, admin actions with user ID, timestamp, details',
          testCase: 'Perform sensitive operation; verify audit log entry created',
          priority: 'P2',
        });
      }

      // Information Disclosure: Check for PII in logs
      if (/(console\.log|logger\.info|console\.error)/.test(content) && /(password|token|secret|ssn|credit|email|phone)/i.test(content)) {
        findings.push({
          dimension: 'Security (STRIDE)',
          severity: 'HIGH',
          location: file,
          exploit: 'Sensitive data written to logs can be exposed',
          impact: 'Data breach, compliance violation, credential leakage',
          rootCause: 'PII logged directly',
          fix: 'Never log sensitive data; mask/omit PII; use structured logging with sensitive fields filtered',
          testCase: 'Trigger log with PII; verify logs contain [REDACTED] or similar',
          priority: 'P0',
        });
      }

      // Denial of Service: Check for unbounded allocation
      if (/while\s*\(true\)|for\s*\(.*;.*;.*\)\s*\{/.test(content) && !/(break|return)/i.test(content)) {
        findings.push({
          dimension: 'Security (STRIDE)',
          severity: 'HIGH',
          location: file,
          exploit: 'Unbounded loops consume CPU, cause DoS',
          impact: 'Service unavailability, resource exhaustion',
          rootCause: 'Infinite or extremely long loops without exit condition',
          fix: 'Add iteration limits, timeouts, or break conditions; validate loop bounds',
          testCase: 'Trigger loop with large input; verify it terminates or times out',
          priority: 'P1',
        });
      }

      // Elevation of Privilege: Check for role/permission checks
      if (/role|permission|admin|privilege/i.test(content) && !/(if\s*\(\s*user\.role|hasRole|can\(|checkPermission)/i.test(content)) {
        findings.push({
          dimension: 'Security (STRIDE)',
          severity: 'CRITICAL',
          location: file,
          exploit: 'User can access privileged operations by manipulating role parameters',
          impact: 'Privilege escalation, unauthorized access',
          rootCause: 'Missing authorization check on privileged operations',
          fix: 'Enforce role-based access control on all sensitive operations; server-side only',
          testCase: 'Attempt admin operation with regular user role; verify forbidden',
          priority: 'P0',
        });
      }

      // XSS: Check for raw HTML output (if web)
      if (/res\.send\s*\(|<div>|innerHTML/.test(content) && !/(escape|encode|sanitize|DOMPurify)/i.test(content)) {
        findings.push({
          dimension: 'Security (STRIDE)',
          severity: 'HIGH',
          location: file,
          exploit: 'Unescaped user input rendered as HTML → XSS',
          impact: 'Session hijacking, credential theft, malware injection',
          rootCause: 'User input output without sanitization',
          fix: 'Encode/escape user input in HTML; use templating engine with auto-escaping; sanitize with DOMPurify',
          testCase: 'Inject <script>alert(1)</script> into field; verify not executed',
          priority: 'P0',
        });
      }

      // Command Injection: Check for child_process exec with user input
      if (/(execFile|exec|spawn)\s*\(.*\+/.test(content) || /\.concat\s*\(.*input/.test(content)) {
        findings.push({
          dimension: 'Security (STRIDE)',
          severity: 'CRITICAL',
          location: file,
          exploit: 'User input in command execution → arbitrary command injection',
          impact: 'Complete system compromise, data loss, ransomware',
          rootCause: 'User-controlled input passed to shell command without sanitization',
          fix: 'Use parameterized child_process calls (execFile with args array); never pass shell string',
          testCase: 'Inject "; rm -rf /" or similar; verify command rejected or safely handled',
          priority: 'P0',
        });
      }

      // JWT Verification: Check for JWT without signature verification
      if (/(jwt\.verify|token\.verify)/i.test(content) && !/RS256|ES256|algorithm/i.test(content)) {
        findings.push({
          dimension: 'Security (STRIDE)',
          severity: 'HIGH',
          location: file,
          exploit: 'JWT tokens not signature verified → token forgery possible',
          impact: 'Authentication bypass, privilege escalation',
          rootCause: 'JWT decoded but not verified (or using weak algorithm like HS256 without secret)',
          fix: 'Always verify JWT signature using RS256/ES256; reject unsigned tokens; validate issuer, audience, expiry',
          testCase: 'Forge JWT with false claims; verify server rejects invalid signature',
          priority: 'P0',
        });
      }

      // Webhook signature verification
      if (/webhook/i.test(content) && !/(signature|hmac|verifySecret)/i.test(content)) {
        findings.push({
          dimension: 'Security (STRIDE)',
          severity: 'HIGH',
          location: file,
          exploit: 'Unverified webhook can be spoofed by attacker',
          impact: 'Unauthorized actions, data poisoning, account takeover',
          rootCause: 'Webhook endpoints do not verify payload signature',
          fix: 'Verify HMAC signature using shared secret; reject if mismatch',
          testCase: 'Send webhook with wrong signature; verify request rejected',
          priority: 'P1',
        });
      }

      // Replay attack protection
      if (/(nonce|timestamp)/.test(content) && !/(nonce.*used|timestamp.*within|replay)/i.test(content)) {
        findings.push({
          dimension: 'Security (STRIDE)',
          severity: 'MEDIUM',
          location: file,
          exploit: 'Attacker replays captured request (e.g., payment) multiple times',
          impact: 'Double execution, financial loss',
          rootCause: 'No nonce or timestamp checking to prevent replay',
          fix: 'Use one-time nonces stored server-side or timestamp window checks (e.g., 5 min)',
          testCase: 'Replay same request twice; verify second rejected as duplicate/expired',
          priority: 'P2',
        });
      }
    }

    return findings;
  }

  // ========== DIMENSION 9: Scalability Analysis ==========
  private async auditScalability(): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    const allFiles = this.findFiles('**/*.ts', { ignore: ['node_modules'] });

    for (const file of allFiles.slice(0, 30)) {
      const content = readFileSync(path.join(this.cwd, file), 'utf-8');

      // O(n²) nested loops over same data
      if (/(for|while)\s*\([^)]+\s*\)\s*\{[^}]+(for|while)\s*\([^)]+\s*\)\s*\{[^}]*\}\s*\}/.test(content) && !/break|return/i.test(content)) {
        findings.push({
          dimension: 'Scalability',
          severity: 'HIGH',
          location: file,
          exploit: 'Nested loops over same dataset cause O(n²) complexity',
          impact: 'Performance degrades exponentially with data size; timeouts',
          rootCause: 'Inefficient algorithm with quadratic complexity',
          fix: 'Use hash maps (O(1) lookup), pre-sorting (O(n log n)), or database JOINs',
          testCase: 'Test with 1000 records; measure time; should be O(n) or O(n log n)',
          priority: 'P1',
        });
      }

      // N+1 query pattern (loop with DB call)
      if (/(for|forEach|map)\s*\([^)]+\s*\)\s*\{[^}]+(\.find|\.get|\.query|\.load)\s*\(/.test(content)) {
        findings.push({
          dimension: 'Scalability',
          severity: 'HIGH',
          location: file,
          exploit: 'Loop makes individual DB queries (N+1), causing excessive DB load',
          impact: 'Slow responses, DB overload, connection pool exhaustion',
          rootCause: 'Fetching related items one-by-one instead of batch',
          fix: 'Use JOIN or batch fetch (WHERE id IN (...)) to reduce queries to O(1) or O(2)',
          testCase: 'Load N related items; count queries; should be 1-2 not N+1',
          priority: 'P1',
        });
      }

      // Memory leak: accumulating data in loop without bound
      if (/(for|while)\s*\([^)]+\s*\)\s*\{[^}]+(push\.toArray|map\.toArray|collect)\s*\([^)]+\)\s*\.concat\s*\(/.test(content)) {
        findings.push({
          dimension: 'Scalability',
          severity: 'MEDIUM',
          location: file,
          exploit: 'Memory usage grows linearly with loop iterations, eventually OOM',
          impact: 'Process crash, downtime',
          rootCause: 'Accumulating results in memory without streaming or pagination',
          fix: 'Stream results, use pagination, or process in batches; avoid large in-memory arrays',
          testCase: 'Process 1M items; monitor memory; should stay bounded',
          priority: 'P2',
        });
      }

      // Blocking I/O in async: check sync file ops (fs.readFileSync, etc.)
      if (/async\s+\w+.*\{[^}]*\b(readFileSync|writeFileSync|execSync|JSON\.parse\(.*\))\b/.test(content)) {
        findings.push({
          dimension: 'Scalability',
          severity: 'MEDIUM',
          location: file,
          exploit: 'Blocking I/O stalls event loop, blocking all concurrent requests',
          impact: 'High latency, poor throughput, request queue backup',
          rootCause: 'Synchronous filesystem/network operations in async function',
          fix: 'Use async equivalents (fs.promises.readFile, await fetch, etc.)',
          testCase: 'Call blocking function under load; measure response time increase',
          priority: 'P2',
        });
      }

      // Large object allocations in loops
      if (/(for|while)\s*\([^)]+\s*\)\s*\{[^}]+new\s+\w+\s*\(/.test(content) && !/(buffer|pool|reuse)/i.test(content)) {
        findings.push({
          dimension: 'Scalability',
          severity: 'LOW',
          location: file,
          exploit: 'Many small allocations increase GC pressure',
          impact: 'GC pauses, CPU spikes, latency jitter',
          rootCause: 'Creating new objects inside loop without reuse',
          fix: 'Reuse objects via object pool or reuse pattern',
          testCase: 'Profile GC activity under load; should reduce frequency',
          priority: 'P3',
        });
      }
    }

    return findings;
  }

  // ========== DIMENSION 10: Observability & Monitoring ==========
  private async auditObservability(): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    const gaps: ObservabilityGap[] = [];

    const allFiles = this.findFiles('**/*.ts', { ignore: ['node_modules'] });

    // Check for structured logging (JSON)
    let hasStructuredLogs = false;
    for (const file of allFiles) {
      const content = readFileSync(path.join(this.cwd, file), 'utf-8');
      if (/(logger\.(info|warn|error)\s*\(\s*\{)/.test(content)) {
        hasStructuredLogs = true;
        break;
      }
    }
    if (!hasStructuredLogs) {
      gaps.push({
        category: 'logs',
        severity: 'HIGH',
        description: 'No structured JSON logging detected',
        recommendation: 'Use structured logging (JSON) with consistent fields: timestamp, level, message, component',
      });
    }

    // Check for correlation ID propagation
    let hasCorrelationId = false;
    for (const file of allFiles) {
      const content = readFileSync(path.join(this.cwd, file), 'utf-8');
      if (/x-request-id|x-correlation-id|requestId/i.test(content) && /pass.*header|propagate/i.test(content)) {
        hasCorrelationId = true;
        break;
      }
    }
    if (!hasCorrelationId) {
      gaps.push({
        category: 'logs',
        severity: 'MEDIUM',
        description: 'No correlation ID propagation detected',
        recommendation: 'Generate X-Request-ID on entry, propagate through all service calls, include in logs',
      });
    }

    // Check for custom metrics (Prometheus)
    const hasMetrics = this.searchCode('Counter|Gauge|Histogram|Summary|prometheus', { caseInsensitive: true });
    if (!hasMetrics) {
      gaps.push({
        category: 'metrics',
        severity: 'MEDIUM',
        description: 'No custom application metrics detected',
        recommendation: 'Add Prometheus metrics: http_requests_total (labels: method, path, status), http_request_duration_seconds, errors_total',
      });
    }

    // Check for health endpoints
    const routeFiles = this.findFiles('**/*.ts', { ignore: ['node_modules', 'dist', 'coverage'] });
    let hasHealthCheck = false;
    for (const file of routeFiles) {
      const content = readFileSync(path.join(this.cwd, file), 'utf-8');
      if (/health|healthz|live|ready/i.test(content) && /GET/.test(content)) {
        hasHealthCheck = true;
        break;
      }
    }
    if (!hasHealthCheck) {
      gaps.push({
        category: 'health',
        severity: 'HIGH',
        description: 'No health check endpoints detected',
        recommendation: 'Implement /health/live (process alive) and /health/ready (dependencies ready: DB, cache, queue)',
      });
    }

    // Check for distributed tracing (OpenTelemetry)
    const hasTracing = this.searchCode('tracer|trace|span|opentelemetry|otel', { caseInsensitive: true });
    if (!hasTracing) {
      gaps.push({
        category: 'traces',
        severity: 'LOW',
        description: 'No distributed tracing detected',
        recommendation: 'Integrate OpenTelemetry; create spans for cross-service calls and DB queries',
      });
    }

    // Check for alerting on critical errors
    const hasAlerting = this.searchCode('alert|pagerduty|opsgenie|slack.*webhook', { caseInsensitive: true });
    if (!hasAlerting) {
      gaps.push({
        category: 'alerts',
        severity: 'MEDIUM',
        description: 'No alerting configuration detected',
        recommendation: 'Set up alerts for: error rate > threshold, latency p99 > target, disk >80%, memory >90%',
      });
    }

    // Convert gaps to findings
    for (const gap of gaps) {
      findings.push({
        dimension: 'Observability & Monitoring',
        severity: gap.severity,
        location: 'codebase',
        exploit: 'Missing observability makes debugging and incident response slow or impossible',
        impact: 'Long MTTR, undetected failures, poor SLO compliance',
        rootCause: gap.description,
        fix: gap.recommendation,
        testCase: 'Inject failure; verify logs/metrics/traces capture it and alerts fire',
        priority: gap.severity === 'CRITICAL' || gap.severity === 'HIGH' ? 'P1' : 'P2',
      });
    }

    return findings;
  }

  // ========== DIMENSION 8 helpers (Security) ==========
  private async auditSecurity(): Promise<AuditFinding[]> {
    // Already covered in auditSecuritySTRIDE; this is placeholder if needed
    return [];
  }

  // ========== HELPER METHODS ==========
  private findFiles(patterns: string | string[], options: { ignore?: string[] } = {}): string[] {
    const globs = Array.isArray(patterns) ? patterns : [patterns];
    let files: string[] = [];

    for (const pattern of globs) {
      try {
        const matches = this.globSync(pattern, options);
        files.push(...matches);
      } catch (e) {
        // ignore
      }
    }

    // Deduplicate and limit
    return [...new Set(files)].slice(0, 100);
  }

  private globSync(pattern: string, options: { ignore?: string[] } = {}): string[] {
    // Simple implementation using readdir recursively
    const results: string[] = [];
    const ignore = options.ignore || [];

    const walk = (dir: string): void => {
      try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relPath = path.relative(this.cwd, fullPath);

          // Skip ignored
          if (ignore.some(ign => relPath.includes(ign))) continue;

          if (entry.isDirectory()) {
            walk(fullPath);
          } else {
            if (this.matchPattern(relPath, pattern)) {
              results.push(relPath);
            }
          }
        }
      } catch (e) {
        // ignore unreadable dirs
      }
    };
    walk(this.cwd);
    return results;
  }

  private matchPattern(filePath: string, pattern: string): boolean {
    // Simple glob: **/*.ts matches any .ts file in subdirectories
    if (pattern === '**/*.ts') return filePath.endsWith('.ts');
    if (pattern === '**/*route*.ts') return filePath.includes('route') && filePath.endsWith('.ts');
    if (pattern === '**/api/**/*.ts') return filePath.includes('/api/') && filePath.endsWith('.ts');
    if (pattern === '**/*db*.ts') return filePath.includes('db') && filePath.endsWith('.ts');
    if (pattern === '**/*repository*.ts') return filePath.includes('repository') && filePath.endsWith('.ts');
    if (pattern === '**/*model*.ts') return filePath.includes('model') && filePath.endsWith('.ts');
    if (pattern === '**/*cache*.ts') return filePath.includes('cache') && filePath.endsWith('.ts');
    if (pattern === '**/*redis*.ts') return filePath.includes('redis') && filePath.endsWith('.ts');
    return false;
  }

  private searchCode(pattern: string, options: { caseInsensitive?: boolean; minOccurrences?: number; alsoCheckTimeout?: boolean } = {}): boolean {
    let regex: RegExp;
    try {
      const flags = options.caseInsensitive ? 'gi' : 'g';
      regex = new RegExp(pattern, flags);
    } catch (error) {
      logger.warn('Invalid regex pattern', { pattern, error: String(error) });
      return false;
    }
    let count = 0;

    const files = this.findFiles('**/*.ts', { ignore: ['node_modules'] });
    for (const file of files) {
      const content = readFileSync(path.join(this.cwd, file), 'utf-8');
      let match;
      while ((match = regex.exec(content)) !== null) {
        count++;
        if (options.minOccurrences && count >= options.minOccurrences) return true;
      }
    }
    return count > 0;
  }

  private hasTimeoutConfigured(): boolean {
    // Simple check: look for timeout configs in common places
    return this.searchCode('timeout\s*[:=]\s*\d+|connectTimeout|readTimeout|requestTimeout', { caseInsensitive: true });
  }

  private extractFunctionBlock(content: string, startIndex: number): string {
    const braceStack: string[] = [];
    let i = startIndex;
    const n = content.length;

    // Find opening brace
    while (i < n && content[i] !== '{' && content[i] !== '(') i++;
    if (i >= n) return '';

    // Check if it's a function expression (est- cioè)
    if (content[i] === '(') {
      // Skip until we find the arrow or opening brace
      while (i < n && content[i] !== '=' && content[i] !== '{' && content[i] !== '=>') i++;
      if (content[i] === '=>') i++;
    }

    // Now find opening brace of function body
    while (i < n && content[i] !== '{') i++;
    if (i >= n) return '';

    braceStack.push('{');
    const start = i;
    i++;

    while (i < n && braceStack.length > 0) {
      if (content[i] === '{') braceStack.push('{');
      else if (content[i] === '}') braceStack.pop();
      i++;
    }

    return content.slice(start, i);
  }

  checkCompliance(): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];

    // GDPR: Check for data minimization, consent, etc.
    const hasPii = this.searchCode('email|phone|ssn|address|personal|pii', { caseInsensitive: true });
    const hasDataMinimization = this.searchCode('select.*fields?|projection|only.*need', { caseInsensitive: true });
    const hasConsent = this.searchCode('consent|gdpr|dataSubject', { caseInsensitive: true });
    const hasDeletion = this.searchCode('deleteUser|erase|right.*erasure', { caseInsensitive: true });

    if (hasPii) {
      checks.push({
        standard: 'GDPR',
        status: hasDataMinimization && hasConsent && hasDeletion ? 'compliant' : 'gap',
        description: 'General Data Protection Regulation (EU)',
        missingControls: [
          ...(!hasDataMinimization ? ['Data minimization (only collect necessary data)'] : []),
          ...(!hasConsent ? ['Consent management'] : []),
          ...(!hasDeletion ? ['Right to erasure'] : []),
        ],
      });
    } else {
      checks.push({ standard: 'GDPR', status: 'not-applicable', description: 'No PII detected', missingControls: [] });
    }

    // PCI-DSS: Check for payment data
    const hasPayment = this.searchCode('credit|card|payment|cvv|pan', { caseInsensitive: true });
    if (hasPayment) {
      checks.push({
        standard: 'PCI-DSS',
        status: 'gap',
        description: 'Payment Card Industry Data Security Standard',
        missingControls: [
          'Never store CVV',
          'PAN must be masked (first 6/last 4 only) or encrypted',
          'Network segmentation',
          'Quarterly ASV scans',
          'MFA for admin',
        ],
      });
    } else {
      checks.push({ standard: 'PCI-DSS', status: 'not-applicable', description: 'No payment data detected', missingControls: [] });
    }

    // HIPAA: Check for health data (PHI)
    const hasHealth = this.searchCode('health|medical|diagnosis|treatment|patient|phi|protected.*health', { caseInsensitive: true });
    if (hasHealth) {
      checks.push({
        standard: 'HIPAA',
        status: 'gap',
        description: 'Health Insurance Portability and Accountability Act (US)',
        missingControls: [
          'RBAC enforced',
          'Audit logs for all PHI access',
          'Encryption at rest (AES-256) and in transit (TLS 1.2+)',
          'Encrypted backups with quarterly restore test',
          'BAAs with vendors',
        ],
      });
    } else {
      checks.push({ standard: 'HIPAA', status: 'not-applicable', description: 'No health data detected', missingControls: [] });
    }

    // SOX: Check for financial calculations (if present)
    const hasFinancial = this.searchCode('revenue|profit|balance|accounting|tax|sox', { caseInsensitive: true });
    if (hasFinancial) {
      checks.push({
        standard: 'SOX',
        status: 'gap',
        description: 'Sarbanes-Oxley Act (financial reporting)',
        missingControls: [
          'Change management with approvals and logs',
          'Separation of duties (dev ≠ deployer ≠ approver)',
          'Retention 7+ years (immutable storage)',
          'Automated quarterly audits',
          'No manual acceptance for financial calc',
        ],
      });
    } else {
      checks.push({ standard: 'SOX', status: 'not-applicable', description: 'No financial reporting detected', missingControls: [] });
    }

    return checks;
  }

  private identifyObservabilityGaps(findings: AuditFinding[]): ObservabilityGap[] {
    // Extract observability-related findings
    return findings
      .filter(f => f.dimension === 'Observability & Monitoring')
      .map(f => ({
        category: f.location.includes('log') ? 'logs' : f.location.includes('metric') ? 'metrics' : f.location.includes('trace') ? 'traces' : f.location.includes('health') ? 'health' : 'alerts',
        description: f.rootCause,
        severity: f.severity as any,
        recommendation: f.fix,
      }));
  }

  private generateRecommendations(findings: AuditFinding[], score: number): string[] {
    const recs: string[] = [];

    // Prioritized by severity and dimension
    const critical = findings.filter(f => f.severity === 'CRITICAL');
    const high = findings.filter(f => f.severity === 'HIGH');
    const medium = findings.filter(f => f.severity === 'MEDIUM');
    const low = findings.filter(f => f.severity === 'LOW');

    if (critical.length > 0) {
      recs.push(`[P0] Fix ${critical.length} CRITICAL issues immediately:`);
      for (const f of critical.slice(0, 5)) {
        recs.push(`  - ${f.dimension}: ${f.rootCause} (${f.location})`);
      }
    }

    if (high.length > 0) {
      recs.push(`[P1] Address ${high.length} HIGH severity issues this sprint:`);
      for (const f of high.slice(0, 5)) {
        recs.push(`  - ${f.dimension}: ${f.rootCause}`);
      }
    }

    if (medium.length > 0) {
      recs.push(`[P2] Schedule ${medium.length} MEDIUM issues next sprint/quarter.`);
    }

    if (low.length > 0) {
      recs.push(`[P3] LOW issues (${low.length}) can be addressed as time permits.`);
    }

    // Overall score recommendations
    if (score < 70) {
      recs.push('Urgent: System has critical safety issues. Address P0/P1 before any production deployment.');
    } else if (score < 90) {
      recs.push('Plan: Work toward 90+ score; focus on high-impact gaps.');
    } else {
      recs.push('Good: System meets production standards. Maintain vigilance with continuous monitoring.');
    }

    return recs;
  }

  formatReport(report: AuditReport): string {
    let text = `# System Audit Report\n\n`;
    text += `## Executive Summary\n`;
    text += `- Overall Risk: ${report.overallRisk}\n`;
    text += `- Critical Issues: ${report.criticalCount}\n`;
    text += `- High Issues: ${report.highCount}\n`;
    text += `- Medium Issues: ${report.mediumCount}\n`;
    text += `- Low Issues: ${report.lowCount}\n`;
    text += `- Score: ${report.score}/100\n`;
    text += `- Estimated Fix Time: ${Math.ceil(report.criticalCount * 8 + report.highCount * 4 + report.mediumCount * 2)} hours\n\n`;

    if (report.findings.length > 0) {
      text += `## Detailed Findings\n\n`;
      for (const f of report.findings) {
        const icon = f.severity === 'CRITICAL' ? '🔥' : f.severity === 'HIGH' ? '⚠️' : f.severity === 'MEDIUM' ? '⚡' : '✓';
        text += `### ${icon} [${f.severity}] ${f.dimension}\n`;
        text += `- **Location**: ${f.location}\n`;
        text += `- **Exploit**: ${f.exploit}\n`;
        text += `- **Impact**: ${f.impact}\n`;
        text += `- **Root Cause**: ${f.rootCause}\n`;
        text += `- **Fix**: ${f.fix}\n`;
        text += `- **Test Case**: ${f.testCase}\n`;
        text += `- **Priority**: ${f.priority}\n\n`;
      }
    }

    text += `## Compliance Check\n`;
    for (const c of report.compliance) {
      const statusIcon = c.status === 'compliant' ? '✅' : c.status === 'gap' ? '⚠️' : '➖';
      text += `- [${c.status === 'compliant' ? 'x' : ' '}] ${c.standard}: ${statusIcon} ${c.description}\n`;
      if (c.missingControls.length > 0) {
        for (const gap of c.missingControls) {
          text += `  - Missing: ${gap}\n`;
        }
      }
    }

    if (report.observabilityGaps.length > 0) {
      text += `\n## Observability Gaps\n`;
      for (const gap of report.observabilityGaps) {
        text += `- [${gap.severity}] ${gap.category}: ${gap.description}\n  - Recommendation: ${gap.recommendation}\n`;
      }
    }

    text += `\n## Recommendations (Prioritized)\n`;
    for (const rec of report.recommendations) {
      text += `${rec}\n`;
    }

    return text;
  }
}
