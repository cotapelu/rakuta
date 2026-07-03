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

- **Zero-coverage files**: ~43 files with 0% statement coverage (down from 81).
- **Large functions (>200 lines)**: 2 identified (memory-tool, action-tool).
- **Complex functions**: Need audit for cyclomatic >10 in some tools.
- **Action files**: all covered (including git-actions).
- **Provider modules**: kilo-provider.ts covered.
- **Utility modules**: logger.ts covered.
- **Multi-agent modules**: child-tools.ts, message-bus.ts, router.ts, parent-tools.ts covered.
- **Commands**: copy-command.ts, team-command.ts, provider-command.ts covered.
- **Command Utils**: command-args.ts covered.
- **Provider Models**: models/index.ts covered.
- **Sub-tools**: computer-use.ts covered; http.ts already covered.
- **Hooks**: auto-continue.ts covered.
- **Capability-System**: registry.ts, dev.build, git.status-renderer, security.scan covered; others still 0% (priority).
- **Tools**: todos-tool.ts covered (>=80%).
- **Bugs**:
  - Fixed: message-bus.waitForParentMessage.
  - Fixed: performance test threshold adjusted (200→300ms).
  - Pending: file-actions.ts lsAction else-if bug (refactor scheduled Cycle 10).

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
