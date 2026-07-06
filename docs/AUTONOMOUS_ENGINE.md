# Autonomous Execution Engine

> Self-driving code improvement system for PiClaw

## Overview

The Autonomous Execution Engine is a built-in extension that enables PiClaw to automatically improve your codebase 24/7 without human intervention. It implements the full GOAL.md protocol:

- **Continuous Discovery**: Scans codebase every 2 hours
- **Quality Gates**: Enforces lint, type-check, test, build standards
- **Task Execution**: Automatically fixes violations and implements improvements
- **Metrics Tracking**: Records all improvements in `docs/AGENT_METRICS.md`
- **Auto-Commit**: Commits changes with conventional commit messages
- **Emergency Brakes**: Stops on high error rates, memory issues, or repeated failures

## Activation

Enable autonomous mode:

```
/autonomous on
```

Check status:

```
/autonomous status
```

View configuration:

```
/autonomous config
```

Disable:

```
/autonomous off
```

## How It Works

### 1. Discovery Cycle (Every 2 Hours)

The engine runs:

1. **Quality Gate Check**
   - Runs `npm run lint`
   - Runs `npm run typecheck`
   - Runs `npm test -- --coverage`
   - Runs `npm run build`
   - Calculates quality score (0-100)

2. **Violation Detection**
   - Parses ESLint errors → creates fix tasks
   - Parses TypeScript errors → creates fix tasks
   - Prioritizes: CRITICAL → HIGH → MEDIUM → LOW

3. **Proactive Analysis** (if no violations)
   - Coverage improvement (target >85%)
   - Complexity audit (cyclomatic ≥8)
   - Security hardening (secrets, TLS, JWT)
   - Performance hunt (O(n²), blocking I/O)
   - Documentation gaps (missing JSDoc)
   - Observability checks (logs, metrics, health)
   - Dependency audit (vulnerable/outdated)
   - Code smell scan (duplication, magic numbers)

4. **Task Queue**: Up to 30 tasks, sorted by priority

### 2. Execution Phase

After each agent turn (when the LLM finishes), the engine:

1. Checks if there's a current task to verify
2. Verifies the fix:
   - Quality gate score ≥90 (configurable)
   - Coverage threshold ≥80% (configurable)
   - All tests pass
   - Build succeeds
3. If verification passes:
   - Logs metrics to `docs/AGENT_METRICS.md`
   - Auto-commits changes (if enabled)
   - Removes task from queue
4. If next task exists:
   - Triggers next agent turn with task prompt
   - LLM executes the task following GOAL.md protocol

### 3. Task Prompt Format

Tasks are delivered to the LLM with exact instructions:

- Read and understand the issue
- Write tests FIRST (red-green-refactor)
- Implement the fix
- Verify quality gates before marking complete
- Output structured result with markers:

```
===TASK_RESULT_START===
ACTION: <brief description>
FILES_CHANGED: <comma-separated list>
TESTS_ADDED: <number>
COVERAGE_STATEMENTS: <before>→<after>
COVERAGE_BRANCHES: <before>→<after>
VERIFICATION: All tests pass, quality gate score ≥90
===TASK_RESULT_END===
```

### 4. Metrics Logging

Each task is logged to `docs/AGENT_METRICS.md`:

```markdown
## [2026-07-06 16:30] Cycle 1 - Task: Increase branch coverage
- **Type**: Proactive Improvement
- **Priority**: HIGH
- **Duration**: 15 minutes
- **Status**: ✅ Success
- **Test Delta**: +5 tests
- **Coverage Delta**: Statements +2.3% (84%→86%), Branches +1.8% (78%→80%)
```

### 5. Auto-Commit

When `autoCommit` is enabled (default: true), the engine:

1. Stages all changed files (`git add`)
2. Commits with message: `feat(autonomous): ACTION [MODULE]\n\nTask ID: ...`
3. Optionally pushes if `autoPush` is configured

### 6. Emergency Brakes

If any condition triggers within a 10-minute window:

- Error rate >5%
- Memory usage >90%
- Consecutive task failures >5
- Disk space <10%

The engine automatically stops and logs the reason. Requires manual restart with `/autonomous on`.

## Configuration

Default config (modifiable via `/autonomous config` or by editing `.pi/autonomous-state.json`):

```json
{
  "enabled": true,
  "discoveryIntervalMs": 7200000,  // 2 hours
  "maxTasksPerBatch": 3,
  "maxTaskMinutes": 30,
  "qualityGateThreshold": 90,
  "coverageThreshold": 80,
  "autoCommit": true,
  "autoPush": false,
  "emergencyEnabled": true
}
```

## Files and State

- **State**: `.pi/autonomous-state.json` (persists queue, config, counters)
- **Metrics**: `docs/AGENT_METRICS.md` (auto-updated)
- **Logs**: Console output (logger: `AutonomousEngine`)

## Integration with GOAL.md Protocol

The engine enforces all GOAL.md requirements:

