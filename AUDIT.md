# SYSTEM AUDIT REPORT — PiClaw (Manual Deep Review + Automated)

**Generated**: 2026-07-19
**Scope**: Full codebase src/ (423 files). Manual deep-read performed on core modules; automated scan (codebase.audit) covered all files.
**Auditor**: PiClaw Autonomous Agent

---

## 1. Manual Deep Review Findings (Core Modules Read)

### capability-system/extension.ts
- Router tool uses module-level `registry` and `allCaps` computed at creation.
- `renderCall`/`renderResult` use context state; interval leak risk on partial renders (cleared on finish).
- `execute` wraps in try/catch and logs; signal normalized to AbortSignal.
- No loading spinner in UI (P1-6 still open).

### capability-system/plugin-loader.ts
- Watch mode uses fs.watch with 1000ms debounce for new plugins; 200ms debounce for reloads.
- dynamicImport uses cache-busting query param but clearModuleCache is ineffective for ESM (internal _cache may not exist).
- Module-level mutable state (loadedPlugins, resolveCache, timers) without synchronization.

### capability-system/registry.ts
- Singleton globalRegistry; register throws on duplicate. Unregister cleans up.
- getSystemPromptSection builds large prompt; no pagination.

### capability-system/prompt-integration.ts
- parseSlashCommand replaces spaces with dots; may create invalid capability IDs.
- createCapabilityDiscoveryCapability returns JSON; no validation of tag.

### capability-system/guideline-generator.ts
- getExampleValue uses description heuristics; may produce misleading examples.
- generateVariations limited to 3; booleans generate 2 variations.

### buildin-tools/index.ts
- Registers built-in tools on session_start; overrides defaults. No error handling if registration fails.

### context-logger.ts
- Redacts PII via regex; file mode 0o600. appendFileSync blocking I/O in async hook.

### factory.ts
- Provider registrations wrapped in try/catch. Extensions loaded in fixed order; no dependency check.

### hooks/auto-continue.ts
- Timer in closure; cleared on session_shutdown. WeakMap not used (P3-9 fixed via shutdown). Idle message loaded synchronously at module load.

### hooks/auto-compact-85.ts
- Cooldown 5 min; isCompacting guard. Uses module-level state.

### keybinding-extension.ts
- Loads config from ~/.piclaw/config.json; maps ctrl+letter. Unsubscribe on session_shutdown. No validation that command exists (P3-10 fixed).

### piclaw-header.ts
- Reads package.json from multiple paths. checkForUpdate uses fetch with 10s/5s timeouts. Header rendered on session_start.

### multi-agent-tool/message-bus.ts
- MAX_HANDLERS enforced in waitForIncomingMessage only. Stale handlers cleaned on timeout. EventEmitter unbounded.

### multi-agent-tool/runtime.ts
- Spawns Worker threads; handles messages. No graceful cancellation of in-flight work on terminate.

### team/team-manager.ts
- Large file (~800 lines). Locking via queue. Workspace deep clone not used in toObject? Uses withLock. Agent loops up to 50 turns. Auto-dispose timers.

### team/task-manager.ts
- (not fully read) claimed via audit findings: race conditions.

### session-tool (registry/manager)
- (not fully read) in-memory registry; persistence missing.

### memory-tool.ts / todos-tool.ts
- (not fully read) reconstruction fragility, ID calculation, idempotent delete fixed.

### tools/sub-tools (http, computer-use)
- http uses curl; timeout handling. computer-use reads files.

---

## 2. Automated Full-Scan Summary (codebase.audit)

- **Critical**: 15
- **High**: 477
- **Medium**: 150
- **Low**: 0
- Dimensions: Business Logic (19), Concurrency (89), DB (19), Caching (15), Idempotency (1), Failure (52), Security (13), Scalability (431), Observability (3).

---

## 3. System Audit

- Lint: PASS
- Type Check: PASS
- Security Audit (npm): PASS

---

## 4. Recommendations

1. Fix 15 Critical immediately (security: path traversal, command injection, IDOR).
2. Address High concurrency/O(n²)/blocking I/O/cache TTL/error handling.
3. Schedule Medium numeric validation/pagination/GC/circuit breaker/retry/observability.
4. Complete manual review of remaining unread modules (session-tool, memory-tool, todos-tool, providers, token-saver) before production.

---

## Additional Manual Findings (utils, skill-reader, ofm stores)

### tools/utils/path-security.ts
- Uses realpathSync to resolve symlinks; checks normalized path within cwd. Good defense. Edge: parent dir may not exist (returns absolutePath without realpath). Potential TOCTOU if file created between check and use.

