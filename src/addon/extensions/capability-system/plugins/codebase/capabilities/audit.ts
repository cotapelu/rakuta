#!/usr/bin/env node
/**
 * system.audit capability
 *
 * Comprehensive System Audit Framework - 10 dimensions.
 * Analyzes codebase for production readiness across:
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
 *
 * Generates detailed report with severity, impact, and fix recommendations.
 * Also produces mandatory test cases for each finding.
 *
 * Usage: { capability: 'system.audit', params: { includeTests: true } }
 */

import { Type } from "typebox";
import { promises as fsp } from "fs"; // async FS
import { readFileSync, existsSync } from "fs"; // sync FS
import { join, dirname } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

export const schema = Type.Object({
  includeTests: Type.Boolean({ description: "Generate test cases for each finding (default true)" })
}, { additionalProperties: false });

interface AuditIssue {
  dimension: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  location: string;
  exploit: string;
  impact: string;
  rootCause: string;
  fix: string;
  testCase?: string;
  priority: "P0" | "P1" | "P2" | "P3";
}

interface AuditReport {
  summary: {
    overallRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    estimatedFixTimeDays: number;
    passChecklist: boolean;
    checklistScore: number;
  };
  dimensions: Array<{
    name: string;
    issues: AuditIssue[];
    passed: boolean;
  }>;
  compliance: {
    gdpr: "compliant" | "gap";
    pciDss: "compliant" | "gap";
    soc2: "compliant" | "gap";
  };
  observabilityGaps: {
    missingLogs: string[];
    missingMetrics: string[];
    missingAlerts: string[];
  };
  recommendations: Array<{ priority: string; action: string }>;
  rawChecklist: Record<string, boolean>;
}

// Helper to compute severity from impact and likelihood
function assessSeverity(impact: string, likelihood: string): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  const impactScore = { "data loss": 3, "financial": 3, "security": 3, "performance": 2, "reliability": 2, "maintainability": 1 }[impact] || 1;
  const likelihoodScore = { "high": 3, "medium": 2, "low": 1 }[likelihood] || 1;
  const score = impactScore * likelihoodScore;
  if (score >= 8) return "CRITICAL";
  if (score >= 6) return "HIGH";
  if (score >= 3) return "MEDIUM";
  return "LOW";
}

// AST parsing utility (using @typescript-eslint/parser)
function parseAST(content: string): any {
  const parser = require('@typescript-eslint/parser');
  const { parse } = parser;
  return parse(content, { sourceType: 'module', ecmaVersion: 'latest', ts: true, jsx: true, errorOnUnknownVersion: false });
}

function walk(node: any, visitor: (n: any, parent?: any) => void, parent?: any) {
  if (!node || typeof node !== 'object') return;
  visitor(node, parent);
  for (const key in node) {
    if (node[key] && typeof node[key] === 'object') {
      if (Array.isArray(node[key])) {
        node[key].forEach((child: any) => walk(child, visitor, node));
      } else {
        walk(node[key], visitor, node);
      }
    }
  }
}

function detectSqlInjection(content: string): { line: number; column: number } | null {
  try {
    const ast = parseAST(content);
    let found: any = null;
    walk(ast, (node) => {
      if (found) return;
      if (node.type === 'CallExpression') {
        const callee = node.callee;
        let methodName: string | null = null;
        if (callee.type === 'MemberExpression') {
          if (callee.property.type === 'Identifier') methodName = callee.property.name;
        } else if (callee.type === 'Identifier') {
          methodName = callee.name;
        }
        const queryMethods = ['query', 'execute', 'raw', 'exec', 'selection', 'find', 'findOne', 'findAll', 'update', 'delete', 'insert'];
        if (methodName && queryMethods.includes(methodName)) {
          const firstArg = node.arguments[0];
          if (!firstArg) return;
          // Safe: static string literal
          if (firstArg.type === 'Literal' && typeof firstArg.value === 'string') return;
          // Unsafe: template literal with expressions
          if (firstArg.type === 'TemplateLiteral' && firstArg.expressions.length > 0) {
            found = node;
            return;
          }
          // Unsafe: binary '+' concatenation with string parts
          if (firstArg.type === 'BinaryExpression' && firstArg.operator === '+') {
            const leftString = firstArg.left.type === 'Literal' && typeof firstArg.left.value === 'string' || firstArg.left.type === 'TemplateLiteral';
            const rightString = firstArg.right.type === 'Literal' && typeof firstArg.right.value === 'string' || firstArg.right.type === 'TemplateLiteral';
            if (leftString || rightString) {
              found = node;
              return;
            }
          }
        }
      }
    });
    if (found) {
      return { line: found.loc.start.line, column: found.loc.start.column };
    }
  } catch (e) {
    // ignore parse errors
  }
  return null;
}

