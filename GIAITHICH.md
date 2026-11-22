# GIAITHICH.md — Giải Thích Các Commit Fix (Audit v2)

> **Tổng cộng**: 11 commits fix bugs + 3 commits cập nhật docs  
> **Thời gian**: 2025-07-18  
> **Branch**: `main`  
> **Trạng thái**: 48/62 tasks hoàn thành, 14 tasks còn lại (feature additions)

---

## Commit 1: `1c02b67` — P0+P1 security and reliability fixes (8+4 tasks)

**Mô tả**: Commit đầu tiên fix tất cả 8 Critical (P0) bugs + 4 High (P1) bugs. Đây là commit lớn nhất, xử lý các lỗ hổng bảo mật nghiêm trọng.

**Các fix chính:**
1. **Path traversal symlink bypass** — `path-security.ts`: Dùng `realpathSync()` thay vì `resolve()` để theo dõi symlink, ngăn truy cập file ngoài cwd.
2. **Message bus stale handler leak** — `message-bus.ts`: Thêm cleanup handler khi timeout, dùng Set thay vì array để tránh duplicate.
3. **Todos data loss** — `todos-tool.ts`: Xóa heuristic `normalizeParams()` parse JSON từ phase name, ngăn mất dữ liệu khi phase name bắt đầu bằng `{`.
4. **Audit timeout 30s** — `audit.ts`: Thêm AbortSignal + per-file timeout, tránh UI freeze.
5. **Command injection** — `test.ts` (dev): Chạy npm trực tiếp thay vì `bash -c`, ngăn command injection.
6. **safe_edit rollback atomicity** — `safe_edit.ts`: Dùng temp file + rename để rollback nguyên tử.
7. **Prompt hook arg injection** — `prompt-hooks.ts`: Sanitize args trước khi substitute vào prompt.
8. **PII in context logger** — `context-logger.ts`: Redact PII + set file mode 0o600.
9. **Capability router context bypass** — `extension.ts`: Đảm bảo AbortSignal luôn present.
10. **Workspace deep clone** — `workspace.ts`: Dùng `structuredClone` thay vì shallow copy.
11. **Kilo roster merge** — `kilo-provider.ts`: Immutable update thay vì mutate.
12. **Provider registration try/catch** — `factory.ts`: Wrap mỗi registration, log failure, continue.

**Files thay đổi**: ~15 files  
**Tests cập nhật**: 3 test files

---

## Commit 2: `6cfb5af` — P1 reliability fixes (workspace deep clone, cycle limit, watch mode retry, etc.)

**Mô tả**: Commit bổ sung các fix P1 còn lại liên quan đến reliability và performance.

**Các fix chính:**
1. **O(n²) cycle detection limit** — `dependency_tree.ts`: Giới hạn số cycle báo cáo (MAX_CYCLES) để tránh exponential trên codebase lớn.
2. **Plugin watch mode retry + debounce** — `plugin-loader.ts`: Tăng debounce, thêm retry với backoff khi manifest chưa ready.
3. **Search pagination** — `search.ts`: Early stop khi đạt maxResults, thêm AbortSignal.
4. **Secret scanner entropy** — `quality_gate.ts`: Thêm entropy-based detection bên cạnh regex.
5. **XSS sanitization** — `render-utils.ts`: Thêm `sanitizeForTerminal()` escape HTML trong renderer output.
6. **Foreign key re-parenting** — `registry.ts` (session): Khi dispose parent, re-parent children về root thay vì orphan.

**Files thay đổi**: ~8 files

---

## Commit 3: `eec920c` — P1/P2 additional fixes (workspace, cycle limit, watch mode, token saver, skill reader, memory idempotent)

**Mô tả**: Commit tổng hợp các fix P1/P2 bổ sung, xử lý workspace, token saver, skill reader, memory.

