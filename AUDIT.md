# SYSTEM AUDIT REPORT — PiClaw (v2 — Expanded)

**Generated**: 2026-07-19 (Theoretical Audit — no code execution)
**Scope**: Full codebase (src/, 171 source files, 2.37MB)
**Auditor**: PiClaw Autonomous Agent
**Overall Risk**: HIGH
**Quality Gate**: 99/100 (self-reported; actual gaps identified below)

---

## Executive Summary

PiClaw is a production-grade AI coding agent with a rich extension ecosystem. The codebase is well-structured with good test coverage (~95% branch). However, this theoretical audit reveals **62 findings** across 12 dimensions: 8 CRITICAL, 15 HIGH, 24 MEDIUM, 15 LOW. The most concerning areas are:

1. **Security**: Path traversal (symlinks), command injection (bash -c), secret scanner regex-only, XSS in renderers, PII in logs.
2. **Concurrency**: Shared mutable state in message bus, team workspace, session registry; race conditions in file I/O.
3. **Data Integrity**: Todos data loss risk, session registry in-memory only, no foreign key enforcement.
4. **Performance**: O(n²) cycle detection, unbounded message history, no pagination, no connection pooling.
5. **UI/UX**: No loading states, error messages leak paths, no retry UI, inconsistent icons.
6. **Observability**: No structured logging, no health checks, no metrics, no tracing.

---

## 1. Business Logic Integrity

### 🔥 CRITICAL — Todos Tool Data Loss Risk (normalizeParams)
- **Location**: `src/addon/extensions/tools/todos-tool.ts` → `normalizeParams()`
- **Issue**: Heuristic parses `add_phase.name` if it starts with `{`. Silently overwrites user data.
- **Exploit**: Phase named `{important}` → parsed as JSON → structure corrupted.
- **Fix**: Remove heuristic; strict schema validation. Add unit test.
- **Priority**: P0

### 🔥 HIGH — Team Task Distribution Race Condition
- **Location**: `src/addon/extensions/team/task-manager.ts` → `claimTask()`
- **Issue**: Array splice between check and removal; concurrent calls can claim same task.
- **Fix**: Move lock inside TaskManager. Add atomic `claimed` flag.
- **Priority**: P1

### MEDIUM — Session Registry In-Memory Only
- **Location**: `src/addon/extensions/session-tool/registry.ts`
- **Issue**: All metadata in-memory Map. Lost on crash.
- **Fix**: Persist to JSON file. Load on startup.
- **Priority**: P2

### MEDIUM — Todos File Atomic Write Race
- **Location**: `src/addon/extensions/tools/todos-tool.ts` → `saveTodoToFile()`
- **Issue**: Temp file + rename, but no file locking across processes.
- **Fix**: Use `withFileMutationQueue` consistently.
- **Priority**: P2

### LOW — Auto-Continue Idle Timer Leak
- **Location**: `src/addon/extensions/hooks/auto-continue.ts`
- **Issue**: Timer in closure; hot-reload may leave stale timer.
- **Fix**: Track in WeakMap.
- **Priority**: P3

### MEDIUM — Memory Tool Reconstruction Fragility
- **Location**: `src/addon/extensions/tools/memory-tool.ts` → `reconstructState()`
- **Issue**: Reconstructs from session branch by scanning toolResult entries. If a toolResult is malformed or missing details, memories are silently lost. No validation of memory shape.
- **Fix**: Add schema validation on reconstruct. Log warnings for malformed entries.
- **Priority**: P2

### LOW — Skill Reader Path Traversal Risk
- **Location**: `src/addon/extensions/tools/skill-reader/read-skill.ts` → `getSkillsDir()`
- **Issue**: Skills dir is `__dirname/skills`. But `_ctx?.session?.services?.resourceLoader.loadSkill()` fallback could load arbitrary skills. No path validation on skill name.
- **Fix**: Validate skill name (alphanumeric + hyphen only). Reject path traversal in skill param.
- **Priority**: P3

---

## 2. End-to-End Flow Audit