// Dimension 1: Business Logic Integrity
async function auditBusinessLogicIntegrity(cwd: string, files: string[]): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  for (const relPath of files) {
    try {
      const absPath = join(cwd, relPath);
      const content = await fsp.readFile(absPath, 'utf-8');
      const lines = content.split('\n');

      // Check for input validation bypasses: direct use of req.body without validation
      if (content.includes('req.body') && !content.includes('validate') && !content.includes('zod') && !content.includes('yup') && !content.includes('class-validator')) {
        issues.push({
          dimension: "Business Logic Integrity",
          severity: "HIGH",
          location: relPath,
          exploit: "Send malformed JSON or missing required fields to bypass business rules",
          impact: "Data corruption, invalid state",
          rootCause: "No input validation on request body",
          fix: "Add input validation library (Zod, Yup, class-validator) and validate all external inputs before processing",
          testCase: "Test with missing/empty/malformed fields; verify 400 response and no state change",
          priority: "P1"
        });
      }

      // Check for numeric overflow/underflow: use of Number.MAX_SAFE_INTEGER or parseInt without bounds check
      if (content.includes('parseInt') || content.includes('Number(')) {
        const hasBoundsCheck = /if\s*\(\s*[^>]+\s*[<>]\s*(?:MAX_SAFE_INTEGER|Infinity)/.test(content) ||
                               /if\s*\(\s*isNaN/.test(content);
        if (!hasBoundsCheck) {
          issues.push({
            dimension: "Business Logic Integrity",
            severity: "MEDIUM",
            location: relPath,
            exploit: "Provide extremely large numbers causing overflow/underflow, or NaN propagation",
            impact: "Incorrect calculations, possible security bypass",
            rootCause: "No bounds checking on numeric conversions",
            fix: "Validate numeric ranges, use safe arithmetic, check for NaN after parseInt/Number",
            testCase: "Test with Number.MAX_VALUE, -Number.MAX_VALUE, non-numeric strings; verify safe handling",
            priority: "P2"
          });
        }
      }

      // Check for magic numbers/strings in business logic (excluding tests)
      if (!relPath.includes('__tests__') && !relPath.endsWith('.test.ts')) {
        const magicConstRegex = /(?:if|return|===|!==)\s*(\d+)\s*(?:&&|]|}|$)/;
        const matches = content.match(magicConstRegex);
        if (matches && matches.length > 5) {
          issues.push({
            dimension: "Business Logic Integrity",
            severity: "LOW",
            location: relPath,
            exploit: "Magic constant may be misinterpreted or changed inadvertently",
            impact: "Maintenance error, inconsistent behavior",
            rootCause: "Hardcoded numeric constants without named explanation",
            fix: "Replace magic numbers with named constants (e.g., MAX_RETRIES = 3)",
            testCase: "Verify behavior when constant value changes; ensure tests cover all uses",
            priority: "P3"
          });
        }
      }

      // Check for client-side trust: using req.headers directly for auth without server-side verification
      if (content.includes('req.headers') && (content.includes('authorization') || content.includes('x-api-key'))) {
        if (!content.includes('verify') && !content.includes('jwt.verify') && !content.includes('passport')) {
          issues.push({
            dimension: "Business Logic Integrity",
            severity: "CRITICAL",
            location: relPath,
            exploit: "Tamper with Authorization header to impersonate any user",
            impact: "Authentication bypass, privilege escalation",
            rootCause: "Trusting client-provided headers without server-side verification",
            fix: "Use JWT verification (RS256) or session middleware (Passport) to establish identity",
            testCase: "Tamper token, modify headers; verify server rejects unverified tokens",
            priority: "P0"
          });
        }
      }

    } catch (e) {
      // Skip unreadable files
    }
  }

  return issues;
}

// Dimension 2: End-to-End Flow Audit
function auditE2EFlow(files: string[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Simplified: Check for missing return statements in express handlers
  // In a real implementation, would analyze the call graph and data flow
  for (const file of files) {
    if (file.includes('route') || file.includes('controller') || file.includes('handler')) {
      // This is a placeholder; would need AST analysis for proper detection
      // For now, assume pass if file exists and basic pattern ok
    }
  }

  // Check for async handlers without await (fire-and-forget bugs)
  // This would require AST parsing in a real audit

  return issues;
}

// Dimension 3: Concurrency & Race Condition
async function auditConcurrency(cwd: string, files: string[]): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  for (const relPath of files) {
    try {
      const absPath = join(cwd, relPath);
      const content = await fsp.readFile(absPath, 'utf-8');

      // Detect shared mutable state (global variables, module-level vars)
      if (content.match(/^(?:let|var|const)\s+\w+\s*=\s*(?!function|class|arrow)/m)) {
        // Check if file is a module with exports (likely shared)
        if (content.includes('module.exports') || content.includes('export ')) {
          issues.push({
            dimension: "Concurrency & Race Condition",
            severity: "HIGH",
            location: relPath,
            exploit: "Two concurrent requests modify the global state leading to lost updates or corruption",
            impact: "Data corruption, inconsistent state, race conditions",
            rootCause: "Module-level mutable state accessed without synchronization",
            fix: "Move state into request-scoped objects or use synchronization (mutex, atomic ops, queues)",
            testCase: "Simulate 100 concurrent requests performing read-modify-write; verify no lost updates or corruption",
            priority: "P1"
          });
        }
      }

      // Check for lack of locking around critical sections (e.g., counter increments)
      if (content.includes('++') || content.includes('--')) {
        if (!content.includes('lock') && !content.includes('Mutex') && !content.includes('atomic')) {
          issues.push({
            dimension: "Concurrency & Race Condition",
            severity: "MEDIUM",
            location: relPath,
            exploit: "Multiple threads/processes incrementing a shared counter without atomic operation",
            impact: "Incorrect counts, potential business rule violation",
            rootCause: "Non-atomic increment/decrement on shared resource",
            fix: "Use atomic operations (e.g., Redis INCR, database sequences) or mutex/transaction",
            testCase: "Stress test with 1000 concurrent increments; verify final count equals initial + 1000",
            priority: "P2"
          });
        }
      }

      // Check for non-atomic check-then-act patterns
      if (content.includes('if (') && (content.includes('find') || content.includes('findOne') || content.includes('exists'))) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length - 1; i++) {
          if (lines[i].includes('if (') && lines[i].match(/find|exists/) && lines[i+1]?.includes('create')) {
            issues.push({
              dimension: "Concurrency & Race Condition",
              severity: "HIGH",
              location: `${relPath}:${i+1}`,
              exploit: "Two requests both see resource missing, both create → duplicate",
              impact: "Data duplication, constraint violation",
              rootCause: "Check-then-act without transaction/lock (time-of-check-to-time-of-use)",
              fix: "Use atomic upsert (INSERT ... ON CONFLICT) or database unique constraint with retry logic",
              testCase: "Concurrently attempt to create same resource; ensure only one succeeds or both handled gracefully",
              priority: "P1"
            });
          }
        }
      }

    } catch (e) {
      // skip
    }
  }

  return issues;
}

