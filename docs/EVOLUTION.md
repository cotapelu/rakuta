# Evolution Roadmap (3-6 months)

## Current Trajectory
- Health Score: unknown (baseline pending stable metrics)
- Coverage trend: slow improvement with setbacks (branches +1.38% over twenty‑seven cycles, then -2.65% in cycle 28 due to inclusion of new untested autonomous engine modules, then +0.49% cycle 30). Gain breakdown: +0.32% todos, +0.03% team, +0.00% dep_tree, +0.12% analyze, +0.03% ast_query, +0.06% todos-formatSummary, +0.05% todos+dep_tree edge tests, +0.00% team-manager extra, +0.03% todos-io-error, +0.06% todos-normalize-no-pending, +0.00% todos extra, +0.03% dep_tree+call_graph, +0.06% todos-reconstruct, +0.03% ast_query+call_graph, +0.06% todos-save-error, +0.17% team-manager-runAgentLoop, +0.03% team-manager-registry, +0.06% todos-tool-multiple-ops, +0.00% todos-tool-write-error + ast_query extra, +0.21% team-manager‑MAX_TURNS, +0.03% team‑manager‑prompt‑catch, +0.03% todos‑todo_write, +0.00% ast_query‑class‑parent, +0.00% formatSummary-errors, +0.00% dep_tree-external-package, +0.00% todos-getNextIds, +0.49% cycle30 extension pure+docs). Target: ≥80% branches.
- Key improvements needed: Immediate priority is to cover autonomous engine (125 branches, 0%), quality-gate (74, 0%), task-discovery (21, 0%). Also address remaining high‑gain files: `todos-tool.ts` (~43), `team-manager.ts` (~28), `dependency_tree.ts` (~34), `ast_query.ts` (~35), `call_graph.ts` (~22). Additionally fix ESLint `any` warnings and default-case.

## Upcoming Refactors
- **autonomous-engine/extension.ts**: Highest priority (125 branches, 0%). Plan: mock dependencies (fs, child_process, pi APIs) and test state management, interval scheduling, agent hooks, task triggering.
- **autonomous-engine/quality-gate.ts**: Next (74 branches, 0%). Test lint/typecheck/test/coverage/build verification and scoring logic.
- **autonomous-engine/task-discovery.ts**: Then (21 branches, 0%). Test coverage/proactive analysis and task generation.
- **todos-tool.ts**: Already improved to 89% branch coverage; monitor for regressions.
- **team-manager.ts**: Branches ~83.87%; near target but may have uncovered error paths.
- **dependency_tree.ts, analyze.ts, call_graph.ts**: Minor remaining branches (~75-83%); may be addressed after critical gaps closed.
- **TypeScript strictness**: Gradually replace `any` types in `logger.ts`, `runtime-context.ts`, and others.

## Infrastructure Evolution
- None in this cycle; focused on code quality.
- Consider enabling stricter ESLint rules (no implicit any) in next phase.

## Debt Reduction Plan
- COVERAGE: Raise branch coverage to 80% within 2-3 iterations (target 5% gain per iteration).
- DEBT: Reduce ESLint `any` warnings by 50% (from ~15 to ~8) in the next iteration.