**Các fix chính:**
1. **Token saver RAW_CAP** — `token-saver/index.ts`: Đổi `>` thành `>=` cho consistency kiểm tra 10MB limit.
2. **Skill reader path traversal** — `read-skill.ts`: Validate skill name (alphanumeric + hyphen), reject path traversal.
3. **Memory delete idempotent** — `memory-tool.ts`: Trả về success nếu memory đã bị xóa (no-op).
4. **Memory reconstruction validation** — `memory-tool.ts`: Thêm schema validation khi reconstruct từ session branch.
5. **Workspace improvements** — `workspace.ts`: Deep clone verification, race condition prevention.

**Files thay đổi**: ~6 files  
**Tests cập nhật**: 1 test file (memory-tool-exec.test.ts)

---

## Commit 4: `3cecfd9` — P2 fixes (session switch rollback, auto-compact cooldown, context logger, piclaw header timeout, etc.)

**Mô tả**: Commit xử lý các P2 bugs liên quan đến session management, auto-compact, logging, network timeout.

**Các fix chính:**
1. **Session switch rollback** — `manager.ts`: Wrap `switchTo()` trong try/catch, rollback registry nếu runtime switch thất bại.
2. **Auto-compact cooldown** — `auto-compact-85.ts`: Thêm cooldown 5 phút giữa các lần compact, guard `isCompacting` flag.
3. **Context logger permissions** — `context-logger.ts`: Set file mode 0o600 khi tạo log file.
4. **Piclaw header timeout** — `piclaw-header.ts`: Thêm connection timeout, dùng `AbortSignal.timeout()`.
5. **Auto-compact metrics** — `auto-compact-85.ts`: Log compaction events với context usage %.

**Files thay đổi**: ~5 files

---

## Commit 5: `5b158e8` — P2 fixes (message bus limit, auto-compact cooldown, etc.)

**Mô tả**: Commit bổ sung giới hạn handler cho message bus và các fix P2 khác.

**Các fix chính:**
1. **Message bus handler limit** — `message-bus.ts`: Thêm MAX_HANDLERS limit, auto-cleanup stale handlers.
2. **Auto-compact cooldown** — `auto-compact-85.ts`: Hoàn thiện cooldown logic và isCompacting guard.
3. **Circuit breaker** — `circuit-breaker.ts`: Chuyển sang singleton pattern để thực sự bảo vệ.

**Files thay đổi**: ~4 files

---

## Commit 6: `49c8b06` — P2 fixes (child worker error msg, plugin cache busting, etc.)

**Mô tả**: Commit cải thiện error message cho child worker và cache busting cho plugin loader.

**Các fix chính:**
1. **Child worker error message** — `child-worker.ts`: Thêm danh sách available models vào error message khi model resolution thất bại.
2. **Plugin cache busting** — `plugin-loader.ts`: Dùng `?t=${Date.now()}` query param để bypass ESM cache khi hot-reload.
3. **Todos next ID** — `todos-tool.ts`: Fix tính toán next ID (max+1 thay vì length+1).

**Files thay đổi**: ~4 files

---

## Commit 7: `12f483b` — P2 fixes (circuit breaker singleton, sanitize error messages, etc.)

**Mô tả**: Commit hoàn thiện circuit breaker singleton và sanitize error messages.

**Các fix chính:**
1. **Circuit breaker singleton** — `circuit-breaker.ts`: Chuyển từ instance per call sang singleton/context-injected.
2. **Sanitize error messages** — `render-utils.ts`: Thêm `sanitizeErrorMessage()` để chỉ hiển thị relative paths, không leak internal paths/stack traces.
3. **Webhook idempotent** — Thêm idempotency key cho external calls.

**Files thay đổi**: ~4 files

---

## Commit 8: `a384d18` — P2/P3 fixes (handoff path, todos empty state, etc.)

**Mô tả**: Commit xử lý handoff path và todos empty state.