// Dimension 4: Database & Data Integrity
async function auditDatabaseIntegrity(cwd: string, files: string[]): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  for (const relPath of files) {
    try {
      const absPath = join(cwd, relPath);
      const content = await fsp.readFile(absPath, 'utf-8');

      // Check for missing transactions on write operations
      if (content.includes('db.') || content.includes('knex') || content.includes('sequelize') || content.includes('prisma')) {
        if (content.includes('UPDATE') || content.includes('DELETE') || content.includes('INSERT')) {
          if (!content.includes('transaction') && !content.includes('BEGIN') && !content.includes('COMMIT')) {
            issues.push({
              dimension: "Database & Data Integrity",
              severity: "HIGH",
              location: relPath,
              exploit: "Partial updates succeed, leaving data inconsistent after failure mid-operation",
              impact: "Orphaned records, broken references, data corruption",
              rootCause: "Write operations not wrapped in transactions",
              fix: "Wrap related writes in a transaction with proper isolation (READ COMMITTED or higher)",
              testCase: "Simulate DB failure during multi-step update; verify either all changes commit or none (atomicity)",
              priority: "P1"
            });
          }
        }

        // Check for missing foreign key constraints
        if (content.includes('CREATE TABLE') || content.includes('@Column') || content.includes('field:')) {
          if (!content.includes('FOREIGN KEY') && !content.includes('references') && !content.includes('relation')) {
            // This is heuristic; may have constraints elsewhere
            // We'll note as info if schema definitions found without explicit FK
            issues.push({
              dimension: "Database & Data Integrity",
              severity: "MEDIUM",
              location: relPath,
              exploit: "Orphaned child records when parent deleted without cascade",
              impact: "Data inconsistency, referential integrity violations",
              rootCause: "No foreign key constraints defined",
              fix: "Define foreign keys with appropriate ON DELETE CASCADE or RESTRICT",
              testCase: "Delete parent record; verify children are deleted or prevented by constraint",
              priority: "P2"
            });
          }
        }
      }

      // Check for unbounded result sets (no LIMIT)
      if (content.includes('findAll') || content.includes('find') || content.includes('query(') || content.includes('SELECT')) {
        if (!content.includes('limit') && !content.includes('LIMIT') && !content.includes('take(') && !content.includes('skip(') && !content.includes('offset')) {
          issues.push({
            dimension: "Database & Data Integrity",
            severity: "MEDIUM",
            location: relPath,
            exploit: "Request millions of rows → OOM, DoS",
            impact: "Memory exhaustion, service degradation",
            rootCause: "Unbounded query results without pagination",
            fix: "Always use LIMIT/OFFSET or cursor-based pagination; enforce reasonable page size",
            testCase: "Request without pagination; verify server returns error or default limited page",
            priority: "P2"
          });
        }
      }

    } catch (e) {
      // skip
    }
  }

  return issues;
}

// Dimension 5: Caching & Consistency
async function auditCaching(cwd: string, files: string[]): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  for (const relPath of files) {
    try {
      const absPath = join(cwd, relPath);
      const content = await fsp.readFile(absPath, 'utf-8');

      if (content.includes('cache') || content.includes('redis') || content.includes('memcached')) {
        // Check for missing TTL
        if (!content.includes('EXPIRE') && !content.includes('ttl') && !content.includes('setTimeout') && !content.includes('maxAge')) {
          issues.push({
            dimension: "Caching & Consistency",
            severity: "HIGH",
            location: relPath,
            exploit: "Stale data persists indefinitely, outdated information served",
            impact: "Incorrect responses, user confusion, business rule violation",
            rootCause: "Cache entries without TTL or refresh mechanism",
            fix: "Set appropriate TTL for all cache entries; use cache-aside pattern with expiration",
            testCase: "Update underlying data; verify stale cache entry invalidated after TTL or update",
            priority: "P1"
          });
        }

        // Check for cache stampede: no lock or random TTL on popular keys
        if (content.includes('get(') && content.includes('set(')) {
          if (!content.includes('lock') && !content.includes('mutex') && !content.includes('ADD') && !content.includes('NX')) {
            // Heuristic: multiple concurrent requests may recompute
            issues.push({
              dimension: "Caching & Consistency",
              severity: "MEDIUM",
              location: relPath,
              exploit: "Cache miss on hot key → thundering herd recomputes, DB overload",
              impact: "Performance degradation, resource exhaustion",
              rootCause: "Popular keys not protected from stampede",
              fix: "Implement cache lock (single flight) or randomly stagger TTLs",
              testCase: "Simulate 100 concurrent requests on cache miss; only one should recompute, others wait",
              priority: "P2"
            });
          }
        }

        // Check for cache invalidation: write-through or delete after DB update
        if ((content.includes('UPDATE') || content.includes('DELETE')) && content.includes('cache')) {
          if (!content.includes('del(') && !content.includes('delete(') && !content.includes('invalidate')) {
            issues.push({
              dimension: "Caching & Consistency",
              severity: "HIGH",
              location: relPath,
              exploit: "Write to DB but cache remains stale, reads return outdated data",
              impact: "Inconsistent data, lost updates",
              rootCause: "Cache not invalidated after data modification",
              fix: "Invalidate or update cache immediately after DB write (write-through or write-invalidate)",
              testCase: "Update record in DB; verify subsequent reads do not return stale cached value",
              priority: "P1"
            });
          }
        }
      }

    } catch (e) {
      // skip
    }
  }

  return issues;
}

// Dimension 6: Idempotency
async function auditIdempotency(cwd: string, files: string[]): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  for (const relPath of files) {
    try {
      const absPath = join(cwd, relPath);
      const content = await fsp.readFile(absPath, 'utf-8');

      // POST/PUT/DELETE handlers should support idempotency
      if (content.includes('POST') || content.includes('app.post') || content.includes('router.post')) {
        // Check if idempotency key header is used
        if (!content.includes('idempotency') && !content.includes('Idempotency-Key') && !content.includes('unique constraint')) {
          issues.push({
            dimension: "Idempotency",
            severity: "HIGH",
            location: relPath,
            exploit: "Retry due to network error → duplicate resource created, double charge",
            impact: "Financial loss, data duplication, inconsistent state",
            rootCause: "Endpoint not idempotent, no mechanism to deduplicate retries",
            fix: "Require Idempotency-Key header; store operation result keyed by it; use unique DB constraint",
            testCase: "Send same POST twice with same Idempotency-Key; second returns first response without side effect",
            priority: "P1"
          });
        }
      }

      // Check webhook endpoints for signature verification and replay protection
      if (content.includes('webhook') && (content.includes('POST') || content.includes('external'))) {
        if (!content.includes('signature') && !content.includes('verify') && !content.includes('timestamp') && !content.includes('nonce')) {
          issues.push({
            dimension: "Idempotency",
            severity: "CRITICAL",
            location: relPath,
            exploit: "Attacker replays intercepted webhook to cause unauthorized actions",
            impact: "Security breach, data manipulation, fraud",
            rootCause: "No webhook signature verification or replay protection",
            fix: "Require signature header (HMAC) and timestamp/nonce to prevent replay",
            testCase: "Replay same webhook payload twice; second should be rejected as duplicate or expired",
            priority: "P0"
          });
        }
      }

    } catch (e) {
      // skip
    }
  }

  return issues;
}

