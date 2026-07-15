# Evolution Roadmap (3-6 months)

## Current Trajectory
- Health Score: unknown (baseline pending stable metrics)
- Coverage trend: steady ~78% after removal of autonomous engine. Focus now on core modules: todos-tool, team-manager, capability-system.
- Key improvements needed: High‑uncovered modules by absolute branches:
  - todos-tool.ts: ~80 uncovered (≈75% coverage)
  - team-manager.ts: ~30 uncovered (≈83% coverage)
  - capability-system/extension.ts: ~15 uncovered (≈63% coverage)
  - capability-system/plugin-loader.ts: ~20 uncovered (≈68% coverage)
- Additionally fix ESLint `any` warnings and default-case.

## Upcoming Refactors
- **capability-system/extension.ts**: Next (130 branches, 24.62%). Large refactor needed; may need to split for testability.
- **capability-system/plugin-loader.ts**: (112 branches, 49.11%).
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
- **capability-system/extension.ts**: 48 uncovered branches (130 total, 63.1% coverage) – continue expanding coverage on remaining branches.
- **capability-system/plugin-loader.ts**: 36 uncovered branches (112 total, 67.9% coverage) – continue testing watch mode and debouncing.
- **dependency_tree.ts**, **analyze_ast.ts**, **ast_query.ts**, **call_graph.ts**: remaining codebase modules to reach 80%.
- **TypeScript strictness**: Reduce `any` warnings.

## Cycle 58 (2026-07-14) — Coverage Push
- **Health Score**: improving (coverage +0.7%)
- **Key improvements**:
  - Added comprehensive pattern tests for SystemAudit (scalability + observability)
  - Extended autonomous engine utility coverage (assessRisk, appendMetrics, appendTodoCompletion)
  - Removed obsolete test file
- **Upcoming Refactors**:
  - `capability-system/plugin-loader.ts`: Watch mode and debouncing need more tests.
- **Debt Reduction**: Testing debt decreased; target 80% branch coverage within next 2 cycles.

## Cycle 59 (2026-07-14) — Continued Coverage Push
- **Health Score**: stable; coverage +0.12% (77.39% → 77.51%)
- **Key improvements**:
  - Capability System: extensive router tests covering capability resolution, error handling, rendering cache; plugin-loader tests covering load/unload lifecycle, debounce timers, initialization.
  - Quality Gate: unit tests isolated heavy integration; covered classifyType, parseLintViolations, calculateScore edge cases (coverage ~70% → ~85% for quality-gate.ts).
  - System Audit: first security pattern test covering XSS, command injection, JWT none, privilege escalation, PII logging (detects 6+ issues in sample code).
- **Remaining Gaps**:
  - `capability-system/extension.ts`: still ~30 branches uncovered after router tests (mostly cache invalidation, timing display).
- **Next Actions**:
  - Write system-audit scalability and observability pattern tests (target ~30 branches each).
  - Explore simplifying agent_end or using dependency injection to enable unit testing.
  - Cover remaining plugin-loader edge cases (error handling during watch, plugin validation failures).
- **Debt Reduction**: Progress steady; still ~2.5% branch coverage to 80% goal. Expect 2–3 more cycles.

## Cycle 60 (2026-07-14) — Observability & State Coverage
- **Health Score**: stable; coverage +0.1% (77.51% → 77.61%)
- **New coverage areas**:
  - SystemAudit: scalability patterns (O(n²), N+1, blocking I/O, allocations) and observability gaps (logs, metrics, tracing, correlation, health, alerts).
  - AutonomousEngine: state load/save edge cases; assessRisk decision matrix; mapPriority.
- **Remaining high‑uncovered**:
  - `capability-system/extension.ts`: final ~25 branches (timing display, cache invalidation).
- **Next actions**:
  - Write integration test for `runDiscoveryCycle` to cover orchestration logic.
  - Add tests for `autoCommit` and metric update functions with mock Git and file system.
  - Continue systematic dimension coverage for system-audit.
- **Debt Reduction**: Slow progress; still ~2.4% to 80% goal. Need 2–3 more focused cycles.

## Cycle 61–62 (2026-07-14) — Final Push and Diminishing Returns
- **Health Score**: plateauing; coverage ~77.6% after intense effort.
- **What worked**: Pattern-based tests for system-audit (security, scalability, observability, remaining dimensions) delivered good branch coverage per test. Capability-system router and plugin-loader tests covered large swaths of logic with minimal code.
- **Remaining debt**: ~80 branches in `extension.ts`, ~90 in `system-audit.ts`, ~20 in `capability-system/extension.ts`.
- **Recommendation**: Accept ~78% coverage as sufficient given complexity; allocate future effort to refactoring these modules for testability rather than chasing coverage.

## Final Summary (Cycles 57–63)
- **Coverage**: from ~75% → 77.7% (+2.7%)
- **Total new tests**: ~150
- **Most improved modules**:
  - capability-system (router, plugin-loader)
- **Tests removed**: complex/integration tests that provided little coverage ROI (e.g., heavy mocking of fs/git).
- **Recommendation**: Accept ~78% coverage as practical. Future effort should focus on refactoring integration-heavy code for testability (dependency injection, cleaner separation) rather than chasing raw coverage numbers.

**Conclusion**: The autonomous engine is now substantially better tested. The system is stable and the test suite provides good confidence. Further coverage gains will require significant architectural changes.

## Cycle 65 (2026-07-14) — Stabilization
- **Health**: All tests pass; coverage plateau ~78%.
- **Improvements**: Fixed runGitCommand to correctly propagate stderr; added unit tests for state management and doc updates; fixed cache invalidation test.
- **Remaining debt**: ~80 branches in core orchestration remain untested due to integration complexity.
- **Recommendation**: Accept ~78% as practical limit; consider extracting git/fs abstractions if future need for >80%.


## Cycle 66 (2026-07-14) — Edge Cases & Plateau
- **Coverage**: 78.1% (up from 78.0%)
- **Health**: All tests pass; no regressions.
- **Additions**: Edge case tests for malformed JSON, trajectory, and truncation.
- **Plateau**: Further coverage gains diminishing; remaining branches are in deep integration.
- **Path forward**: Consider dependency injection for fs/git to enable unit tests of orchestration.

## Cycle 67 (2026-07-14) — Maintainability Refactor
- **Health Score**: stable; coverage unchanged but code quality improved
- **Key improvements**:
  - Extracted pure helpers for discovery (`shouldRunDiscovery`, `deduplicateAndSort`, `hasReadyTask`, `buildSkipReason`)
  - Extracted pure helpers for metrics (`computeCoverageDelta`, `computeFailureRate`, `computeTestDelta`, `hasRegression`, `buildMetricsLog`)
  - Reduced complexity: `runDiscoveryCycle` from ~12 to ~5; all helpers ≤5.
  - All refactored functions now ≤20 lines, meeting AUTO-CONTINUE targets.
- **Tests added**: 2 test files covering helpers (discovery, metrics) with comprehensive edge cases.
- **Impact**: Improved maintainability and testability without breaking changes. All tests pass (1865/1865). Coverage stable at 78.06%.
- **Next**: Optional refactors remain (system-audit extraction, full DI), but no low‑risk high‑gain items identified.

