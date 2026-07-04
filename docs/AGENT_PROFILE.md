# Agent Weakness Profile

## Fragile Modules (Low Coverage >80% untested)

### Critical Coverage Gaps (0-10%)
- `addon/extensions/buildin-tools/index.ts` - 0% tested, core tool registration
- `addon/extensions/capability-system/extension.ts` - 0% tested, capability router
- `addon/extensions/tools/action-tool.ts` - 0% tested, file operations
- `addon/extensions/tools/memory-tool.ts` - 0% tested, memory management
- `addon/extensions/tools/tool-loader.ts` - 0% tested, dynamic loading
- `addon/extensions/tools/todos-tool.ts` - 0% tested, todo management
- `addon/extensions/team/team-widget.ts` - 0% tested, TUI widget
- `addon/extensions/utils/command-args.ts` - 0% tested, CLI parsing
- `addon/extensions/utils/logger.ts` - 0% tested, logging infrastructure
- `addon/extensions/utils/mutex.ts` - 0% tested, concurrency control
- `addon/prompts/*.ts` - all 0% tested, prompt templates

### Risk: These modules are unvalidated by tests - changes could break silently.

## Error-Prone Stacks

### `any` Type Abuse
- **Files affected**: logger.ts, runtime-context.ts, file-actions.ts, git-actions.ts
- **Common mistake**: Using `any` instead of proper interfaces
- **Impact**: Type safety lost, harder to catch errors at compile time
- **Estimated fix**: 15 remaining `any` instances

### Async Context Propagation
- **Stack**: multi-agent runtime, session tools, message bus
- **Common mistake**: Forgetting to pass context across async boundaries
- **Impact**: Lost correlation IDs, broken tracing
- **Current coverage**: 0-40% in related files

### Concurrency & Shared State
- **Stack**: team workspace operations, session registry, multi-session manager
- **Common mistake**: Race conditions in workspace writes, improper lock ordering
- **Impact**: Data corruption, lost updates
- **Mitigation**: Mutex used but needs coverage testing

### Capability System Plugin Loading
- **Stack**: capability-system/extension.ts, plugin-loader.ts, codebase plugin
- **Common mistake**: Plugin instantiation errors, missing error recovery
- **Impact**: Feature loading fails silently, crash on startup
- **Coverage**: 0% on extension.ts

## High-Cost Changes

### Area: Team Collaboration System
- **Reason**: Complex state machine (tasks, agents, workspaces, messages)
- **Avg hours to modify safely**: 8-16h (requires deep understanding)
- **Testing burden**: Integration tests needed for every change

### Area: Multi-Session Management
- **Reason**: File-based persistence with concurrent access
- **Avg hours**: 4-8h
- **Risk**: Data corruption, session leaks, race conditions

### Area: Capability System
- **Reason**: Plugin lifecycle, dependency injection, dynamic loading
- **Avg hours**: 3-6h
- **Complexity**: Extension points, capability resolution, safe edits

## Recurring Technical Debt

### Type Any (6 instances)
- Count: 6 `any` types in critical files
- Trend: ⚠️  Stable (not improving)
- Fix effort: Low (1-2h each)

### ESLint Warnings (18 total)
- Count: 18 warnings
- Trend: ➡️  New warnings appear after changes
- Fix effort: Low-Medium (5min-1h each)

### Zero-Coverage Files (~20 files)
- Count: ~20 files with 0% coverage
- Trend: ➡️  Growing as new files added without tests
- Fix effort: Medium-High (2-8h each depending on complexity)

### Missing JSDoc
- Count: Unknown (likely >100 public functions
- Trend: ⚠️  Not tracked
- Fix effort: Medium (30min per function)

## Recommended Improvements Order

1. **Test coverage for fragile modules** (P0) - 40h estimated
2. **Replace `any` with concrete types** (P1) - 12h estimated
3. **Add error path tests** (P2) - 20h estimated
4. **Fix ESLint warnings** (P3) - 8h estimated
5. **Add JSDoc for public APIs** (P4) - 30h estimated

## Quality Self-Assessment

| Category | Score (1-5) | Notes |
|----------|-------------|-------|
| Code Quality | 3 | Clean but low coverage |
| Type Safety | 2 | Too many `any` |
| Test Coverage | 1 | Critical gaps |
| Error Handling | 2 | Incomplete |
| Documentation | 2 | Missing JSDoc |
| Maintainability | 3 | Architecture clear |
| Security | 4 | No known vulnerabilities |

**Overall**: 2.4/5 - **Needs improvement**

---

*Updated: 2026-07-04 15:30 (Initial assessment)*