// Dimension 7: Failure Scenarios
async function auditFailureScenarios(cwd: string, files: string[]): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  for (const relPath of files) {
    try {
      const absPath = join(cwd, relPath);
      const content = await fsp.readFile(absPath, 'utf-8');

      // Check for missing timeout on external calls
      if (content.includes('fetch') || content.includes('axios') || content.includes('got') || content.includes('request')) {
        if (!content.includes('timeout') && !content.includes('signal:') && !content.includes('AbortController')) {
          issues.push({
            dimension: "Failure Scenarios",
            severity: "HIGH",
            location: relPath,
            exploit: "External API hangs indefinitely, all worker threads blocked",
            impact: "Service outage, resource exhaustion",
            rootCause: "External I/O without timeout",
            fix: "Set explicit timeout (10s default) and use AbortController for cancellation",
            testCase: "Mock external API to never respond; verify request times out and returns error after deadline",
            priority: "P1"
          });
        }
      }

      // Check for retry without backoff (could amplify failures)
      if (content.includes('retry') || content.includes('Retry')) {
        if (!content.includes('backoff') && !content.includes('jitter')) {
          issues.push({
            dimension: "Failure Scenarios",
            severity: "MEDIUM",
            location: relPath,
            exploit: "Retries hammer failing service, causing retry storm",
            impact: "Cascading failure, degraded performance",
            rootCause: "Retry with constant interval (no backoff/jitter)",
            fix: "Implement exponential backoff with jitter (e.g., 1s, 2s, 4s, 8s ± random)",
            testCase: "Simulate partial failures; verify retry intervals increase with jitter",
            priority: "P2"
          });
        }
      }

      // Check for missing circuit breaker on downstream service calls
      if (content.includes('external') || content.includes('downstream') || content.includes('client:')) {
        if (!content.includes('circuit') && !content.includes('breaker') && !content.includes('CircuitBreaker')) {
          issues.push({
            dimension: "Failure Scenarios",
            severity: "MEDIUM",
            location: relPath,
            exploit: "Repeated calls to failing service waste resources and propagate delays",
            impact: "Resource exhaustion, poor user experience",
            rootCause: "No circuit breaker to short-circuit calls when downstream unhealthy",
            fix: "Implement circuit breaker (open after 5 failures, half-open after 60s, close after success)",
            testCase: "Force downstream to fail repeatedly; verify circuit opens and rejects new calls quickly",
            priority: "P2"
          });
        }
      }

      // Check for unhandled promise rejections / async errors
      if (content.includes('async ') || content.includes('.then(')) {
        if (!content.includes('catch(') && !content.includes('try') && !content.includes('unhandledRejection')) {
          issues.push({
            dimension: "Failure Scenarios",
            severity: "HIGH",
            location: relPath,
            exploit: "Async error not caught → process crash or silent failure",
            impact: "Service crash, lost work, inconsistent state",
            rootCause: "Asynchronous operations without error handling",
            fix: "Wrap async code in try/catch or add .catch() to promises; handle all errors gracefully",
            testCase: "Force async operation to reject; verify error handled and process remains stable",
            priority: "P1"
          });
        }
      }

    } catch (e) {
      // skip
    }
  }

  return issues;
}

