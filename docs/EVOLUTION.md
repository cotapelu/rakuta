# Evolution Roadmap (3-6 months)

> Auto-maintained trajectory based on quality metrics and improvement backlog.

## Current Trajectory

- **Health Score**: ~62 (after 14 cycles)
- **Coverage Trend**: 75.0% statements (target ≥80%)
- **Estimated Cycles to Production-Ready**: ~20-24 batches (assuming ~1.0% avg gain)

## Upcoming Refactors

- **Memory Tool**: Split `registerMemoryTool` (200+ lines) into smaller functions.
- **Registry**: Already good (100% coverage, moderate size).
- **Handoff**: Simple, no action needed.

## Infrastructure Evolution

- **Immediate** (Cycles 10-16):
  - High-priority 0% modules: session-tool, skills-tool, and remaining capability-system plugins.
  - Target: reduce 0-coverage files to <5
  - Refactor file-actions lsAction bug (else-if)
  - Continue splitting large functions (memory-tool, action-tool)
  - Maintain coverage gain (~0.8% per batch expected)
  - Covered: all UI renderers, team-widget, multi-agent core (definition, types), runtime, and child-worker.

- **Short-term** (Month 1-2):
  - Coverage target ≥70% overall
  - Set up coverage threshold enforcement in CI (fail if <70%)
  - Refactor large functions (memory-tool, action-tool)
  - Add missing JSDoc for public APIs (target 80% coverage)

- **Medium-term** (Months 2-3):
  - Coverage ≥80% overall
  - Refactor large functions (>50 lines)
  - Add integration tests for tool interactions

- **Long-term** (Months 4-6):
  - Coverage ≥90%
  - Full observability (metrics, traces)
  - Security audit (STRIDE) and hardening

## Debt Reduction Plan

| Debt Type | Current Count | Target (6mo) | Strategy |
|-----------|--------------|--------------|----------|
| Zero-coverage files | 81 | 0 | Prioritize core modules first |
| Large functions (>50 lines) | 3+ | <5 | Split, extract helpers |
| Coverage <80% | Majority | 0 | Incremental test expansion |
| Documentation Missing | Many | <10% of modules | Add JSDoc, ADRs |

## Quality Gates

- Pre-commit: lint, type-check, test, coverage (new files ≥80%)
- CI: Enforce ≥80% overall (eventually)
- Danger.js: require tests for all new code
- PR: Self-score ≥90 on quality checklist

## Evolution Triggers

- Coverage <70% → focus sprint on tests
- Any function >200 lines → refactor task
- New file added without tests → immediate task

---

*Last updated: 2025-06-30 23:30*
*Next review: After Cycle 2 batch*