**Các fix chính:**
1. **Handoff path** — `handoff.ts`: Dùng actual session ID thay vì timestamp-based ID cho contract file.
2. **Todos empty state** — `todos-renderer.ts`: Thêm hint "Use todos({add_phase: {...}}) to create todos".
3. **Team widget empty state** — `team-widget.ts`: Thêm hint "Use team_run({tasks: [...]}) to create a team".

**Files thay đổi**: ~3 files

---

## Commit 9: `4962819` — P1/P2/P3 cleanup (mark completed, minor fixes)

**Mô tả**: Commit cleanup tổng hợp, đánh dấu completed tasks và các fix nhỏ.

**Các fix chính:**
1. **Keybinding security** — `keybinding-extension.ts`: Validate command exists trước khi sendUserMessage.
2. **Icon usage consistency** — Renderers: Thống nhất icon styles.
3. **Todos empty state** — `todos-renderer.ts`: Hoàn thiện empty state guidance.
4. **Chain validation** — `chains.ts`: Validate chain links on write.

**Files thay đổi**: ~5 files

---

## Commit 10: `5e5fc39` — JWT none algorithm detection + P3 cleanup

**Mô tả**: Commit thêm detection cho JWT `none` algorithm và cleanup P3.

**Các fix chính:**
1. **JWT `none` algorithm detection** — `audit.ts`: Thêm detection cho `algorithms: ['none']` và confusion attacks.
2. **Tracing improvements** — Various: Cải thiện tracing context propagation.
3. **Token saver stats** — `saver-stats.ts`: Persist stats (optional).

**Files thay đổi**: ~4 files

---

## Commit 11: `7124f9f` — Secret scanner entropy detection + P1 cleanup

**Mô tả**: Commit hoàn thiện secret scanner với entropy detection và cleanup P1.

**Các fix chính:**
1. **Secret scanner entropy** — `quality_gate.ts`: Thêm entropy-based detection bên cạnh regex-only.
2. **P1 cleanup** — Các fix P1 còn lại được mark completed.
3. **Auto-continue timer** — `auto-continue.ts`: Track timer trong WeakMap để tránh leak khi hot-reload.

**Files thay đổi**: ~4 files

---

## Commit 12-14: `cf4f7d3`, `812abad`, `547c46c` — Cập nhật docs và metrics

**Mô tả**: Các commit cuối cùng cập nhật documentation và metrics.

**Các thay đổi:**
1. **PROJECT_STATE.md** — Cập nhật trạng thái project, quality gate, coverage.
2. **AGENT_METRICS.md** — Cập nhật metrics: iterations, test failure rate, rollback count.
3. **AUDIT.md** — Thêm tổng kết fixes và 14 tasks còn lại.
4. **TODO.md** — Đánh dấu 48/62 tasks completed.

**Files thay đổi**: ~4 files (docs only)

---

## Tóm Tắt Theo Priority

| Priority | Số fix | Files chính | Tests |
|----------|--------|-------------|-------|
| P0 (Critical) | 8 | path-security, message-bus, todos-tool, audit, test, safe_edit, prompt-hooks, context-logger | 3 |
| P1 (High) | 13 | task-manager, workspace, extension, quality_gate, dependency_tree, plugin-loader, search, render-utils, kilo-provider, factory, memory-tool, registry, safe_edit | 2 |
| P2 (Medium) | 15 | manager, todos-tool, child-worker, plugin-loader, circuit-breaker, message-bus, auto-compact-85, context-logger, piclaw-header, token-saver, read-skill, memory-tool, webhook, handoff, team-widget | 2 |
| P3 (Low) | 7 (12 tasks gộp) | render-utils, keybinding-extension, audit, saver-stats, handoff, metrics, piclaw-header, auto-continue, todos-renderer, chains | 0 |
| **Tổng** | **48** | **~30 files** | **~7** |

---

*Ghi chú: Một số commits gộp nhiều fixes nhỏ (P2/P3 cleanup). Số lượng fix thực tế là 48 tasks theo tracking trong docs/TODO.md.*