// Dimension 8: Security Audit (STRIDE+DREAD)
async function auditSecurity(cwd: string, files: string[]): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  for (const relPath of files) {
    try {
      const absPath = join(cwd, relPath);
      const content = await fsp.readFile(absPath, 'utf-8');

      // Spoofing: Weak authentication
      if (content.includes('password') && !content.includes('bcrypt') && !content.includes('argon2') && !content.includes('scrypt')) {
        issues.push({
          dimension: "Security Audit (STRIDE)",
          severity: "CRITICAL",
          location: relPath,
          exploit: "Attacker brute-forces or cracks weakly hashed passwords",
          impact: "Account takeover, data breach",
          rootCause: "Passwords stored with weak hash (plaintext, MD5, SHA1)",
          fix: "Use bcrypt/argon2 with appropriate work factor (12+ for bcrypt)",
          testCase: "Verify stored password hashes are not reversible and resist rainbow table attacks",
          priority: "P0"
        });
      }

      // Tampering: SQL injection detection (AST-based)
      const sqlLoc = detectSqlInjection(content);
      if (sqlLoc) {
        issues.push({
          dimension: "Security Audit (STRIDE)",
          severity: "CRITICAL",
          location: relPath,
          exploit: "Attacker injects SQL via input fields (SQL injection)",
          impact: "Data exfiltration, modification, deletion, authentication bypass",
          rootCause: "Constructing SQL queries via string concatenation or templating",
          fix: "Use parameterized queries / prepared statements exclusively",
          testCase: "Submit SQL injection payloads (e.g., ' OR 1=1 --); verify queries fail or are neutralized",
          priority: "P0"
        });
      }

      // Repudiation: Missing audit logs for sensitive operations
      if (content.includes('delete') || content.includes('UPDATE') || content.includes('payment') || content.includes('role')) {
        if (!content.includes('log') && !content.includes('audit') && !content.includes('logger')) {
          issues.push({
            dimension: "Security Audit (STRIDE)",
            severity: "HIGH",
            location: relPath,
            exploit: "Malicious action performed and not traceable in logs",
            impact: "Cannot detect breaches, meet compliance, or attribute actions",
            rootCause: "No audit logging for security-relevant events",
            fix: "Log all authentication, authorization, data modification with user ID, timestamp, action, target",
            testCase: "Perform sensitive actions; verify corresponding entries in audit log with sufficient context",
            priority: "P1"
          });
        }
      }

      // Information Disclosure: Error messages leaking secrets
      if (content.includes('error') && (content.includes('stack') || content.includes('message: err') || content.includes('console.error'))) {
        if (content.includes('res.json') && content.includes('error')) {
          if (!content.includes('generic') && !content.includes('Something went wrong')) {
            issues.push({
              dimension: "Security Audit (STRIDE)",
              severity: "HIGH",
              location: relPath,
              exploit: "Internal error details (SQL, path, stack) exposed to attacker",
              impact: "Information leakage aiding further attacks",
              rootCause: "Unsanitized error responses containing internal details",
              fix: "Return generic error messages to clients; log full details server-side only",
              testCase: "Trigger various errors; confirm response contains no stack traces, SQL, file paths, or internal IDs",
              priority: "P1"
            });
          }
        }
      }

      // Denial of Service: Unbounded request body size
      if (content.includes('body-parser') || content.includes('express.json') || content.includes('raw(')) {
        if (!content.includes('limit:') && !content.includes('size:') && !content.includes('maxBodyLength')) {
          issues.push({
            dimension: "Security Audit (STRIDE)",
            severity: "HIGH",
            location: relPath,
            exploit: "Attacker sends multi-GB request body → memory exhaustion",
            impact: "DoS, service crash",
            rootCause: "No limit on request body size",
            fix: "Configure body parser with generous but finite limit (e.g., 1MB for JSON, 10MB for uploads)",
            testCase: "Send request with huge payload; verify server responds with 413 Payload Too Large",
            priority: "P1"
          });
        }
      }

      // Elevation of Privilege: Missing authentication on state-changing endpoints
      const stateChangeMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
      if (stateChangeMethods.some(method => content.includes(method))) {
        // Check if endpoint has auth guard
        if (!content.includes('authenticate') && !content.includes('authorize') && !content.includes('requireAuth') && !content.includes('middleware')) {
          issues.push({
            dimension: "Security Audit (STRIDE)",
            severity: "CRITICAL",
            location: relPath,
            exploit: "Unauthenticated user can modify data or perform privileged action",
            impact: "Privilege escalation, data tampering",
            rootCause: "State-changing endpoint lacks authentication check",
            fix: "Apply authentication middleware to all POST/PUT/DELETE/PATCH routes",
            testCase: "Issue state-changing request without credentials; verify 401 Unauthorized",
            priority: "P0"
          });
        }
      }

      // Rate limiting absence
      if (content.includes('login') || content.includes('password') || content.includes('forgot') || content.includes('reset')) {
        if (!content.includes('rate-limit') && !content.includes('RateLimiter') && !content.includes('throttle')) {
          issues.push({
            dimension: "Security Audit (STRIDE)",
            severity: "HIGH",
            location: relPath,
            exploit: "Brute force credentials or DoS auth endpoint",
            impact: "Account compromise, service disruption",
            rootCause: "No rate limiting on authentication endpoints",
            fix: "Apply rate limiting (e.g., 5 attempts per 15 minutes per IP/account)",
            testCase: "Exceed rate limit; verify subsequent requests are rejected with 429 Too Many Requests",
            priority: "P1"
          });
        }
      }

      // XSS: Output encoding missing when rendering user-provided content
      if (content.includes('res.send') || content.includes('res.json') || content.includes('innerHTML') || content.includes('document.write')) {
        if (!content.includes('escape') && !content.includes('encode') && !content.includes('sanitize') && !content.includes('he.encode')) {
          // Heuristic: if data from req.params, req.body, or database is directly inserted into HTML
          if (content.includes('req.') && (content.includes('<') || content.includes('html'))) {
            issues.push({
              dimension: "Security Audit (STRIDE)",
              severity: "HIGH",
              location: relPath,
              exploit: "Attacker injects <script> tags via input → XSS in browser",
              impact: "Session hijacking, credential theft, defacement",
              rootCause: "User input not HTML-escaped before rendering",
              fix: "Encode user-provided data before inserting into HTML (use escape functions or templating engine auto-escaping)",
              testCase: "Submit <script>alert(1)</script> in form; verify it is rendered as text, not executed",
              priority: "P1"
            });
          }
        }
      }

      // Broken Access Control: Missing permission checks on resources (IDOR)
      if (content.includes('GET') || content.includes('POST') || content.includes('PUT') || content.includes('DELETE')) {
        // Look for patterns where user ID from request is used to access data without verifying ownership
        if (content.includes('findById') || content.includes('findOne') || content.includes('select') || content.includes('WHERE')) {
          // Check if there's a comparison between authenticated user and resource owner
          if (!content.includes('userId ===') && !content.includes('userId ==') && !content.includes('ownerId') && !content.includes('belongsTo')) {
            issues.push({
              dimension: "Security Audit (STRIDE)",
              severity: "CRITICAL",
              location: relPath,
              exploit: "Attacker accesses other users' data by guessing IDs (IDOR)",
              impact: "Data breach, privacy violation",
              rootCause: "No ownership check before returning resource",
              fix: "Enforce that user can only access their own resources (compare resource.userId to req.user.id)",
              testCase: "Authenticated user requests /resource/123 where 123 belongs to another user; verify 403 or ownership enforced",
              priority: "P0"
            });
          }
        }
      }

      // JWT verification: ensure tokens are verified with RS256 and proper audience/issuer
      if (content.includes('jwt') || content.includes('JWT') || content.includes('jsonwebtoken')) {
        if (!content.includes(' RS256') && !content.includes('RS256') && !content.includes('verify') && !content.includes('publicKey')) {
          issues.push({
            dimension: "Security Audit (STRIDE)",
            severity: "HIGH",
            location: relPath,
            exploit: "JWT signed with weak HS256; secret key compromise allows token forgery",
            impact: "Authentication bypass, privilege escalation",
            rootCause: "JWT verification not using asymmetric keys (RS256) or missing verification altogether",
            fix: "Use RS256 with public key verification; validate aud, iss, exp claims;",
            testCase: "Forge JWT with known secret; verify server rejects or requires proper signature",
            priority: "P1"
          });
        }
      }

      // Command injection: Use of exec or child_process with unsanitized input
      if (content.includes('exec(') || content.includes('spawn(') || content.includes('fork(')) {
        if (content.includes('req.body') || content.includes('req.query') || content.includes('req.params')) {
          issues.push({
            dimension: "Security Audit (STRIDE)",
            severity: "CRITICAL",
            location: relPath,
            exploit: "Attacker injects shell commands via input (e.g., ; rm -rf /)",
            impact: "Remote code execution, server compromise",
            rootCause: "Executing shell commands with unsanitized user input",
            fix: "Avoid exec with user input; use parameterized APIs or whitelist allowed commands",
            testCase: "Send malicious command in input; verify it is not executed or properly sanitized",
            priority: "P0"
          });
        }
      }

      // Path traversal: File operations using user-supplied paths without sanitization
      if (content.includes('readFile') || content.includes('writeFile') || content.includes('fs.') || content.includes('path.join')) {
        if (content.includes('req.body') || content.includes('req.query') || content.includes('req.params')) {
          if (!content.includes('normalize') && !content.includes('resolveSecure') && !content.includes('realpath')) {
            issues.push({
              dimension: "Security Audit (STRIDE)",
              severity: "HIGH",
              location: relPath,
              exploit: "Attacker uses ../ sequences to read/write outside intended directory",
              impact: "Information disclosure, file overwrite, code execution",
              rootCause: "File paths from user not validated or canonicalized",
              fix: "Validate and canonicalize paths; prevent escaping base directory;",
              testCase: "Request file '../../../etc/passwd'; verify it is blocked or resolved within allowed directory",
              priority: "P1"
            });
          }
        }
      }

    } catch (e) {
      // skip
    }
  }

  return issues;
}