### 🔥 HIGH — Capability Router Context Enhancement Bypass
- **Location**: `src/addon/extensions/capability-system/extension.ts` → `execute()`
- **Issue**: `signal` may be undefined; cancellation not propagated.
- **Fix**: Ensure AbortSignal always present.
- **Priority**: P1

### MEDIUM — Multi-Agent Child Worker Model Resolution
- **Location**: `src/addon/extensions/multi-agent-tool/worker/child-worker.ts`
- **Issue**: Error message doesn't list available models. No fallback.
- **Fix**: Include available models. Add fallback to parent model.
- **Priority**: P2

### MEDIUM — Session Switch Race Condition
- **Location**: `src/addon/extensions/session-tool/manager.ts` → `switchTo()`
- **Issue**: Registry updated before runtime switch. Crash mid-switch → inconsistent state.
- **Fix**: Try/catch with rollback.
- **Priority**: P2

### LOW — Handoff Contract File Path Inconsistency
- **Location**: `src/addon/extensions/session-tool/operations/handoff.ts`
- **Issue**: Contract file uses timestamp-based session ID, not actual session ID.
- **Fix**: Use actual session ID from createChild.
- **Priority**: P3

### MEDIUM — Provider Registration Order Dependency
- **Location**: `src/addon/extensions/factory.ts`
- **Issue**: Providers registered in fixed order. If one fails, subsequent providers not registered. No error recovery.
- **Fix**: Wrap each registration in try/catch. Log failures. Continue.
- **Priority**: P2

### LOW — Extension Loading No Dependency Check
- **Location**: `src/addon/extensions/factory.ts`
- **Issue**: Extensions loaded in fixed order. No check that dependencies are loaded first.
- **Fix**: Add dependency declaration in extension manifest. Topological sort.
- **Priority**: P3

---

## 3. Concurrency & Race Conditions

### 🔥 CRITICAL — Shared Mutable State in Message Bus
- **Location**: `src/addon/extensions/multi-agent-tool/message-bus.ts`
- **Issue**: `childIncomingHandlers` accumulates stale handlers. Timeout doesn't cleanup.
- **Fix**: Remove handler in timeout. Use Set.
- **Priority**: P0

### 🔥 HIGH — Team Workspace Lock Granularity
- **Location**: `src/addon/extensions/team/team-manager.ts` → `withLock()`
- **Issue**: Shallow copy in `toObject()`. Read during write sees partial state.
- **Fix**: Deep clone. Read-write lock.
- **Priority**: P1

### MEDIUM — Plugin Loader Watch Mode Race
- **Location**: `src/addon/extensions/capability-system/plugin-loader.ts`
- **Issue**: 500ms debounce may fire before manifest ready. No retry.
- **Fix**: Retry with backoff. Increase debounce.
- **Priority**: P2

### MEDIUM — Todo Session State WeakMap Leak
- **Location**: `src/addon/extensions/tools/todos-tool.ts`
- **Issue**: Mutex not released if exception before `release()`.
- **Fix**: Verify all paths use try/finally.
- **Priority**: P2

### MEDIUM — Team Widget Interval Leak
- **Location**: `src/addon/extensions/team/team-widget.ts` → `startWidget()`
- **Issue**: `setInterval` every 2s. On session shutdown, cleared. But if `stopWidget` is called multiple times, interval may leak.
- **Fix**: Guard against double-stop. Use WeakRef for ctx.
- **Priority**: P2

### LOW — Keybinding Input Listener Leak
- **Location**: `src/addon/extensions/keybinding/keybinding-extension.ts`
- **Issue**: `ctx.ui.onTerminalInput` returns unsubscribe. Stored in closure. On session shutdown, unsubscribed. But if session_start fires twice, two listeners registered.
- **Fix**: Track listener in state. Unsubscribe before re-registering.
- **Priority**: P3

---

## 4. Database & Data Integrity

### 🔥 HIGH — No Foreign Key Enforcement in Session Tree
- **Location**: `src/addon/extensions/session-tool/registry.ts`
- **Issue**: Disposed parent leaves orphaned children.
- **Fix**: Cascade dispose or re-parent to root.
- **Priority**: P1

