# Evolution Roadmap (3-6 months)

## Current Trajectory
- Health Score: unknown (baseline pending stable metrics)
- Coverage trend: slowly improving (branches +0.32% this cycle). Target: ≥80% branches.
- Key improvements needed: branch coverage gap; type safety (`any` warnings); error path tests for high-complexity modules.

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
