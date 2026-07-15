# Agent Weakness Profile

*As of: 2026-07-15 (After autonomous engine removal)*

## Current Status
- **Overall branch coverage**: 80.49% ✅ (target ≥80% achieved)
- **Test pass rate**: 100% (1646/1646)
- **ESLint warnings**: 0 (only built-in-tools.test.ts file ignored)
- **Typecheck**: Clean

## High-Priority Gaps (Low Coverage Modules)

### Critical: team-widget.ts (19.23% branch coverage)
- **Location**: `src/addon/extensions/team/team-widget.ts`
- **Uncovered**: ~80% of branches
- **Impact**: Core UI component for team collaboration
- **Action**: Add comprehensive unit tests covering:
  - Widget lifecycle (create, update, destroy)
  - State management (enabled/disabled toggling)
  - Interval handling (setInterval, clearInterval)
  - UI rendering with different team states
  - Error paths (missing state, invalid context)

### Medium: dependency_tree.ts (75.88% branch coverage)
- **Location**: `src/addon/extensions/capability-system/plugins/codebase/capabilities/dependency_tree.ts`
- **Uncovered**: ~34 branches
- **Gaps**: File resolution edge cases, cycle detection variations, external package handling
- **Action**: Add targeted tests for:
  - Extension fallback (.js when .ts missing)
  - Multiple independent cycles detection
  - Namespace re-exports
  - Error handling for unparsable files

### Medium: analyze_ast.ts (76.8% branch coverage)
- **Location**: `src/addon/extensions/capability-system/plugins/codebase/capabilities/analyze_ast.ts`
- **Uncovered**: ~29 branches
- **Gaps**: Edge import patterns, symbol resolution for all declaration types
- **Action**: Add tests for:
  - Various import clause forms (namespace, default, mixed)
  - Export types (re-export, export * as)
  - Interface, type, enum handling
  - Parse errors and file not found

### Low: todos-tool.ts (89.02% branch coverage) ✅ Good
- Already well-covered; minor remaining gaps in complex error paths

### Low: team-manager.ts (83.87% branch coverage) ✅ Good
- Solid coverage; only minor gaps in agentMonitor interactions

## Strengths
- ✅ Core tools (todos, team, capability-system router) extensively tested
- ✅ Quality gate consistently passes
- ✅ No type errors, clean build
- ✅ Codebase stable and maintainable
- ✅ Autonomous engine removed → simpler architecture

## Recommendations (Next Iteration)
1. **Priority 1**: Write comprehensive tests for `team-widget.ts` to bring coverage >70%
2. **Priority 2**: Add targeted tests for `dependency_tree.ts` and `analyze_ast.ts` to reach 80% each
3. **Optional**: Review `team-manager.ts` for any remaining edge cases
4. **Maintain**: Keep 100% test pass rate, monitor coverage after each change

## Notes
- Coverage target of ≥80% has been achieved overall
- Remaining work focuses on specific modules rather than broad sweeps
- Type safety is good; no `any` abuse detected in current linting
- Consider refactoring `team-widget.ts` for better testability if coverage gains stall