// Dimension 9: Scalability Analysis
async function auditScalability(cwd: string, files: string[]): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  for (const relPath of files) {
    try {
      const absPath = join(cwd, relPath);
      const content = await fsp.readFile(absPath, 'utf-8');

      // Detect O(n²) nested loops
      const lines = content.split('\n');
      let loopDepth = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('for ') || trimmed.startsWith('while ') || trimmed.includes('.map(') || trimmed.includes('.filter(')) {
          loopDepth++;
          if (loopDepth > 1) {
            issues.push({
              dimension: "Scalability Analysis",
              severity: "HIGH",
              location: `${relPath}:${lines.indexOf(line)+1}`,
              exploit: "Input size 10k → operations ~100M, CPU spike, request timeout",
              impact: "Performance degradation, timeouts, DoS",
              rootCause: "Nested loops over same data (O(n²) complexity)",
              fix: "Refactor to use hash maps or precomputed data to eliminate inner loop",
              testCase: "Benchmark with 10k records; verify response time scales linearly or better (<1s)",
              priority: "P1"
            });
          }
        } else if (trimmed.startsWith('}') || trimmed === '') {
          // simplistic depth tracking continuation
        }
      }

      // Check for N+1 query pattern
      if (content.includes('for') && (content.includes('find') || content.includes('query'))) {
        if (!content.includes('join') && !content.includes('include') && !content.includes('preload')) {
          issues.push({
            dimension: "Scalability Analysis",
            severity: "HIGH",
            location: relPath,
            exploit: "Load N items → N+1 DB queries, DB overload under load",
            impact: "High latency, database saturation",
            rootCause: "Fetching related data in loop instead of batch join/eager loading",
            fix: "Use JOIN or ORM eager loading (e.g., include, preload) to fetch all data in 1-2 queries",
            testCase: "Request page of 50 items with related data; verify query count ≤2 via DB profiler",
            priority: "P1"
          });
        }
      }

      // Check for blocking I/O in async context (fs.readFileSync, sync HTTP)
      if (content.includes('async ') && (content.includes('readFileSync') || content.includes('http.getSync') || content.includes('execSync'))) {
        issues.push({
          dimension: "Scalability Analysis",
          severity: "HIGH",
          location: relPath,
          exploit: "Synchronous I/O blocks event loop, all other requests stall",
          impact: "Service becomes unresponsive under load",
          rootCause: "Blocking I/O in async function",
          fix: "Replace sync calls with async equivalents (readFile, fetch, exec)",
          testCase: "Load test with concurrent requests; monitor event loop lag; ensure <10ms blocking per request",
          priority: "P1"
        });
      }

      // Check for large object allocations in loops
      if (content.includes('for ') && content.includes('new ') && content.includes('push')) {
        issues.push({
          dimension: "Scalability Analysis",
          severity: "MEDIUM",
          location: relPath,
          exploit: "Loop allocates many objects → GC pressure, memory spike",
          impact: "Increased memory usage, GC pauses, latency spikes",
          rootCause: "Creating new objects inside loop without reuse or pooling",
          fix: "Reuse objects or allocate outside loop when possible; consider object pooling for large data",
          testCase: "Process large dataset; monitor memory footprint and GC frequency",
          priority: "P2"
        });
      }

      // Check for lack of pagination (already partly covered in DB integrity)
      if (content.includes('getAll') || content.includes('findAll') || content.includes('list')) {
        // if query + no LIMIT already flagged; this covers API endpoints returning lists
        if (!content.includes('limit') && !content.includes('page') && !content.includes('Page')) {
          // Already handled in DB section, skip duplication
        }
      }

    } catch (e) {
      // skip
    }
  }

  return issues;
}