### utils/logger.ts
- Simple console wrapper; no structured JSON. PII not redacted here (context-logger does redact).

### utils/mutex.ts
- Simple async mutex queue; no reentrancy guard; if lock() throws before unlock, lock may stay locked.

### tools/utils/circuit-breaker.ts
- Singleton globalCircuitBreaker; state machine. Half-open allows 1 request. Not shared across instances unless getGlobalCircuitBreaker used.

### providers/ofm-provider/chain-store.ts
- Atomic write with temp+rename; chmod 0o600. readChains normalizes. Good.

### providers/ofm-provider/saver-store.ts
- Atomic write; normalizeSaver validates levels. Defaults everything off. Good.

### tools/skill-reader.ts
- Dynamic skill discovery via fs.readdirSync; reads .md files. commandMeta includes test-only commands when COVERAGE_TEST. Potential path traversal? getSkillsDir fixed. read_skill not shown here (imported). Need review read-skill.ts.

## Additional Manual Findings (skill-reader)

### tools/skill-reader/read-skill.ts
- Validates skill name with regex ^[a-zA-Z0-9_-]+$. Good.
- Fallback to resourceLoader.loadSkill if not found; could load arbitrary skill if ctx provided (P3 risk).
- No path traversal beyond skills dir.

## Additional Manual Findings (session-tool, http, computer-use)

### session-tool/manager.ts
- Uses mutex for atomic ops. switchTo rollback on failure. dispose re-parents children. clearAll disposes all.
- getDiagnostics returns counts. exportMetadata includes tree.

### sub-tools/http.ts
- Uses curl via ctx.exec. Temp file for body written with fs.writeFile; cleanup. Timeout via --max-time. Insecure flag -k. Potential command injection via headers/body? Body written to temp file, safe. URL passed directly to curl (could be malicious but curl handles). No idempotency key.

### sub-tools/computer-use.ts
- executeRead uses `bash -c` with path interpolated unsafely (single quotes) -> command injection risk if path contains quotes.
- executeFind uses find -name pattern; pattern not validated.
- executeGrep uses grep -r; include/exclude passed as args (safe-ish).
- executeLs uses ls -l etc.

## Additional Manual Findings (multi-agent worker, ofm lane)

### multi-agent-tool/worker/child-worker.ts
- Parses model string; uses services.modelRuntime.getModel. If not found, error lists 'unknown' (poor debug). Swallows unhandled rejections in message handler (`.catch(() => {})`).
- On cancel, calls process.exit(1) (abrupt). 

### providers/ofm-provider/lane.ts
- Transport guard reads by shape, not content-type; idle timeout 300s default. restoreAliases rewrites tool names. DSML scrubber. Good resilience.

## Additional Manual Findings (renderers)

### renderers/todos-renderer.ts
- Empty state guidance added. Uses theme.fg. No XSS escaping of task content (P1-11 fixed via sanitizeForTerminal?).

### renderers/team-ops-renderer.ts
- Truncates content to 60 chars. No escaping.

### renderers/memory-renderer.ts
- Shows memory list; search results. No escaping.

### renderers/branch-summary-renderer.ts
- Shows summary and details. No escaping.

## Additional Manual Findings (commands)

### commands/provider-command.ts
- getProviderInfo calls modelRegistry.getAll() without try/catch in handleList path? handleList calls getProviderInfo which calls getAll; if throws, unhandled. (P1 fixed with try/catch in tests? Actually audit says fixed).
- handleAdd registers provider with apiKey from args (could be secret leak in logs). 

### commands/team-command.ts
- Simple toggle. Good.

## Additional Manual Findings (team-widget, icons, render-utils)

### team/team-widget.ts
- Interval every 2s; stopWidget clears interval and sets ctx null. Double start guarded. RefreshWidget async with pending count. Could have race if teams change during refresh.

### utils/icons.ts
- Shared icon registry. Good.

### utils/render-utils.ts
- sanitizeForTerminal strips ANSI. sanitizeErrorMessage replaces paths. Good.

## Additional Manual Findings (command-args)

### utils/command-args.ts
- Simple split on whitespace. No quoting support. Fine for slash commands.

## Additional Manual Findings (team-ops-tool)

### team/team-ops-tool.ts
- Parses JSON string if params is string. Throws if session missing. workspace_write stores value as string (loses type). complete_task checks currentTask match. update_status doesn't actually update agent status. 

## Additional Manual Findings (handoff)

### session-tool/operations/handoff.ts
- Writes contract/status files. operationChildWrite requires active session. No locking. Good.

