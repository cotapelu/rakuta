# Agent Weakness Profile

*As of: 2026-07-15*

## Fragile Modules
- `src/addon/extensions/tools/todos-tool.ts`: Branch coverage ~75% (86 uncovered); need more edge case tests for error paths and complex operations.
- `src/addon/extensions/team/team-manager.ts`: Branch coverage ~83% (still has gaps in agent lifecycle and error handling).
- `src/addon/extensions/capability-system/plugins/codebase/capabilities/dependency_tree.ts`: Branches ~76%; file resolution and cycle detection branches need more coverage.
- `src/addon/addon/logger.ts` & `src/addon/runtime-context.ts`: Multiple `any` type usages (ESLint warnings), reduce type safety.
- `src/addon/extensions/capability-system/plugins/codebase/capabilities/analyze.ts`: Branches ~76%; need more edge import patterns and error paths.
- `src/addon/extensions/capability-system/plugins/codebase/capabilities/ast_query.ts`: Branches ~77%; missing some handler edge cases.

## Error-Prone Stacks
- TypeScript: Overuse of `any` in internal modules reduces type safety and may hide bugs.
- Stringified parameter normalization: Complex code paths in `normalizeParams` prone to edge cases.

## High-Cost Changes
- Coverage improvement: Need targeted tests to raise branch coverage to ≥80%; moderate effort per file.
- ESLint any fixes: Requires careful typing review across multiple files; medium effort.

## Recurring Debt
- TEST_COVERAGE: Branches below target (78% vs 80% required).
- CODE_QUALITY: ~15 ESLint warnings about `any` and `default-case`.

## Current Weaknesses (2026-07-15)
- **Overall branch coverage**: ~78% (below 80% target)
- **High-uncovered modules** (by uncovered branches):
  - `todos-tool`: ~75% coverage, ~86 uncovered branches
  - `team-manager`: ~83% coverage, remaining gaps in agentMonitor and setupChildRuntimes
  - `dependency_tree.ts`: ~76% coverage, ~34 uncovered
  - `analyze_ast.ts`: ~77% coverage, ~29 uncovered
  - `ast_query.ts`: ~81% coverage, ~28 uncovered
  - `call_graph.ts`: ~88% coverage, ~19 uncovered
- **ESLint warnings**: ~15 `any` and default-case issues to address.

## Focus Areas
- Increase coverage for `todos-tool` and `team-manager`
- Address remaining gaps in `capability-system/extension.ts` and `plugin-loader.ts`
- Reduce ESLint `any` warnings and default-case issues

## Summary
All tests pass: 188 files, 1646+ tests.
The codebase is stable and maintainable after removal of autonomous engine. Remaining challenges are practical test coverage improvements and type safety refinements.
