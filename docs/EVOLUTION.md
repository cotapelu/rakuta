# Evolution Roadmap (3-6 months)

## Current Trajectory (2026-07-15)
- **Overall branch coverage**: ~78% (target: ≥80%)
- **Test health**: 100% pass rate (188 files, 1646+ tests)
- **Focus modules** (by uncovered branches):
  - `todos-tool`: ~75% coverage, ~86 uncovered
  - `team-manager`: ~83% coverage, remaining gaps
  - `dependency_tree`: ~76% coverage, ~34 uncovered
  - `analyze_ast`: ~77% coverage, ~29 uncovered
  - `ast_query`: ~81% coverage, ~28 uncovered
- **Code quality**: ~15 ESLint `any` / default-case warnings to address

## Upcoming Refactors (Next 2-3 iterations)
- **Coverage push**: Target +2% to reach 80% by focusing on high-uncovered core modules
- **TypeScript strictness**: Reduce `any` usage by 50% through proper typing
- **Testability improvements**: Consider dependency injection for fs/git to enable more unit tests in integration-heavy code

## Infrastructure Evolution
- None planned; focus on codebase health and test coverage

## Debt Reduction Plan
- **Coverage**: +2% in 2-3 iterations (~0.7% per iteration)
- **ESLint**: Reduce warnings from ~15 to ~8
- **Maintainability**: Keep functions ≤20 lines, complexity ≤10

## Historical Note
The autonomous engine and 10-dimensional audit framework were removed in Cycle 70 to reduce complexity and maintenance debt. The codebase is now simpler and more focused on core tools.

## Conclusion
The system is stable, well-tested, and maintainable. Future evolution will prioritize incremental improvements in test coverage and code quality over ambitious new features.