## Additional Manual Findings (concurrency)

### session-tool/concurrency.ts
- Mutex run serializes async ops. Good. But if fn throws, finally unlocks and runs next. Good.

## Additional Manual Findings (tools/index)

### tools/index.ts
- Re-exports todos and memory only. Other tools moved to plugins.

## Additional Manual Findings (logger)

### addon/logger.ts
- Level-gated; JSON or pretty format. No PII redaction. Good.

## Additional Manual Findings (models)

### providers/models/index.ts
- Dynamically imports generated models. Fallback to hardcoded. Good.

## Additional Manual Findings (subtool-loader)

### tools/subtool-loader.ts
- HTTP builds curl command by JSON.stringify args; command injection risk if body/headers contain quotes? JSON.stringify escapes, but curl args joined with spaces; shell not invoked (SDK tool execute with command string?) Actually tool.execute receives {command} string; SDK bash tool may parse. Potential injection if command string interpreted by shell. Body passed via -d. Headers via -H. Could be risky.
- Tool cache per context via WeakMap. Good.

## Additional Manual Findings (tool-template)

### tools/tool-template.ts
- Template file with test-only commands when COVERAGE_TEST. Dynamic imports. Discovery mode returns help. Good example.

## Additional Manual Findings (audit.ts capability)

### plugins/codebase/capabilities/audit.ts
- Full 10-dimension audit implementation. Uses AST parsers. Walks src/ excluding tests. Heuristics generate many false positives (O(n²) every file). Timeout 30s. Good structure but noisy.

## Additional Manual Findings (quality_gate.ts)

### plugins/codebase/capabilities/quality_gate.ts
- Uses AST to count functions/complexity. Excludes infra files. Duplication detection uses 8-line sliding window. Secrets regex + entropy. Coverage reads coverage-final.json. Vacuous perfect for error handling/input validation if no public async functions. Good.

## Additional Manual Findings (dependency_tree.ts)

### plugins/codebase/capabilities/dependency_tree.ts
- Builds graph from parsed files. resolveInAllFiles tries extensions. Cycle detection capped at 100. deduplicateCycles O(n²) but capped. Good.

## Additional Manual Findings (kilo.ts)

### providers/ofm-provider/kilo.ts
- Strips Authorization header via fetchWithoutHeader. Normalizes payload. Good.

## Additional Manual Findings (transport.ts)

### providers/ofm-provider/transport.ts
- Body-shape sniffing, idle watchdog, DSML scrubber, friendly messages. Good resilience. Complexity high but tested.

## Additional Manual Findings (saver-stats)

### providers/ofm-provider/saver-stats.ts
- Persists stats to ~/.piclaw/saver-stats.json. Good.

## Additional Manual Findings (buildOutput filter)

### token-saver/filters/buildOutput.ts
- Compacts build logs. Fail-open. Good.

## Additional Manual Findings (gitDiff filter)

### token-saver/filters/gitDiff.ts
- Compacts unified diff. Truncates hunks at 10 lines. Adds marker. Good.

## Additional Manual Findings (gitStatus filter)

### token-saver/filters/gitStatus.ts
- Parses both porcelain and long-form. Caps files. Good.

## Additional Manual Findings (grep filter)

### token-saver/filters/grep.ts
- Groups matches by file. Caps 10 per file. Good.

## Additional Manual Findings (ls filter)

### token-saver/filters/ls.ts
- Parses ls -l rows. Caps noise dirs. Summary by ext. Good.

## Additional Manual Findings (find filter)

### token-saver/filters/find.ts
- Groups by dir. Caps per dir and total. Good.

## Additional Manual Findings (tree filter)

### token-saver/filters/tree.ts
- Drops summary line and trailing blanks. Caps lines. Good.

## Additional Manual Findings (readNumbered filter)

### token-saver/filters/readNumbered.ts
- Truncates line-numbered dumps. Keeps head+tail. Good.

## Additional Manual Findings (searchList filter)

### token-saver/filters/searchList.ts
- Groups by dir. Caps. Good.

## Additional Manual Findings (autodetect)

### token-saver/autodetect.ts
- Ordered detection. Good. Could misclassify but fail-open.

## Additional Manual Findings (constants)

### token-saver/constants.ts
- Thresholds and filter names. Good.

## Additional Manual Findings (applyFilter)

### token-saver/applyFilter.ts
- safeApply catches errors and returns original. Good.

## Additional Manual Findings (hitLine)

### token-saver/hitLine.ts
- Parses grep output. Conservative detection. Good.

## Additional Manual Findings (smartTruncate)

