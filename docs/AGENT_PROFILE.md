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

## Recurring Debt

- **Zero-coverage files**: ~75 files with 0% statement coverage (down from 81).
- **Large functions (>200 lines)**: 2 identified (memory-tool, action-tool).
- **Complex functions**: Need audit for cyclomatic >10 in some tools.

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
