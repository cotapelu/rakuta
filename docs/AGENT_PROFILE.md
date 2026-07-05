# Agent Weakness Profile

## Fragile Modules
- `src/addon/extensions/tools/todos-tool.ts`: Branches ~75% (86 uncovered); added edge case tests for applyOp and formatSummary; many branches remain.
- `src/addon/extensions/team/team-manager.ts`: Branch coverage ~69% (43 uncovered); added idempotency and withLock error tests; remaining branches in agentMonitor interactions and setupChildRuntimes.
- `src/addon/extensions/capability-system/plugins/codebase/capabilities/dependency_tree.ts`: Branches ~76%; added extra edge tests; still many file resolution and cycle‑detection branches.
- `src/addon/addon/logger.ts` & `src/addon/runtime-context.ts`: Multiple `any` type usages (ESLint warnings), reduce type safety.: Branches ~76%; added parse error test; still many untested branches (file resolution edge cases, cycle detection variations).
- `src/addon/extensions/capability-system/plugins/codebase/capabilities/analyze.ts`: Branches improved to ~76%; fixed import parsing bug; still need coverage for edge import patterns and error paths.
- `src/addon/extensions/capability-system/plugins/codebase/capabilities/ast_query.ts`: Branches ~77%; added unknown kind test; still missing branches for some handler edge cases.
- `src/addon/addon/logger.ts` & `src/addon/runtime-context.ts`: Multiple `any` type usages (ESLint warnings), reduce type safety.

## Error-Prone Stacks
- TypeScript: Overuse of `any` in internal modules reduces type safety and may hide bugs.
- Stringified parameter normalization: Complex code paths in `normalizeParams` prone to edge cases.

## High-Cost Changes
- Coverage improvement: Need to add many targeted tests to raise branch coverage to ≥80%; moderate effort per file.
- ESLint any fixes: Requires careful typing review across multiple files; medium effort.

## Recurring Debt
- TEST_COVERAGE: Branches below target (75.74% vs 80% required).
- CODE_QUALITY: 15 ESLint warnings about `any` and `default-case`.


### Cycle 12 (2026-07-05)
- Added two tests for `todos-tool`: multi-in_progress demotion, no-op error.
- No new branch coverage; still 86 uncovered in `todos-tool.ts`.
- Focus remains on high‑uncovered modules: `todos-tool`, `dependency_tree`, `call_graph`.

### Cycle 13 (2026-07-05)
- Added 2 tests: `dependency_tree` extension fallback (`.js` when no `.ts`), `call_graph` unresolved callee handling.
- Branch coverage +0.03% (76.21% total). Slow progress.
- Target modules: `todos-tool` (86 uncovered), `dependency_tree` (33), `call_graph` (22), `ast_query` (35), `team-manager` (43).