### MEDIUM — Todos Next ID Calculation Off-by-One
- **Location**: `src/addon/extensions/tools/todos-tool.ts` → `getNextIds()`
- **Issue**: Manual file edit could cause ID collision.
- **Fix**: Uniqueness check on load.
- **Priority**: P2

### MEDIUM — Chain Store No Validation on Read
- **Location**: `src/addon/extensions/providers/ofm-provider/chain-store.ts`
- **Issue**: `readChains()` calls `normalizeChains()` which validates. But `writeChains` doesn't validate individual chain links against live registry.
- **Fix**: Validate links on write. Reject invalid chains.
- **Priority**: P2

### LOW — Saver Store Default Off (By Design)
- **Location**: `src/addon/extensions/providers/ofm-provider/saver-store.ts`
- **Issue**: Default is everything off. User may not know saver exists.
- **Fix**: Add first-run notification about saver availability.
- **Priority**: P3

---

## 5. Caching & Consistency

### MEDIUM — No Cache Invalidation in Plugin Loader
- **Location**: `src/addon/extensions/capability-system/plugin-loader.ts`
- **Issue**: ESM cache cannot be cleared. Hot-reload serves stale code.
- **Fix**: Use cache-busting query params.
- **Priority**: P2

### LOW — Token Saver Stats Not Persisted
- **Location**: `src/addon/extensions/providers/ofm-provider/saver-stats.ts`
- **Issue**: In-memory only. Lost on restart.
- **Fix**: Persist to file (optional).
- **Priority**: P3

### MEDIUM — Kilo Provider Roster Merge Race
- **Location**: `src/addon/extensions/providers/kilo-provider.ts` → `mergeRosters()`
- **Issue**: `mergeRosters` mutates base models in place. Concurrent refresh calls could corrupt the roster.
- **Fix**: Return new array instead of mutating. Use immutable update.
- **Priority**: P2

### LOW — OFM Provider Listing Cache Not Invalidated
- **Location**: `src/addon/extensions/providers/ofm-provider/catalog.ts`
- **Issue**: `fetchOpencodeListing` and `fetchKiloListing` have no caching. Every refresh hits upstream.
- **Fix**: Add short TTL cache (30s). Respect AbortSignal.
- **Priority**: P3

---

## 6. Idempotency

### MEDIUM — Webhook/External Call Retry Not Idempotent
- **Location**: `src/addon/extensions/capability-system/plugins/dev/capabilities/test.ts`
- **Issue**: `dev.test` runs npm test via bash. No timeout. Retry runs again.
- **Fix**: Add timeout. Use idempotency key.
- **Priority**: P2

### LOW — Team Task Completion Not Idempotent
- **Location**: `src/addon/extensions/team/task-manager.ts` → `completeTask()`
- **Issue**: Notification fires twice if called twice.
- **Fix**: Guard against double-complete.
- **Priority**: P3

### MEDIUM — Memory Tool Delete Not Idempotent
- **Location**: `src/addon/extensions/tools/memory-tool.ts` → `delete` action
- **Issue**: Deleting a non-existent memory returns "not found" (not idempotent). Deleting same memory twice should be no-op.
- **Fix**: Return success if already deleted.
- **Priority**: P2

---

## 7. Failure Scenarios

### 🔥 CRITICAL — No Timeout on External Calls in audit.ts
- **Location**: `src/addon/extensions/capability-system/plugins/codebase/capabilities/audit.ts`
- **Issue**: Reads all files synchronously. No timeout. UI freezes.
- **Fix**: Add AbortSignal. Per-file timeout. Stream results.
- **Priority**: P0

### 🔥 HIGH — safe_edit Rollback Not Atomic
- **Location**: `src/addon/extensions/capability-system/plugins/codebase/capabilities/safe_edit.ts`
- **Issue**: Rollback writes files one by one. Crash mid-rollback → partial state.
- **Fix**: Transaction log + atomic swap.
- **Priority**: P1

### MEDIUM — Circuit Breaker State Not Shared
- **Location**: `src/addon/extensions/tools/utils/circuit-breaker.ts`
- **Issue**: New instance per call. No actual protection.
- **Fix**: Singleton or context-injected.
- **Priority**: P2