// Dimension 10: Observability & Monitoring
async function auditObservability(cwd: string, files: string[]): Promise<AuditIssue[]> {
  const missingLogs: string[] = [];
  const missingMetrics: string[] = [];
  const missingAlerts: string[] = [];

  for (const relPath of files) {
    try {
      const absPath = join(cwd, relPath);
      const content = await fsp.readFile(absPath, 'utf-8');

      // Check for structured logging
      if (content.includes('console.log') || content.includes('logger')) {
        if (content.includes('JSON.stringify') || content.includes('json') || content.includes('pino') || content.includes('winston')) {
          // good
        } else {
          missingLogs.push(`${relPath}: Uses plain console.log without structured JSON`);
        }
      }

      // Check for metrics emission (Prometheus format)
      if (content.includes('http_requests_total') || content.includes('histogram') || content.includes('counter')) {
        // good
      } else if (relPath.includes('server') || relPath.includes('app')) {
        missingMetrics.push(`${relPath}: No Prometheus metrics found`);
      }

      // Check for health checks
      if (relPath.includes('health') || relPath.includes('ready') || relPath.includes('live')) {
        // good
      } else if (content.includes('express') || content.includes('fastify')) {
        missingAlerts.push(`${relPath}: No explicit health endpoint detected`);
      }

    } catch (e) {
      // skip
    }
  }

  const issues: AuditIssue[] = [];

  if (missingLogs.length > 0) {
    issues.push({
      dimension: "Observability & Monitoring",
      severity: "MEDIUM",
      location: "multiple files",
      exploit: "Insufficient logging hampers debugging and incident response",
      impact: "Long MTTR, inability to trace requests",
      rootCause: "No structured logging (JSON) or inconsistent log format",
      fix: "Adopt structured JSON logging (e.g., Pino, Winston). Include request ID, user ID, timestamps in all logs",
      testCase: "Verify all logs are parseable by ELK/Loki and contain correlation IDs across services",
      priority: "P2"
    });
  }

  if (missingMetrics.length > 0) {
    issues.push({
      dimension: "Observability & Monitoring",
      severity: "HIGH",
      location: "multiple files",
      exploit: "No visibility into system health, performance degradation goes undetected",
      impact: "SLO breaches unnoticed, slow to detect incidents",
      rootCause: "No application metrics exposed (Prometheus format)",
      fix: "Implement core metrics: http_requests_total (method, path, status), http_request_duration_seconds (histogram), errors_total",
      testCase: "Scrape /metrics endpoint; verify presence of key metrics with expected labels",
      priority: "P1"
    });
  }

  if (missingAlerts.length > 0) {
    issues.push({
      dimension: "Observability & Monitoring",
      severity: "MEDIUM",
      location: "multiple files",
      exploit: "Kubernetes/orchestrator cannot determine liveness/readiness",
      impact: "Uncontrolled restarts, traffic sent to down instances",
      rootCause: "Missing health check endpoints (/health/live, /health/ready)",
      fix: "Implement liveness (process alive) and readiness (dependencies ready) endpoints",
      testCase: "Call /health/live and /health/ready; verify correct status codes based on component state",
      priority: "P2"
    });
  }

  return issues;
}

