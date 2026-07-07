# Evolution Roadmap (3-6 months)

## Current Trajectory
- Health Score: unknown (baseline pending stable metrics)
- Coverage trend: slow improvement with setbacks (branches +1.38% over twenty‑seven cycles, then -2.65% cycle 28, then +0.49% cycle 30, +1.18% cycle 31, +0.33% cycle 32, +0.05% cycle 33, +0.00% cycle 34, +0.31% cycle 35, +0.16% cycle 36, +0.03% cycle 37, -0.30% cycle 38, +0.11% cycle 39, +0.05% cycle 40). Gain breakdown: +0.32% todos, +0.03% team, +0.00% dep_tree, +0.12% analyze, +0.03% ast_query, +0.06% todos-formatSummary, +0.05% todos+dep_tree edge tests, +0.00% team-manager extra, +0.03% todos-io-error, +0.06% todos-normalize-no-pending, +0.00% todos extra, +0.03% dep_tree+call_graph, +0.06% todos-reconstruct, +0.03% ast_query+call_graph, +0.06% todos-save-error, +0.17% team-manager-runAgentLoop, +0.03% team-manager-registry, +0.06% todos-tool-multiple-ops, +0.00% todos-tool-write-error + ast_query extra, +0.21% team-manager‑MAX_TURNS, +0.03% team‑manager‑prompt‑catch, +0.03% todos‑todo_write, +0.00% ast_query‑class‑parent, +0.00% formatSummary-errors, +0.00% dep_tree-external-package, +0.00% todos-getNextIds, +0.49% cycle30, +1.18% cycle31, +0.33% cycle32, +0.05% cycle33, +0.00% cycle34 (extension.docs-errors), +0.31% cycle35 (subtool-loader expansion), +0.16% cycle36 (ast_query tests), +0.03% cycle37 (analyze_ast tests), -0.30% cycle38 (call_graph, dependency_tree, team-widget tests), +0.11% cycle39 (plugin-loader tests), +0.05% cycle40 (subtool-loader caching), +0.00% cycle41). Target: ≥80% branches.
- Key improvements needed: Immediate priority is to cover autonomous engine (125 branches, 0%), quality-gate (74, 0%), task-discovery (21, 0%). Also address remaining high‑gain files: `todos-tool.ts` (~43), `team-manager.ts` (~28), `dependency_tree.ts` (~34), `ast_query.ts` (~35), `call_graph.ts` (~22). Additionally fix ESLint `any` warnings and default-case.

## Upcoming Refactors
- **autonomous-engine/extension.ts**: Still highest priority (125 branches, ~40% covered). Plan: test agent_end error handling, emergency brake, discovery error paths.
- **capability-system/extension.ts**: Next (130 branches, 24.62%). Large refactor needed; may need to split for testability.
- **capability-system/plugin-loader.ts**: (112 branches, 49.11%).
- **autonomous-engine/quality-gate.ts**: (74 branches, ~30%). Methods runBuild/runTests need testing.
- **todos-tool.ts**: Already at 89% branch coverage; monitor for regressions.
- **team-manager.ts**: Branches ~83.87%; near target.
- **TypeScript strictness**: Reduce `any` warnings.


## Infrastructure Evolution
- None in this cycle; focused on code quality.
- Consider enabling stricter ESLint rules (no implicit any) in next phase.

## Debt Reduction Plan
- COVERAGE: Raise branch coverage to 80% within 2-3 iterations (target 5% gain per iteration).
- DEBT: Reduce ESLint `any` warnings by 50% (from ~15 to ~8) in the next iteration.