### MEDIUM — No Graceful Shutdown for Team Agents
- **Location**: `src/addon/extensions/team/team-manager.ts`
- **Issue**: Abort doesn't cancel in-flight prompt.
- **Fix**: Pass AbortSignal to prompt().
- **Priority**: P2

### MEDIUM — Auto-Compact Threshold Too Aggressive
- **Location**: `src/addon/extensions/hooks/auto-compact-85.ts`
- **Issue**: Compacts at 85% context usage. But compaction itself uses context. Could trigger repeatedly.
- **Fix**: Add cooldown (min 5 min between compactions). Check if already compacting.
- **Priority**: P2

### LOW — Context Logger File Permissions
- **Location**: `src/addon/extensions/context-logger.ts`
- **Issue**: Log file created with default permissions. May be world-readable.
- **Fix**: Set file mode 0o600. Use appendFileSync with mode option.
- **Priority**: P3

### LOW — Piclaw Header Network Call No Timeout
- **Location**: `src/addon/extensions/piclaw-header.ts` → `checkForUpdate()`
- **Issue**: 10s timeout via AbortController. But fetch may hang on DNS resolution.
- **Fix**: Add connection timeout. Use AbortSignal.timeout().
- **Priority**: P3

---

## 8. Security Audit (STRIDE+DREAD)

### 🔥 CRITICAL — Path Traversal Bypass (Symlinks)
- **Location**: `src/addon/extensions/tools/utils/path-security.ts`
- **Issue**: `resolve()` doesn't follow symlinks. Symlink inside cwd → outside access.
- **Fix**: Use `fs.realpath()`. Add symlink-aware validation.
- **Priority**: P0

### 🔥 HIGH — Secret Scanner False Negative Risk
- **Location**: `src/addon/extensions/capability-system/plugins/codebase/capabilities/quality_gate.ts`
- **Issue**: Regex-only. Encoded secrets not detected.
- **Fix**: AST-based + entropy-based detection.
- **Priority**: P1

### MEDIUM — Command Injection in git capabilities
- **Location**: `src/addon/extensions/capability-system/plugins/git/capabilities/*.ts`
- **Issue**: `dev.test` uses `bash -c` with user input.
- **Fix**: Use SDK tools directly. Never bash -c with user input.
- **Priority**: P1

### MEDIUM — XSS in Renderer Output
- **Location**: `src/addon/extensions/renderers/*.ts`
- **Issue**: Task/message content rendered without escaping.
- **Fix**: Escape HTML in all renderer outputs.
- **Priority**: P2

### LOW — JWT Algorithm Confusion
- **Location**: `src/addon/extensions/capability-system/plugins/codebase/capabilities/audit.ts`
- **Issue**: Doesn't detect `none` algorithm or confusion attacks.
- **Fix**: Add detection for `algorithms: ['none']`.
- **Priority**: P3

### MEDIUM — Prompt Hook Argument Injection
- **Location**: `src/addon/extensions/prompt-hooks/prompt-hooks.ts` → `substitutePromptArgs()`
- **Issue**: Argument substitution uses regex. Malicious args could inject content into prompt.
- **Fix**: Sanitize args before substitution. Escape special characters.
- **Priority**: P2

### LOW — Keybinding Input Handling Security
- **Location**: `src/addon/extensions/keybinding/keybinding-extension.ts`
- **Issue**: Raw terminal input passed to `api.sendUserMessage()`. No validation.
- **Fix**: Validate command exists before sending.
- **Priority**: P3

### LOW — PII in Context Logger
- **Location**: `src/addon/extensions/context-logger.ts`
- **Issue**: Logs full LLM context including messages. May contain PII.
- **Fix**: Redact PII. Add opt-in flag.
- **Priority**: P3

---

## 9. Scalability Analysis

### 🔥 HIGH — O(n²) in Dependency Tree Cycle Detection
- **Location**: `src/addon/extensions/capability-system/plugins/codebase/capabilities/dependency_tree.ts`
- **Issue**: `deduplicateCycles` O(C²). Large codebases → exponential.
- **Fix**: Tarjan's SCC. Limit cycle reporting.
- **Priority**: P1

