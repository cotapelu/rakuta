# Agent Weakness Profile

## Fragile Modules
- `src/addon/extensions/tools/todos-tool.ts`: Branch coverage 75.74%, missing branches in `normalizeParams` and error handling; requires additional tests.
- `src/addon/extensions/team/team-manager.ts`: Branch coverage 72%, high gap; needs error path and edge case tests.
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