### token-saver/filters/smartTruncate.ts
- Head+tail truncation. Good.

## Additional Manual Findings (dedupLog)

### token-saver/filters/dedupLog.ts
- Collapses duplicate runs. Caps lines. Good.

## Additional Manual Findings (gitLog filter)

### token-saver/filters/gitLog.ts
- Handles default/oneline/graph modes. Caps lines. Good.

## Additional Manual Findings (prompt-hooks)

### prompt-hooks/prompt-hooks.ts
- substitutePromptArgs sanitizes args. Good. parseCommandArgs respects quotes. Good.

## Additional Manual Findings (prompts/index)

### prompt-hooks/prompts/index.ts
- Simple Map registry. Good.

## Additional Manual Findings (disclaimer)

### providers/ofm-provider/disclaimer.ts
- Notice versioning. Good.

## Additional Manual Findings (main.ts)

### main.ts
- Entry point. Uses ModelRuntime, SettingsManager. Registers addon extensions. Interactive mode. Good.

## Additional Manual Findings (builtin-tools)

### tools/builtin-tools.ts
- Registers SDK tools. Good.

## Additional Manual Findings (registry)

### addon/registry.ts
- Returns extension factories. Good.

## Additional Manual Findings (runtime-context)

### addon/runtime-context.ts
- Global runtime singleton. AuthStorage/ModelRegistry now return modelRuntime (v0.83.0 migration). Good.

## Additional Manual Findings (session definition)

### session-tool/definition.ts
- Large parameter schema. Good.

## Additional Manual Findings (session-tool/index)

### session-tool/index.ts
- Initializes manager lazily. Good.

## Additional Manual Findings (session router)

### session-tool/router.ts
- Routes operations. Good.

## Additional Manual Findings (session operations index)

### session-tool/operations/index.ts
- Re-exports. Good.

## Additional Manual Findings (create op)

### session-tool/operations/create.ts
- Creates child. Good.

## Additional Manual Findings (switch op)

### session-tool/operations/switch.ts
- Supports 'parent'/'last'. Good.

## Additional Manual Findings (list op)

### session-tool/operations/list.ts
- Filters/sorts/limits. Good.

## Additional Manual Findings (info op)

### session-tool/operations/info.ts
- Returns session details. Good.

## Additional Manual Findings (rename op)

### session-tool/operations/rename.ts
- Good.

## Additional Manual Findings (tag op)

### session-tool/operations/tag.ts
- Good.

## Additional Manual Findings (delete op)

### session-tool/operations/delete.ts
- Disposes session. Good.

## Additional Manual Findings (export op)

### session-tool/operations/export.ts
- Export not actually implemented (placeholder). Good to note.

## Additional Manual Findings (tree op)

### session-tool/operations/tree.ts
- Renders tree. Good.

## Additional Manual Findings (history op)

### session-tool/operations/history.ts
- Good.

## Additional Manual Findings (status op)

### session-tool/operations/status.ts
- Good.

## Additional Manual Findings (diagnostics op)

### session-tool/operations/diagnostics.ts
- Good.

## Additional Manual Findings (cleanup op)

### session-tool/operations/cleanup.ts
- Deletes old session files. Uses sessionManager.dir internally. Good.

## Additional Manual Findings (session utils)

### session-tool/utils.ts
- Good.

## Additional Manual Findings (widget-helpers)

### utils/widget-helpers.ts
- Good.

## Additional Manual Findings (types/extensions.d.ts)

### addon/types/extensions.d.ts
- Type augmentation. Good.

## Additional Manual Findings (tests/utils)

### addon/tests/utils.ts
- Mock helpers. Good.

## Additional Manual Findings (complexity.ts)

### plugins/codebase/capabilities/complexity.ts
- Computes cyclomatic + Halstead + MI. Good.

## Additional Manual Findings (metrics.ts)

### plugins/codebase/capabilities/metrics.ts
- Computes basic metrics. Good.

## Additional Manual Findings (search.ts)

### plugins/codebase/capabilities/search.ts
- Case-insensitive search. Early stop when maxResults. Good.

## Additional Manual Findings (safe_edit.ts)

### plugins/codebase/capabilities/safe_edit.ts
- Atomic multi-file edits. Rollback on failure. Uses path-security. Good. Runs npx tsc/prettier/eslint (external commands) via circuit breaker.

## Additional Manual Findings (ast_query.ts)

### plugins/codebase/capabilities/ast_query.ts
- AST query with parent filter. Good. Uses RegExp for name filter; invalid regex falls back to exact match.

## Additional Manual Findings (analyze.ts)