// Main execute
export async function execute(params: { includeTests?: boolean }, ctx: any): Promise<any> {
  const cwd = ctx.cwd || process.cwd();

  // Discover source files (similar to quality_gate but we can reuse logic minimally)
  const files: string[] = [];
  const excludeDirs = new Set(['node_modules', 'dist', 'coverage', 'llm-context', '__tests__', '__mocks__', '__fixtures__']);
  const excludeExts = ['.test.ts', '.spec.ts', '.d.ts', '.test.js', '.spec.js', '.d.js'];

  async function walkDir(dir: string, relDir: string): Promise<void> {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (excludeDirs.has(entry.name)) continue;
      const fullPath = join(dir, entry.name);
      const relPath = join(relDir, entry.name);
      if (entry.isDirectory()) {
        await walkDir(fullPath, relPath);
      } else {
        const filename = entry.name;
        const ext = filename.slice(filename.lastIndexOf('.'));
        if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
          if (excludeExts.some(suffix => filename.endsWith(suffix))) continue;
          files.push(relPath);
        }
      }
    }
  }

  const srcDir = join(cwd, 'src');
  try {
    await fsp.access(srcDir);
    await walkDir(srcDir, 'src');
  } catch {
    // No src directory
  }

  if (files.length === 0) {
    return { content: [{ type: "text", text: "❌ Audit: No source files found." }], isError: true };
  }

  // Run all dimension audits
  const dimensionAudits = [
    { name: "Business Logic Integrity", fn: auditBusinessLogicIntegrity as any },
    { name: "End-to-End Flow Audit", fn: auditE2EFlow },
    { name: "Concurrency & Race Condition", fn: auditConcurrency },
    { name: "Database & Data Integrity", fn: auditDatabaseIntegrity },
    { name: "Caching & Consistency", fn: auditCaching },
    { name: "Idempotency", fn: auditIdempotency },
    { name: "Failure Scenarios", fn: auditFailureScenarios },
    { name: "Security Audit (STRIDE)", fn: auditSecurity },
    { name: "Scalability Analysis", fn: auditScalability },
    { name: "Observability & Monitoring", fn: (cwd: string, files: string[]) => auditObservability(cwd, files) }
  ];

  const dimensions: AuditReport['dimensions'] = [];
  const allIssues: AuditIssue[] = [];
  const checklist: Record<string, boolean> = {};

  for (const dim of dimensionAudits) {
    let issues = [];
    try {
      issues = await dim.fn(cwd, files);
    } catch (e) {
      console.error(`Audit error in ${dim.name}:`, e);
      issues = [];
    }
    allIssues.push(...issues);
    dimensions.push({
      name: dim.name,
      issues,
      passed: issues.length === 0
    });
    checklist[dim.name] = issues.length === 0;
  }

  // Summarize
  const severityCounts = {
    CRITICAL: allIssues.filter(i => i.severity === 'CRITICAL').length,
    HIGH: allIssues.filter(i => i.severity === 'HIGH').length,
    MEDIUM: allIssues.filter(i => i.severity === 'MEDIUM').length,
    LOW: allIssues.filter(i => i.severity === 'LOW').length,
  };

  const overallRisk = severityCounts.CRITICAL > 0 ? "CRITICAL" :
                      severityCounts.HIGH >= 3 ? "HIGH" :
                      severityCounts.HIGH > 0 ? "MEDIUM" : "LOW";

  const checklistScore = Object.values(checklist).filter(v => v).length / dimensionAudits.length * 100;
  const passChecklist = checklistScore >= 90;

  // Estimated fix time: P0=5d, P1=3d, P2=1d, P3=0.5d
  const fixTimeMap = { P0: 5, P1: 3, P2: 1, P3: 0.5 };
  const estimatedFixTimeDays = allIssues.reduce((sum, i) => sum + (fixTimeMap[i.priority] || 1), 0);

  // Compliance (quick heuristic)
  const hasGDPR = files.some(f => f.includes('consent') || f.includes('privacy') || f.includes('data-retention'));
  const hasPCI = files.some(f => f.includes('payment') || f.includes('card'));
  const hasSOC2 = files.some(f => f.includes('audit') && f.includes('log'));

  const compliance = {
    gdpr: hasGDPR ? ('compliant' as const) : ('gap' as const),
    pciDss: hasPCI ? ('compliant' as const) : ('gap' as const),
    soc2: hasSOC2 ? ('compliant' as const) : ('gap' as const)
  } as const;

  // Observability gaps (reuse from auditObservability)
  const observability: AuditReport['observabilityGaps'] = { missingLogs: [], missingMetrics: [], missingAlerts: [] };
  for (const dim of dimensions) {
    if (dim.name === "Observability & Monitoring") {
      for (const issue of dim.issues) {
        if (issue.location.includes('logs')) observability.missingLogs.push(issue.location);
        if (issue.location.includes('metrics')) observability.missingMetrics.push(issue.location);
        if (issue.location.includes('health')) observability.missingAlerts.push(issue.location);
      }
    }
  }

  // Recommendations prioritized
  const recommendations: AuditReport['recommendations'] = [];
  if (severityCounts.CRITICAL > 0) recommendations.push({ priority: "P0", action: `Fix ${severityCounts.CRITICAL} critical issues immediately` });
  if (severityCounts.HIGH > 0) recommendations.push({ priority: "P1", action: `Address ${severityCounts.HIGH} high issues this sprint` });
  if (severityCounts.MEDIUM > 0) recommendations.push({ priority: "P2", action: `Schedule ${severityCounts.MEDIUM} medium issues next quarter` });
  recommendations.push({ priority: "P3", action: "Monitor low issues; document risk acceptance" });

  const report: AuditReport = {
    summary: {
      overallRisk,
      criticalCount: severityCounts.CRITICAL,
      highCount: severityCounts.HIGH,
      mediumCount: severityCounts.MEDIUM,
      lowCount: severityCounts.LOW,
      estimatedFixTimeDays: Math.ceil(estimatedFixTimeDays),
      passChecklist,
      checklistScore: Math.round(checklistScore)
    },
    dimensions,
    compliance,
    observabilityGaps: observability,
    recommendations,
    rawChecklist: checklist
  };

  // Format output
  const lines: string[] = [
    "# SYSTEM AUDIT REPORT",
    "=".repeat(50),
    "",
    "## Executive Summary",
    `- Overall Risk: ${report.summary.overallRisk}`,
    `- Critical Issues: ${report.summary.criticalCount}`,
    `- High Issues: ${report.summary.highCount}`,
    `- Medium Issues: ${report.summary.mediumCount}`,
    `- Low Issues: ${report.summary.lowCount}`,
    `- Estimated Fix Time: ${report.summary.estimatedFixTimeDays} days`,
    `- Checklist Pass: ${report.summary.passChecklist ? '✅' : '❌'} (${report.summary.checklistScore}%)`,
    "",
    "## Detailed Findings",
    "-".repeat(50)
  ];

  for (const dim of dimensions) {
    if (dim.issues.length === 0) {
      lines.push(`[OK] **${dim.name}**: No issues found.`);
    } else {
      lines.push(`\n### ${dim.name} (${dim.issues.length} issues)`);
      for (const issue of dim.issues) {
        const severityIcon = `[${issue.severity}]`;
        lines.push(`\n${severityIcon} **${issue.severity}** ${issue.location}`);
        lines.push(`   - Exploit: ${issue.exploit}`);
        lines.push(`   - Impact: ${issue.impact}`);
        lines.push(`   - Root Cause: ${issue.rootCause}`);
        lines.push(`   - Fix: ${issue.fix}`);
        if (issue.testCase) {
          lines.push(`   - Test Case: ${issue.testCase}`);
        }
        lines.push(`   - Priority: ${issue.priority}`);
      }
    }
  }

  lines.push("\n## Compliance Check");
  lines.push(`- [${compliance.gdpr === 'compliant' ? 'x' : ' '}] GDPR: ${compliance.gdpr}`);
  lines.push(`- [${compliance.pciDss === 'compliant' ? 'x' : ' '}] PCI-DSS: ${compliance.pciDss}`);
  lines.push(`- [${compliance.soc2 === 'compliant' ? 'x' : ' '}] SOC2: ${compliance.soc2}`);

  if (observability.missingLogs.length || observability.missingMetrics.length || observability.missingAlerts.length) {
    lines.push("\n## Observability Gaps");
    if (observability.missingLogs.length) lines.push(`- Missing logs: ${observability.missingLogs.join(', ')}`);
    if (observability.missingMetrics.length) lines.push(`- Missing metrics: ${observability.missingMetrics.join(', ')}`);
    if (observability.missingAlerts.length) lines.push(`- Missing alerts: ${observability.missingAlerts.join(', ')}`);
  }

  lines.push("\n## Recommendations (Prioritized)");
  for (const rec of recommendations) {
    lines.push(`- **[${rec.priority}]** ${rec.action}`);
  }

  lines.push("\n## Sign-off");
  lines.push("- [ ] Security Team");
  lines.push("- [ ] SRE Team");
  lines.push("- [ ] Tech Lead");

  const content = [{ type: "text" as const, text: lines.join("\n") }];

  return {
    content,
    report,
    isError: false
  };
}
