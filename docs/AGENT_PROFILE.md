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

### Cycle 14 (2026-07-05)
- Added 6 tests for `TodoState.reconstructFromEntries` covering multiple entry filtering branches.
- Branch coverage +2 (~+0.06%) to 76.27%. Still far from 80%.
- Next targets: `todos-tool` (86 uncovered), `dependency_tree` (34), `ast_query` (35), `call_graph` (23), `team-manager` (43).

### Cycle 15 (2026-07-05)
- Added tests: `call_graph` missing export branch, `ast_query` branches (invalid regex, parent non-match, unknown kind).
- Branch coverage +0.03% to 76.3%. `call_graph` per-file improved to 82.56% branches.
- Still far from 80% overall; modules with most uncovered: `todos-tool` (~86), `team-manager` (~43), `dependency_tree` (~34).

### Cycle 16 (2026–07–05)
- Added `todos-tool.save-error.test.ts` to cover `fs.rename` failure in atomic write.
- Branches +2 to 76.36%; `todos-tool.ts` branch coverage rose to 87.24%.
- Remaining high‑uncovered modules: `todos-tool` (~45 uncovered), `team-manager` (~43), `dependency_tree` (~34), `ast_query` (~35), `call_graph` (~22). Continue with error‑path tests for these modules.

### Cycle 17 (2026-07-05)
- Added `team-manager.runAgentLoop.test.ts` covering early exit when tasks already completed.
- Branch coverage +6 to 76.53% (2610/3410). `team-manager.ts` per‑file improved.
- Remaining uncovered: `todos-tool` (~45), `team-manager` (~37), `dependency_tree` (~34), `ast_query` (~35), `call_graph` (~22).

### Cycle 18 (2026-07-05)
- Added `team-manager.registry-coverage.test.ts` covering TeamRegistry branches (register/unregister, timer logic).
- Branch coverage +1 to 76.56%. TeamManager per‑file branches improved modestly.
- Remaining high‑uncovered: `todos-tool` (~45), `team-manager` (~36), `dependency_tree` (~34), `ast_query` (~35), `call_graph.ts` (~22).

### Cycle 19 (2026-07-05)
- Added `todos-tool.multiple-ops.test.ts` to cover `execute` branch when multiple operations detected.
- Branch coverage +2 to 76.62% (2613/3410). `todos-tool.ts` branch % rose to 87.83%.
- Remaining: `todos-tool` (~44), `team-manager` (~35), `dependency_tree` (~34), `ast_query` (~35), `call_graph` (~22).

### Cycle 20 (2026-07-05)
- Added `todos-tool.write-error.test.ts` (writeFile failure) and extended `ast_query` tests.
- No new branch coverage overall (remained 76.62%). Some targeted branches may have been already covered by other tests.
- Continued focus on modules with highest absolute uncovered branches: `todos-tool`, `team-manager`, `dependency_tree`, `ast_query`, `call_graph`.

### Cycle 21 (2026-07-05)
- Added `team-manager.runAgentLoop-maxturns.test.ts` covering loop exit on `turnCount >= MAX_TURNS`.
- Branch coverage +7 to 76.83% (2620/3410). `team-manager.ts` per‑file branches improved.
- Remaining high‑uncovered: `todos-tool` (~44), `team-manager` (~29), `dependency_tree` (~34), `ast_query` (~35), `call_graph` (~22).

### Cycle 22 (2026-07-05)
- Added `team-manager.runAgentLoop-prompt-catch.test.ts` covering catch block when `runtime.session.prompt` rejects.
- Branch coverage +1 to 76.86% (2621/3410).
- Remaining high‑uncovered: `todos-tool` (~44), `team-manager` (~28), `dependency_tree` (~34), `ast_query` (~35), `call_graph` (~22).

### Cycle 23 (2026-07-05)
- Added test for `todos-tool.getLatestTodoPhasesFromEntries` with toolName `'todo_write'`.
- Branch coverage +1 to 76.89% (2622/3410).
- Remaining high-uncovered: `todos-tool` (~43), `team-manager` (~28), `dependency_tree` (~34), `ast_query` (~35), `call_graph` (~22).

### Cycle 24 (2026-07-05)
- Added `ast_query` test for MethodDefinition inside class with parent filter.
- No new branch coverage (remained 76.89%). The parent‑match branch for class methods was already covered.
- Remaining high‑uncovered: `todos-tool` (~43), `team-manager` (~28), `dependency_tree` (~34), `ast_query` (~35), `call_graph` (~22).