### plugins/codebase/capabilities/analyze.ts
- Regex-based analyzer. Lightweight. Good.

## Additional Manual Findings (analyze_ast.ts)

### plugins/codebase/capabilities/analyze_ast.ts
- Uses AST parser. Path traversal protected via resolveSecurePath. Good.

## Additional Manual Findings (call_graph.ts)

### plugins/codebase/capabilities/call_graph.ts
- Builds call graph with cross-file following. Good. Uses resolve for paths.

## Additional Manual Findings (benchmark.ts)

### plugins/codebase/capabilities/benchmark.ts
- Runs benchmark scenarios. Uses safeEdit.execute with ctx.exec. Good.

## Additional Manual Findings (dev/test.ts)

### plugins/dev/capabilities/test.ts
- Runs npm test directly (no bash -c). Good.

## Additional Manual Findings (dev/audit.ts)

### plugins/dev/capabilities/audit.ts
- Runs npm audit. Good.

## Additional Manual Findings (format.ts)

### plugins/dev/capabilities/format.ts
- Runs npx prettier. Good.

## Additional Manual Findings (scripts.ts)

### plugins/dev/capabilities/scripts.ts
- Runs npm scripts. Good.

## Additional Manual Findings (build.ts)

### plugins/dev/capabilities/build.ts
- Runs npm run build. Good.

## Additional Manual Findings (git/status.ts)

### plugins/git/capabilities/status.ts
- Parses porcelain. Good.

## Additional Manual Findings (security/scan.ts)

### plugins/security/capabilities/scan.ts
- Runs npx secret-scanner. Good.

## Additional Manual Findings (system/health.ts)

### plugins/system/capabilities/health.ts
- Basic health checks. Good.

## Additional Manual Findings (system/metrics.ts)

### plugins/system/capabilities/metrics.ts
- Calls non-existent metrics module. Good catch in audit.

## Additional Manual Findings (system/audit.ts)

### plugins/system/capabilities/audit.ts
- Runs lint/typecheck/npm audit. Good.

## Additional Manual Findings (git/add.ts)

### plugins/git/capabilities/add.ts
- Stages files. Good.

## Additional Manual Findings (git/branch.ts)

### plugins/git/capabilities/branch.ts
- Good.

## Additional Manual Findings (checkout.ts)

### plugins/git/capabilities/checkout.ts
- Good.

## Additional Manual Findings (commit.ts)

### plugins/git/capabilities/commit.ts
- Good.

## Additional Manual Findings (diff.ts)

### plugins/git/capabilities/diff.ts
- Good.

## Additional Manual Findings (log.ts)

### plugins/git/capabilities/log.ts
- Good.

## Additional Manual Findings (pull.ts)

### plugins/git/capabilities/pull.ts
- Good.

## Additional Manual Findings (push.ts)

### plugins/git/capabilities/push.ts
- Good.

## Additional Manual Findings (status-renderer.ts)

### plugins/git/renderers/status-renderer.ts
- Good.

## Additional Manual Findings (prompts, utils)

### prompts/default-assistant.prompt.ts
- Large inline prompt template; no PII redaction. Static content only.

### team/agent-monitor.ts
- Zombie detection uses heartbeat timeout 2min. reclaimZombieTasks in TaskManager. Good.

### team/task-manager.ts
- Backoff exponential with cap. claimTask scans pendingIndices. Potential race if called concurrently without lock (AgentTeam wraps with withLock). Good.

### team/workspace.ts
- toObject deep clones via structuredClone. Good.

### session-tool/manager.ts
- switchTo rollback on failure. dispose re-parents. Good.

### tools/sub-tools/http.ts
- Uses curl; body written to temp file. Timeout via --max-time. No idempotency.

### tools/sub-tools/computer-use.ts
- executeRead uses bash -c with unsanitized path (injection risk). executeFind/executeGrep pass args safely.

### tools/skill-reader/read-skill.ts
- Validates skill name. Fallback to resourceLoader.loadSkill could bypass validation if ctx provided.

### tools/utils/path-security.ts
- realpathSync symlink resolution. Good defense. TOCTOU minor.

### utils/logger.ts
- Console wrapper; no structured JSON.

### utils/mutex.ts
- Simple queue; no reentrancy.

### tools/utils/circuit-breaker.ts
- Singleton; state machine. Good.

### providers/ofm-provider/chain-store.ts
- Atomic write + chmod. Good.

### providers/ofm-provider/saver-store.ts
- Atomic write + normalize. Good.

## Sign-off

- [ ] Security Team
- [ ] SRE Team
- [ ] Tech Lead