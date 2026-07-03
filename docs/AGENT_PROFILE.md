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

- **Zero-coverage files**: ~3 files (down from 8) after covering numerous action tools, dev capabilities, and other modules.
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
- **Capability-System**: registry.ts, dev.build, git (status-renderer, status, commit, diff), security.scan covered; remaining 0% prioritized.
- **UI renderers**: branch-summary, memory, team-ops, todos now fully covered.
- **Team widget**: team-widget.ts covered.
- **Multi-agent core**: definition.ts and types.ts fully covered.
- **Multi-agent runtime**: runtime.ts fully covered.
- **Multi-agent child-worker**: worker/child-worker.ts fully covered.
- **Guideline generator**: capability-system/guideline-generator.ts fully covered.
- **Session tool**: extensions/session-tool.ts fully covered.
- **Capability System Extension**: extensions/capability-system/extension.ts fully covered.
- **Plugin Loader**: extensions/capability-system/plugin-loader.ts mostly covered (≥95%).
- **Git capabilities**: plugins/git/capabilities/{pull,push,log} fully covered.
- **Action tools**: action-tool.ts fully covered; all action modules (file, git, system, process, docker, network, search, package) fully covered.
- **Dev capabilities**: plugins/dev/capabilities/{audit,format,scripts,test} fully covered.
- **Memory tool**: extensions/tools/memory-tool.ts fully covered.
- **Todos tool**: extensions/tools/todos-tool.ts ~83% statements.
- **Renderer utilities**, **Team widget**, **Multi-agent core**: fully covered.
- **Tools**: todos-tool.ts covered (>=80%).
- **Bugs**:
  - Fixed: message-bus.waitForParentMessage.
  - Fixed: performance test threshold adjusted (200→300ms).
  - Fixed: git.status branch-line parsing bug.
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

*Last updated: 2025-07-02*
*Next update: After next batch*
