# Evolution Roadmap (3-6 months)

## Current Trajectory
- Health Score: unknown (baseline pending stable metrics)
- Coverage trend: slow improvement (branches +1.14% over twenty cycles: +0.32% todos, +0.03% team, +0.00% dep_tree, +0.12% analyze, +0.03% ast_query, +0.06% todos-formatSummary, +0.05% todos+dep_tree edge tests, +0.00% team-manager extra, +0.03% todos-io-error, +0.06% todos-normalize-no-pending, +0.00% todos extra, +0.03% dep_tree+call_graph, +0.06% todos-reconstruct, +0.03% ast_query+call_graph, +0.06% todos-save-error, +0.17% team-manager-runAgentLoop, +0.03% team-manager-registry, +0.06% todos-tool-multiple-ops, +0.00% todos-tool-write-error + ast_query extra). Target: ≥80% branches.
- Key improvements needed: continue branch coverage focus; next high‑gain files: `todos-tool.ts` (~44), `team-manager.ts` (~35), `dependency_tree.ts` (~34), `ast_query.ts` (~35), `call_graph.ts` (~22). Also address ESLint `any` warnings and default-case.

## Upcoming Refactors
- **todos-tool.ts**: Already improved normalizeParams; address remaining branches (if any) after other files.
- **team-manager.ts**: Next high-impact coverage target (branches 72%). Plan: add error path tests for operations, verify normal and edge cases.
- **dependency_tree.ts, analyze.ts, call_graph.ts**: Follow-up coverage improvements (~76-79% branches).
- **TypeScript strictness**: Gradually replace `any` types in `logger.ts`, `runtime-context.ts`, and others.

## Infrastructure Evolution
- None in this cycle; focused on code quality.
- Consider enabling stricter ESLint rules (no implicit any) in next phase.

## Debt Reduction Plan
- COVERAGE: Raise branch coverage to 80% within 2-3 iterations (target 5% gain per iteration).
- DEBT: Reduce ESLint `any` warnings by 50% (from ~15 to ~8) in the next iteration.