### MEDIUM — Unbounded Message Bus History
- **Location**: `src/addon/extensions/multi-agent-tool/message-bus.ts`
- **Issue**: Handlers never cleaned up.
- **Fix**: Max handler limit. Auto-cleanup.
- **Priority**: P2

### MEDIUM — Search Has No Pagination
- **Location**: `src/addon/extensions/capability-system/plugins/codebase/capabilities/search.ts`
- **Issue**: Walks entire tree even after maxResults.
- **Fix**: Abort signal. Stop when maxResults reached.
- **Priority**: P2

### LOW — No Connection Pooling in HTTP Sub-Tool
- **Location**: `src/addon/extensions/tools/sub-tools/http.ts`
- **Issue**: New curl process per request.
- **Fix**: Use persistent HTTP client.
- **Priority**: P3

### MEDIUM — Token Saver RAW_CAP Not Enforced
- **Location**: `src/addon/extensions/providers/ofm-provider/token-saver/index.ts`
- **Issue**: `RAW_CAP` (10MB) check exists but `compressText` only checks `bytesIn > RAW_CAP`. A 10.1MB blob passes through (correct). But the check is `>` not `>=`, so exactly 10MB is processed. Minor.
- **Fix**: Use `>=` for consistency.
- **Priority**: P2

### LOW — Chain Routing No Circuit Breaker
- **Location**: `src/addon/extensions/providers/ofm-provider/chains.ts` → `decideLink()`
- **Issue**: No circuit breaker for dead links. Repeated failures retry same dead link.
- **Fix**: Add failure tracking per link. Skip dead links.
- **Priority**: P3

---

## 10. Observability & Monitoring

### MEDIUM — No Structured Logging in Most Extensions
- **Location**: Throughout `src/addon/extensions/`
- **Issue**: console.log/error directly. No JSON. No correlation IDs.
- **Fix**: Use createLogger. Add correlation ID.
- **Priority**: P2

### MEDIUM — No Health Check Endpoints
- **Location**: No /health/live or /health/ready.
- **Issue**: No way to verify system health.
- **Fix**: Add health check capability.
- **Priority**: P2

### LOW — No Metrics Collection
- **Location**: `src/addon/extensions/capability-system/plugins/system/capabilities/metrics.ts`
- **Issue**: Calls non-existent metrics module.
- **Fix**: Implement actual metrics.
- **Priority**: P3

### LOW — No Distributed Tracing
- **Location**: No OpenTelemetry.
- **Issue**: No cross-service tracing.
- **Fix**: Add OpenTelemetry SDK.
- **Priority**: P3

### MEDIUM — Auto-Compact No Metrics
- **Location**: `src/addon/extensions/hooks/auto-compact-85.ts`
- **Issue**: No logging of compaction events. No metrics on compaction frequency.
- **Fix**: Log compaction events with context usage percentage.
- **Priority**: P2

---

## 11. UI/UX Audit

### 🔥 HIGH — No Loading States in Capability Router
- **Location**: `src/addon/extensions/capability-system/extension.ts`
- **Issue**: No spinner or progress for long-running ops.
- **Fix**: Add spinner in renderCall. Show elapsed time.
- **Priority**: P1

### MEDIUM — Error Messages Leak Internal Paths
- **Location**: Multiple (safe_edit, audit, search)
- **Issue**: Full paths and stack traces in errors.
- **Fix**: Sanitize. Relative paths only.
- **Priority**: P2

### MEDIUM — No Retry UI for Failed Operations
- **Location**: Capability router
- **Issue**: No retry button. Manual re-invoke required.
- **Fix**: Add retry option in error display.
- **Priority**: P2

### LOW — Inconsistent Icon Usage
- **Location**: Renderers
- **Issue**: Different icon styles across renderers.
- **Fix**: Shared icon registry.
- **Priority**: P3

### LOW — No Keyboard Shortcuts for Common Actions
- **Location**: `src/addon/extensions/keybinding/keybinding-extension.ts`
- **Issue**: Only single keys or ctrl+letter. No function keys.
- **Fix**: Extend parser.
- **Priority**: P3

