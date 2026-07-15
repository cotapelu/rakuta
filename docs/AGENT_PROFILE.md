# Agent Weakness Profile

*As of: 2026-07-15 (After autonomous engine removal)*

## Current Status
- **Overall branch coverage**: 80.81% ✅ (target ≥80% achieved)
- **Test pass rate**: 100% (1656/1656)
- **ESLint warnings**: 0 (only builtin-tools.test.ts file ignored)
- **Typecheck**: Clean

## Coverage Breakdown by Module

| Module | Branch Coverage | Status |
|--------|----------------|--------|
| todos-tool | 89.02% | ✅ Excellent |
| team-manager | 83.87% | ✅ Good |
| call_graph | ~88% | ✅ Excellent |
| dependency_tree | ~78% (improving) | 🟡 Medium |
| analyze_ast | 76.8% | 🟡 Medium |
| team-widget | 57.69% (from 19.23%) | 🟠 Focus needed |

## High-Priority Gaps (Medium Coverage)

### analyze_ast (76.8% branches)
- **Location**: `src/addon/extensions/capability-system/plugins/codebase/capabilities/analyze_ast.ts`
- **Uncovered**: ~29 branches
- **Gaps**: Likely in edge import patterns, symbol resolution for all declaration types, parse errors
- **Action**: Add targeted tests for:
  - Various import clause forms (namespace, default, mixed)
  - Export types (re-export, export * as)
  - Interface, type, enum, const handling
  - File not found and parse errors

### dependency_tree (~78% branches)
- **Location**: `src/addon/extensions/capability-system/plugins/codebase/capabilities/dependency_tree.ts`
- **Uncovered**: ~34 branches
- **Gaps**: File resolution edge cases, cycle detection variations, external package handling
- **Recent improvement**: Added tests for empty files error and external package skipping
- **Action**: Continue adding tests for:
  - Extension fallback (.js when .ts missing)
  - Multiple independent cycles
  - Namespace re-exports
  - Export default handling

### team-widget (57.69% branches)
- **Location**: `src/addon/extensions/team/team-widget.ts`
- **Uncovered**: ~42% remaining
- **Recent improvement**: From 19.23% to 57.69% (added 8 tests)
- **Gaps**: Event handler registrations, state management edge cases
- **Action**: Add more tests for widget lifecycle and error paths

## Strengths
- ✅ Overall coverage ≥80% target achieved
- ✅ Core tools extensively tested (todos, team manager, call graph)
- ✅ Quality gate consistently passes
- ✅ No type errors, clean build
- ✅ Codebase stable and maintainable
- ✅ Autonomous engine removed → simpler architecture

## Recommendations (Next Iteration)
1. **Priority 1**: Continue `analyze_ast` tests to reach 80%+ (target +3%)
2. **Priority 2**: Finalize `dependency_tree` edge case tests
3. **Priority 3**: Optionally enhance `team-widget` to >70%
4. **Maintain**: Keep 100% test pass rate, monitor coverage after each change

## Notes
- Coverage target of ≥80% has been achieved overall
- Remaining work focuses on specific modules to bring all to ≥80%
- Type safety is good; no `any` abuse detected in current linting
- Consider refactoring low-coverage modules for testability if gains stall