- ✅ Quality Gates (Section 3.1)
- ✅ Anti-Pattern Detection (Section 3.2) - via lint rules
- ✅ Mental Testing (Section 5.6.3) - LLM must verify before completion
- ✅ Systematic Debugging (Section 5.5) - tasks force analysis before fix
- ✅ Code Preservation (Section 5.1) - engine never deletes code, only fixes
- ✅ Continuous Loop (Section 2.2) - discovery every 2h, sleep 5min between
- ✅ Metrics & Evolution (Section 8) - auto-updates AGENT_METRICS.md, AGENT_PROFILE.md, EVOLUTION.md
- ✅ Audit (Section 11) - every task passes quality gate audit before verification

## Usage Workflow

1. **Start PiClaw** with the autonomous extension loaded (automatic)
2. **Enable** with `/autonomous on`
3. **Let it run** - the agent will automatically:
   - Scan for issues every 2 hours
   - Fix violations (security, quality, performance)
   - Add missing tests
   - Improve documentation
   - Update dependencies
   - Log all metrics
4. **Monitor** via `/autonomous status` or check `docs/AGENT_METRICS.md`
5. **Disable** when not needed with `/autonomous off`

## Example Session

```
$ piclaw

[PiClaw] Autonomous Engine extension loaded
[PiClaw] Type /autonomous on to enable

> /autonomous on
✅ Autonomous mode ENABLED

[AutonomousEngine] Discovery Cycle 1 starting...
[AutonomousEngine] Found 3 violations, added 5 proactive tasks
[AutonomousEngine] Triggering task: Replace 'any' with specific type
[Agent] Working on autonomous task...
[Agent] ===TASK_RESULT_START===
[Agent] ACTION: Replaced any with unknown in validateInput
[Agent] FILES_CHANGED: src/server.ts
[Agent] TESTS_ADDED: 2
[Agent] COVERAGE_STATEMENTS: 84%→86%
[Agent] COVERAGE_BRANCHES: 78%→80%
[Agent] VERIFICATION: All tests pass, quality gate score 92
[Agent] ===TASK_RESULT_END===
[AutonomousEngine] Task verified successfully
[AutonomousEngine] Committed: feat(autonomous): Replace 'any' with specific type
[AutonomousEngine] Queue size: 7, continuing...
```

## Advanced: Custom Task Discovery

To add custom discovery rules, extend `TaskDiscovery` class in your own extension:

```ts
import { TaskDiscovery } from '@earendil-works/pi-coding-agent/extensions/autonomous-engine/task-discovery';

class MyDiscovery extends TaskDiscovery {
  async discoverTasks(): Promise<TaskQueueItem[]> {
    const tasks = await super.discoverTasks();
    // Add custom tasks
    tasks.push({
      id: 'custom-' + Date.now(),
      type: 'PROACTIVE_IMPROVEMENT',
      priority: 2,
      improvementType: ImprovementType.SECURITY,
      module: 'my-module',
      action: 'Add rate limiting',
      expectedImpact: 'Prevent API abuse',
      estimatedMinutes: 45,
      createdAt: new Date(),
      attempts: 0,
    });
    return tasks;
  }
}
```

## Troubleshooting

### Engine not triggering tasks

- Check if enabled: `/autonomous status`
- Verify state file exists: `.pi/autonomous-state.json`
- Ensure LLM follows task prompt format exactly

### Tasks failing verification

- Quality gate score too low → fix core issues first
- Coverage dropping → add tests before implementation
- Build failures → fix TypeScript errors

### High memory usage

- Engine automatically stops if memory >90%
- Reduce `maxTasksPerBatch` in config
- Increase discovery interval (default 2h is usually fine)

### Want more aggressive improvement?

- Set lower thresholds: `qualityGateThreshold: 85`, `coverageThreshold: 75`
- Increase `maxTasksPerBatch` to 5
- Disable emergency brakes: `emergencyEnabled: false` (not recommended)

## Architecture

```
AutonomousEngine (extension.ts)
├── State Management (file-based)
│   └── .pi/autonomous-state.json
├── Discovery Scheduler
│   └── setInterval → runDiscoveryCycle()
├── QualityGate
│   ├── lint
│   ├── typecheck
│   ├── test + coverage
│   └── build
├── TaskDiscovery
│   ├── Violations → tasks
│   ├── Proactive analysis
│   └── Task deduplication & sorting
├── Verification
│   ├── Quality gate re-run
│   ├── Coverage check
│   └── Test pass check
└── Commit Hook
    ├── git add
    ├── git commit
    └── git push (optional)
```

## Performance Impact

- Discovery: ~30-60 seconds (runs in background)
- Quality gate: ~10-30 seconds (parallel)
- Verification: ~10-20 seconds after each task
- Memory: ~50-100 MB overhead
- CPU: Minimal when idle, spikes during discovery

## Security Considerations

- Engine runs with same privileges as PiClaw (can modify any file)
- Auto-commit uses `git` CLI (respects your git config)
- No external network calls (uses local npm, git)
- State file contains queue (no secrets)
- Commits use your git identity

## Future Enhancements

- Performance benchmarking integration
- Automated dependency upgrades with compatibility testing
- Predictive failure prevention (ML-based)
- Distributed team coordination for large repos
- Customizable improvement strategies per project

## Support

Report issues: https://github.com/mariozechner/pi-coding-agent/issues

Reference: GOAL.md (Section 6 - Autonomous Execution Engine)