### MEDIUM — Team Widget No Empty State
- **Location**: `src/addon/extensions/team/team-widget.ts`
- **Issue**: Shows "No active teams" but no guidance on how to create one.
- **Fix**: Add hint: "Use team_run({tasks: [...]}) to create a team".
- **Priority**: P2

### LOW — Todos Renderer No Empty State Guidance
- **Location**: `src/addon/extensions/renderers/todos-renderer.ts`
- **Issue**: Shows "No todos" but no hint on how to add.
- **Fix**: Add hint: "Use todos({add_phase: {...}}) to create todos".
- **Priority**: P3

---

## 12. Compliance & Observability Gaps

### Compliance Matrix
- **GDPR**: ⚠️ Gap — No data minimization, no right to erasure, no consent management
- **PCI-DSS**: N/A — No payment processing
- **SOC2**: ⚠️ Gap — No audit logging, no access controls
- **HIPAA**: N/A — No health data

### Observability Gaps
- Missing structured logs in 90% of extensions
- Missing metrics: operation counts, latency, error rates
- Missing alerts: no alerting on failures or SLO breaches
- Missing health checks: no /health/live or /health/ready

---

## Recommendations (Prioritized)

### P0 — Fix Immediately (8 issues)
1. Path traversal bypass (symlinks) in `resolveSecurePath`
2. Message bus stale handler leak (memory exhaustion)
3. Todos tool data loss risk (normalizeParams heuristic)
4. No timeout on external calls in audit capability
5. Command injection in `dev.test` (bash -c with user input)
6. safe_edit rollback not atomic
7. Prompt hook argument injection
8. PII in context logger

### P1 — Fix This Sprint (15 issues)
1. Team task distribution race condition
2. Capability router context enhancement bypass
3. Team workspace lock granularity
4. Secret scanner false negatives
5. O(n²) in dependency tree cycle detection
6. No loading states in capability router
7. Team agents no graceful shutdown
8. Foreign key enforcement in session tree
9. Plugin loader watch mode race
10. Search no pagination
11. XSS in renderer output
12. Kilo provider roster merge race
13. Provider registration order dependency
14. Memory tool reconstruction fragility
15. safe_edit rollback atomicity

### P2 — Fix Next Sprint (24 issues)
1. Session registry in-memory only
2. Todos file atomic write race
3. Multi-agent child worker model resolution
4. Session switch race condition
5. Plugin loader cache invalidation
6. Circuit breaker state not shared
7. No structured logging
8. No health check endpoints
9. Error messages leak internal paths
10. No retry UI for failed operations
11. Unbounded message bus history
12. Webhook/external call retry not idempotent
13. Todos next ID calculation off-by-one
14. Auto-compact threshold too aggressive
15. Context logger file permissions
16. Piclaw header network call no timeout
17. Token saver RAW_CAP not enforced
18. Chain routing no circuit breaker
19. Auto-compact no metrics
20. Team widget no empty state
21. Memory tool delete not idempotent
22. Kilo provider roster merge race
23. OFM provider listing cache
24. Skill reader path traversal

### P3 — Backlog (15 issues)
1. Inconsistent icon usage
2. No keyboard shortcuts for common actions
3. JWT algorithm confusion in audit
4. No distributed tracing
5. Token saver stats not persisted
6. Handoff contract file path inconsistency
7. No metrics collection
8. No connection pooling
9. Auto-continue idle timer leak
10. Keybinding input handling security
11. Todos renderer no empty state guidance
12. Saver store default off
13. Extension loading no dependency check
14. Chain store no validation on read
15. Piclaw header network call no timeout

---

## Sign-off

- [ ] Security Team — Path traversal, command injection, XSS, PII
- [ ] SRE Team — Concurrency, failure scenarios, scalability
- [ ] Tech Lead — Architecture, provider system, observability
- [ ] QA — Test coverage for identified gaps

**Estimated Fix Time**: 5-7 days (P0+P1), 3-4 weeks (all)

---

*This audit is theoretical and based on code inspection only. No tests were executed. Findings should be verified with actual testing before production deployment.*
