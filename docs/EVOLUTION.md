# Evolution Roadmap (3-6 months)

## Current Trajectory
- Health Score: unknown (baseline pending stable metrics)
- Coverage trend: slow improvement with setbacks (branches +1.38% over twenty‑seven cycles, then -2.65% cycle 28, then +0.49% cycle 30, +1.18% cycle 31, +0.33% cycle 32, +0.05% cycle 33, +0.00% cycle 34, +0.31% cycle 35, +0.16% cycle 36, +0.03% cycle 37, -0.30% cycle 38, +0.11% cycle 39, +0.05% cycle 40). Gain breakdown: +0.32% todos, +0.03% team, +0.00% dep_tree, +0.12% analyze, +0.03% ast_query, +0.06% todos-formatSummary, +0.05% todos+dep_tree edge tests, +0.00% team-manager extra, +0.03% todos-io-error, +0.06% todos-normalize-no-pending, +0.00% todos extra, +0.03% dep_tree+call_graph, +0.06% todos-reconstruct, +0.03% ast_query+call_graph, +0.06% todos-save-error, +0.17% team-manager-runAgentLoop, +0.03% team-manager-registry, +0.06% todos-tool-multiple-ops, +0.00% todos-tool-write-error + ast_query extra, +0.21% team-manager‑MAX_TURNS, +0.03% team‑manager‑prompt‑catch, +0.03% todos‑todo_write, +0.00% ast_query‑class‑parent, +0.00% formatSummary-errors, +0.00% dep_tree-external-package, +0.00% todos-getNextIds, +0.49% cycle30, +1.18% cycle31, +0.33% cycle32, +0.05% cycle33, +0.00% cycle34 (extension.docs-errors), +0.31% cycle35 (subtool-loader expansion), +0.16% cycle36 (ast_query tests), +0.03% cycle37 (analyze_ast tests), -0.30% cycle38 (call_graph, dependency_tree, team-widget tests), +0.11% cycle39 (plugin-loader tests), +0.05% cycle40 (subtool-loader caching), +0.00% cycle41, +0.03% cycle42, +0.00% cycle43, +0.25% cycle44, -0.03% cycle45, +0.00% cycle46, +0.00% cycle47, +0.05% cycle48, -3.63% cycle49 (system audit integration), +0.44% cycle50 (targeted SystemAudit tests), +0.11% cycle51 (SystemAudit helpers + bugfix), +0.22% cycle52 (security patterns & bugfix), +0.43% cycle53 (extension utils), +1.29% cycle54 (capability-system extension), +0.88% cycle55 (quality-gate extra)). Target: ≥80% branches.
- Key improvements needed: Highest‑uncovered modules by absolute branches:
  - autonomous-engine/extension.ts: 90 uncovered (182 total, 50.5% coverage)
  - capability-system/extension.ts: 48 uncovered (130 total, 63.1% coverage)
  - autonomous-engine/quality-gate.ts: 17 uncovered (74 total, 77.0% coverage)
  - capability-system/plugin-loader.ts: 53 uncovered (112 total, 52.7% coverage)
  - system-audit.ts: 120 uncovered (334 total, 64.1% coverage)
  - autonomous-engine/task-discovery.ts: 22 uncovered (58 total, 62.1% coverage)
  - dependency_tree.ts: 34 uncovered (141 total, 75.9%)
  - analyze_ast.ts: 29 uncovered (125 total, 76.8%)
  - ast_query.ts: 28 uncovered (149 total, 81.2%)
  - call_graph.ts: 19 uncovered (155 total, 87.8%)
- Focus on these to reach 80% branch coverage; prioritize those with >50 uncovered branches and low coverage percentages.
- Additionally fix ESLint `any` warnings and default-case.

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

## Completed: System Audit Framework (2026-07-09)
- Implemented 10-dimensional SystemAudit per GOAL.md Section 11
- Integrated into autonomous engine verification; replaces basic audit
- Added proactive task generation from critical/high audit findings
- **Next focus**: Increase branch coverage to ≥80% (currently 73.31%); address remaining ESLint `any` warnings.

## Upcoming Refactors
- **system-audit.ts**: Increase test coverage to >90% (currently ~61%)
- **autonomous-engine/extension.ts**: 90 uncovered branches (182 total, 50.5% coverage) – continue testing remaining utility functions and integration paths.
- **capability-system/extension.ts**: 48 uncovered branches (130 total, 63.1% coverage) – continue expanding coverage on remaining branches.
- **autonomous-engine/quality-gate.ts**: 17 uncovered branches (74 total, 77.0% coverage) – continue covering remaining edge cases in runBuild/runTests and classifyType.
- **capability-system/plugin-loader.ts**: 53 uncovered branches (52.7% coverage) – test lifecycle and error handling.
- **autonomous-engine/task-discovery.ts**: 22 uncovered branches (62.1% coverage) – finish coverage of proactive analysis branches.
- **dependency_tree.ts**, **analyze_ast.ts**, **ast_query.ts**, **call_graph.ts**: remaining codebase modules to reach 80%.
- **TypeScript strictness**: Reduce `any` warnings.
