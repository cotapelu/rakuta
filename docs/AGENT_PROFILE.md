# Agent Weakness Profile

> Auto-updated after each iteration. Identifies patterns in failures, fragile modules, and recurring debt.

## Fragile Modules

*Identified modules with high failure rates or complexity issues.*

- **None detected** - First batch successful.

## Error-Prone Stacks

- **None detected**.

## High-Cost Changes

- **memory-tool.ts**: Large function (registerMemoryTool ~200 lines) - refactor needed.
- **action-tool.ts**: Long createActionTool function with complex type handling; consider extracting example builder.

## Identified Bugs

- **file-actions.ts**: lsAction uses `else if` for recursive flag, preventing both `all` and `recursive` from being active together. Should be two independent `if` statements.

## Recurring Debt

- **Zero-coverage files**: ~60 files with 0% statement coverage (down from 81).
- **Large functions (>200 lines)**: 2 identified (memory-tool, action-tool).
- **Complex functions**: Need audit for cyclomatic >10 in some tools.
- **Action files** (covered ≥80%): file-actions, process-actions, docker-actions, system-actions, network-actions, package-actions, search-actions, git-actions.
- **Provider modules**: kilo-provider.ts now covered.
- **Utility modules**: logger.ts now covered.
- **Bugs**: file-actions.ts lsAction else-if bug still pending refactor.
- **Bug**: file-actions.ts lsAction prevents combining all+recursive (else-if); scheduled for refactor in Cycle 7.

## Common Testing Gaps

- Many extension files lack tests.
- Integration tests limited.

## Performance Bottlenecks (Historical)

- *None yet*

## Security Blind Spots

- *None observed*

## Concurrency Issues

- Mutex in memory-tool properly tested.

---

*Last updated: 2025-06-30 23:30*
*Next update: After next batch*
