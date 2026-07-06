import { createLogger } from "../utils/logger.js";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { QualityGate } from "./quality-gate.js";
import { TaskDiscovery } from "./task-discovery.js";
import { DEFAULT_CONFIG, type AutonomousEngineConfig, type TaskQueueItem, type ImprovementType } from "./types.js";
import * as path from "node:path";
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

type IntervalHandle = ReturnType<typeof setInterval>;

const execFileAsync = promisify(execFile);
const logger = createLogger('AutonomousEngine');

const STATE_FILE = '.pi/autonomous-state.json';
const METRICS_FILE = 'docs/AGENT_METRICS.md';
const PROFILE_FILE = 'docs/AGENT_PROFILE.md';
const EVOLUTION_FILE = 'docs/EVOLUTION.md';
const PROJECT_STATE_FILE = 'docs/PROJECT_STATE.md';

interface EngineState {
  config: AutonomousEngineConfig;
  taskQueue: TaskQueueItem[];
  isRunning: boolean;
  cycleCount: number;
  tasksCompleted: number;
  tasksFailed: number;
  currentTask: TaskQueueItem | null;
  lastDiscoveryTime: number;
  consecutiveFailures: number;
  lastGitCommit: string | null;
}

interface ProjectState {
  lastUpdate: string;
  tasksCompleted: CompletedTask[];
  recentFailures: FailureRecord[];
}

interface CompletedTask {
  id: string;
  action: string;
  module: string;
  cycle: number;
  timestamp: string;
  success: boolean;
  coverageDelta: { statements: number; branches: number } | null;
}

interface FailureRecord {
  taskId: string;
  action: string;
  cycle: number;
  timestamp: string;
}

interface AgentProfile {
  weaknesses: WeaknessRecord[];
  fragileModules: any[];
  errorProneStacks: any[];
  highCostChanges: any[];
}

interface WeaknessRecord {
  taskId: string;
  module: string;
  action: string;
  reason: string;
  timestamp: string;
}

interface EvolutionDoc {
  lastUpdate: string;
  trajectory: TrajectoryChange[];
  upcoming: any[];
}

interface TrajectoryChange {
  cycle: number;
  task: string;
  module: string;
  impact: string;
  timestamp: string;
}

const defaultState: EngineState = {
  config: DEFAULT_CONFIG,
  taskQueue: [],
  isRunning: false,
  cycleCount: 0,
  tasksCompleted: 0,
  tasksFailed: 0,
  currentTask: null,
  lastDiscoveryTime: 0,
  consecutiveFailures: 0,
  lastGitCommit: null,
};

function getStatePath(cwd: string): string {
  return path.join(cwd, STATE_FILE);
}

function loadState(cwd: string): EngineState {
  try {
    const statePath = getStatePath(cwd);
    if (existsSync(statePath)) {
      const raw = readFileSync(statePath, 'utf-8');
      const saved = JSON.parse(raw);
      return { ...defaultState, ...saved, config: { ...DEFAULT_CONFIG, ...saved.config } };
    }
  } catch (error) {
    logger.error('Failed to load state', { error });
  }
  return defaultState;
}

function saveState(cwd: string, state: EngineState): void {
  try {
    const statePath = getStatePath(cwd);
    const dir = path.dirname(statePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(statePath, JSON.stringify(state, null, 2));
  } catch (error) {
    logger.error('Failed to save state', { error });
  }
}

function buildTaskPrompt(task: TaskQueueItem, config: AutonomousEngineConfig): string {
  return `# Autonomous Task Execution (AUTO-CONTINUE v2.1)

You are the JF Autonomous Agent executing a single task. Follow the GOAL.md protocol strictly.

## Task Details
- ID: ${task.id}
- Type: ${task.type}
- Priority: ${task.priority} (1=CRITICAL, 2=HIGH, 3=MEDIUM, 4=LOW)
- Module: ${task.module}
- Action: ${task.action}
- Expected Impact: ${task.expectedImpact}
- Estimated Duration: ${task.estimatedMinutes} minutes

## Workflow (MANDATORY)
Follow this exact sequence:

1. **ANALYZE**: Read all related files. Understand full context.
2. **CLARIFY**: Identify any ambiguities. Document assumptions.
3. **PLAN**: Create step-by-step plan (max 5 steps).
4. **TEST(FAIL)**: Write failing tests first (red-green-refactor). Include:
   - Valid inputs (3+ examples)
   - Invalid inputs (type, range, format errors)
   - Edge cases (null, empty, boundaries, malformed)
   - Error paths (exceptions, timeouts, failures)
5. **IMPLEMENT**: Make tests pass. Minimal code.
6. **REFACTOR**: Clean up, extract helpers, improve naming.
7. **OPTIMIZE**: Performance, readability, maintainability.
8. **VERIFY**: Checklist below.

## Production Checklist (MANDATORY - ALL MUST PASS)
Before marking complete, verify:

- [ ] All functions mental-tested (valid/invalid/edge/error)
- [ ] All APIs contract verified (request/response schema)
- [ ] All flows UI→DB AND DB→UI (BOTH directions)
- [ ] All edge cases covered (null, empty, boundary, malformed)
- [ ] All error paths handled (exceptions, timeouts, failures)
- [ ] Security vulnerabilities none (injection, auth bypass, XSS, CSRF, SQLi)
- [ ] Performance acceptable (O(n) not O(n²), no memory leaks, no blocking I/O)
- [ ] Industry standards met (SOLID, DRY, KISS)
- [ ] Documentation updated (JSDoc, README, ADRs if needed)
- [ ] Missing code = written (not skipped)
- [ ] Quality Gate score ≥${config.qualityGateThreshold}
- [ ] Coverage maintained ≥${config.coverageThreshold}% (all metrics)
- [ ] All tests pass (0 failures)
- [ ] Build succeeds

## Output Format (EXACT)
After completing the task, output structured summary:

===TASK_RESULT_START===
ACTION: <brief description of action taken>
FILES_CHANGED: <comma-separated file paths>
TESTS_ADDED: <number of test files added/modified>
COVERAGE_STATEMENTS: <percentage before>→<percentage after>
COVERAGE_BRANCHES: <percentage before>→<percentage after>
VERIFICATION: Quality Gate score ≥${config.qualityGateThreshold}, coverage ≥${config.coverageThreshold}%, all tests pass, build succeeds
RISK: <Low|Medium|High> (assess change risk)
COST: <estimated hours> (engineering effort)
===TASK_RESULT_END===

If you cannot complete the task:

===TASK_RESULT_START===
ACTION: <any steps taken>
FAILURE_REASON: <detailed explanation of what prevented completion>
RECOMMENDATION: <what is needed to proceed>
RISK: N/A
COST: N/A
===TASK_RESULT_END===

Important: Your response will be parsed automatically. No extra commentary outside markers.
`;
}

async function runGitCommand(cwd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, { cwd });
    return { stdout, stderr };
  } catch (error: any) {
    return { stdout: error.stdout || '', stderr: error.stderr || String(error) };
  }
}

async function autoCommit(cwd: string, task: TaskQueueItem, state: EngineState): Promise<void> {
  try {
    // Check git status
    const { stdout } = await runGitCommand(cwd, ['status', '--porcelain']);
    const files = stdout.split('\n').filter(line => line.trim()).map(line => line.slice(3).trim());

    if (files.length === 0) {
      logger.warn('No files to commit');
      return;
    }

    // Stage all changes
    await runGitCommand(cwd, ['add', ...files]);

    const message = `feat(autonomous): ${task.action} [${task.module}]\n\n` +
      `Task ID: ${task.id}\n` +
      `Type: ${task.type}\n` +
      `Priority: ${task.priority}\n` +
      `Cycle: ${state.cycleCount}\n`;

    await runGitCommand(cwd, ['commit', '-m', message]);
    state.lastGitCommit = `Cycle ${state.cycleCount}: ${task.action}`;

    logger.log(`Committed ${files.length} files`);

    // Auto-push if configured
    if (state.config.autoPush) {
      await runGitCommand(cwd, ['push']);
      logger.log('Pushed to remote');
    }
  } catch (error) {
    logger.error('Auto-commit failed', { error });
  }
}

async function updateProjectState(cwd: string, state: EngineState, task: TaskQueueItem, success: boolean, coverage: { statements: number; branches: number } | null): Promise<void> {
  try {
    const projectStatePath = path.join(cwd, PROJECT_STATE_FILE);
    const now = new Date().toISOString();

    let projectState: ProjectState = { lastUpdate: now, tasksCompleted: [], recentFailures: [] };
    if (existsSync(projectStatePath)) {
      try {
        const loaded = JSON.parse(readFileSync(projectStatePath, 'utf-8'));
        projectState = { lastUpdate: loaded.lastUpdate || now, tasksCompleted: loaded.tasksCompleted || [], recentFailures: loaded.recentFailures || [] };
      } catch {
        // ignore parse errors, start fresh
      }
    }

    // Add completed task
    projectState.lastUpdate = now;
    projectState.tasksCompleted.unshift({
      id: task.id,
      action: task.action,
      module: task.module,
      cycle: state.cycleCount,
      timestamp: now,
      success,
      coverageDelta: coverage,
    });

    // Keep only last 100 entries
    if (projectState.tasksCompleted.length > 100) {
      projectState.tasksCompleted = projectState.tasksCompleted.slice(0, 100);
    }

    // Update failures
    if (!success) {
      projectState.recentFailures.unshift({
        taskId: task.id,
        action: task.action,
        cycle: state.cycleCount,
        timestamp: now,
      });
      if (projectState.recentFailures.length > 20) {
        projectState.recentFailures = projectState.recentFailures.slice(0, 20);
      }
    }

    writeFileSync(projectStatePath, JSON.stringify(projectState, null, 2));
  } catch (error) {
    logger.error('Failed to update project state', { error });
  }
}

async function updateEvolutionDocs(cwd: string, state: EngineState, task: TaskQueueItem, success: boolean): Promise<void> {
  try {
    const evolutionPath = path.join(cwd, EVOLUTION_FILE);
    const now = new Date().toISOString();

    let evolution: EvolutionDoc = { lastUpdate: now, trajectory: [], upcoming: [] };
    if (existsSync(evolutionPath)) {
      try {
        const loaded = JSON.parse(readFileSync(evolutionPath, 'utf-8'));
        evolution = { lastUpdate: loaded.lastUpdate || now, trajectory: loaded.trajectory || [], upcoming: loaded.upcoming || [] };
      } catch {
        // ignore
      }
    }

    evolution.lastUpdate = now;

    // Add trajectory change if needed
    if (success && task.type === 'PROACTIVE_IMPROVEMENT') {
      evolution.trajectory.unshift({
        cycle: state.cycleCount,
        task: task.action,
        module: task.module,
        impact: task.expectedImpact,
        timestamp: now,
      });
      if (evolution.trajectory.length > 50) {
        evolution.trajectory = evolution.trajectory.slice(0, 50);
      }
    }

    writeFileSync(evolutionPath, JSON.stringify(evolution, null, 2));
  } catch (error) {
    logger.error('Failed to update evolution docs', { error });
  }
}

async function updateAgentProfile(cwd: string, task: TaskQueueItem, success: boolean, failureReason?: string): Promise<void> {
  try {
    const profilePath = path.join(cwd, PROFILE_FILE);
    let profile = { weaknesses: [] as any[], fragileModules: [], errorProneStacks: [], highCostChanges: [] };

    if (existsSync(profilePath)) {
      try {
        profile = JSON.parse(readFileSync(profilePath, 'utf-8'));
      } catch {
        // ignore
      }
    }

    // Record failure pattern
    if (!success && failureReason) {
      profile.weaknesses.unshift({
        taskId: task.id,
        module: task.module,
        action: task.action,
        reason: failureReason,
        timestamp: new Date().toISOString(),
      });
      if (profile.weaknesses.length > 50) {
        profile.weaknesses = profile.weaknesses.slice(0, 50);
      }
    }

    writeFileSync(profilePath, JSON.stringify(profile, null, 2));
  } catch (error) {
    logger.error('Failed to update agent profile', { error });
  }
}

export default function autonomousEngineExtension(pi: ExtensionAPI) {
  let activeCwd: string | null = null;
  const intervals = new Map<string, IntervalHandle>();

  logger.log('Autonomous Engine extension loading...');

  // Register command
  function startAutonomousInterval(cwd: string) {
    if (activeCwd && activeCwd !== cwd) {
      logger.warn(`Autonomous already active for cwd ${activeCwd}. Cannot start for ${cwd}.`);
      return;
    }
    if (intervals.has(cwd)) return;

    // Run discovery immediately
    runDiscoveryCycle(pi, cwd, loadState(cwd)).catch(err => logger.error('Initial discovery error', err));

    const state = loadState(cwd);
    const timer = setInterval(() => {
      const currentState = loadState(cwd);
      runDiscoveryCycle(pi, cwd, currentState).catch(err => logger.error('Periodic discovery error', err));
    }, state.config.discoveryIntervalMs);

    intervals.set(cwd, timer);
    activeCwd = cwd;
    logger.log(`Autonomous interval started for ${cwd} (every ${state.config.discoveryIntervalMs / 1000}s)`);
  }

  function stopAutonomousInterval(cwd: string) {
    const timer = intervals.get(cwd);
    if (timer) {
      clearInterval(timer);
      intervals.delete(cwd);
      if (activeCwd === cwd) activeCwd = null;
      logger.log(`Autonomous interval stopped for ${cwd}`);
    }
  }

  pi.registerCommand('autonomous', {
    description: 'Control autonomous execution: /autonomous [on|off|status|config]',
    handler: async (args: string, ctx: ExtensionContext) => {
      const parts = args.trim().split(/\s+/);
      const command = parts[0].toLowerCase() || 'status';
      const cwd = ctx.cwd;

      let state = loadState(cwd);

      switch (command) {
        case 'on':
          if (state.isRunning) {
            ctx.ui?.notify('Autonomous mode already running', 'info');
            return;
          }
          state.isRunning = true;
          saveState(cwd, state);
          ctx.ui?.notify('✅ Autonomous mode ENABLED', 'info');
          // Kick off first discovery
          runDiscoveryCycle(pi, cwd, state).catch(console.error);
          break;

        case 'off':
          if (!state.isRunning) {
            ctx.ui?.notify('Autonomous mode already stopped', 'info');
            return;
          }
          state.isRunning = false;
          saveState(cwd, state);
          ctx.ui?.notify('🛑 Autonomous mode DISABLED', 'info');
          break;

        case 'status':
          ctx.ui?.notify(`Autonomous Mode: ${state.isRunning ? '🟢 RUNNING' : '🔴 STOPPED'}\n` +
            `Cycle: ${state.cycleCount}\n` +
            `Queue: ${state.taskQueue.length} tasks\n` +
            `Completed: ${state.tasksCompleted}\n` +
            `Failed: ${state.tasksFailed}\n` +
            `Current Task: ${state.currentTask?.action || 'none'}\n` +
            `Last Commit: ${state.lastGitCommit || 'none'}`, 'info');
          break;

        case 'config':
          const config = state.config;
          ctx.ui?.notify(`Autonomous Config:\n` +
            `Discovery Interval: ${config.discoveryIntervalMs / 1000}s\n` +
            `Max Tasks/Batch: ${config.maxTasksPerBatch}\n` +
            `Quality Gate Threshold: ${config.qualityGateThreshold}\n` +
            `Coverage Threshold: ${config.coverageThreshold}%\n` +
            `Auto-Commit: ${config.autoCommit ? '✅' : '❌'}\n` +
            `Auto-Push: ${config.autoPush ? '✅' : '❌'}\n` +
            `Emergency Monitoring: ${config.emergencyEnabled ? '✅' : '❌'}`, 'info');
          break;

        default:
          ctx.ui?.notify('Usage: /autonomous [on|off|status|config]', 'warning');
      }
    },
  });

  // Hook into agent_end to verify and trigger next task
  pi.on('agent_end', async (event, ctx) => {
    const cwd = ctx.cwd;
    let state = loadState(cwd);

    if (!state.isRunning || state.currentTask === null) {
      return;
    }

    const currentTask = state.currentTask;
    try {
      const qualityGate = new QualityGate(cwd);
      const gateResult = await qualityGate.runGate();

      if (gateResult.passed && gateResult.coverage.allAboveThreshold) {
        logger.log(`Task ${currentTask.id} verified successfully (score: ${gateResult.score})`);
        state.tasksCompleted++;
        state.consecutiveFailures = 0;

        // Log metrics
        await appendMetrics(cwd, state, currentTask, gateResult.coverage, gateResult.testResults);

        // Auto-commit if enabled
        if (state.config.autoCommit) {
          await autoCommit(cwd, currentTask, state);
        }

        // Update tracking files
        await updateProjectState(cwd, state, currentTask, true, gateResult.coverage ? { statements: gateResult.coverage.statements, branches: gateResult.coverage.branches } : null);
        await updateEvolutionDocs(cwd, state, currentTask, true);
      } else {
        logger.warn(`Task ${currentTask.id} verification failed (score: ${gateResult.score}, violations: ${gateResult.violations.length})`);
        state.tasksFailed++;
        state.consecutiveFailures++;

        // Emergency brake: too many consecutive failures
        if (state.consecutiveFailures >= state.config.maxConsecutiveFailures) {
          logger.warn(`Consecutive failures (${state.consecutiveFailures}) exceeded max (${state.config.maxConsecutiveFailures}). Disabling autonomous mode.`);
          state.isRunning = false;
          stopAutonomousInterval(cwd);
        }

        // Record failure in profile
        const reason = `Quality gate failed: score ${gateResult.score}, ${gateResult.violations.length} violations, coverage ${gateResult.coverage.branches}%`;
        await updateAgentProfile(cwd, currentTask, false, reason);
      }

      state.currentTask = null;

      // Determine next action: if tasks queued, trigger next; otherwise discover more
      if (state.taskQueue.length > 0) {
        state.currentTask = state.taskQueue.shift()!;
        saveState(cwd, state);
        const prompt = buildTaskPrompt(state.currentTask, state.config);
        pi.sendMessage(
          {
            customType: 'autonomous-task',
            content: [{ type: 'text', text: prompt }],
            display: false,
          },
          {
            triggerTurn: true,
            deliverAs: 'followUp',
          }
        );
        logger.log(`Triggering next task: ${state.currentTask.action}`);
      } else {
        // Queue empty - run discovery to find more work
        await runDiscoveryCycle(pi, cwd, state);
      }

      // Save state after all updates
      saveState(cwd, state);
    } catch (error) {
      logger.error('Verification error', { error });
      state.tasksFailed++;
      state.consecutiveFailures++;
      state.currentTask = null;
      saveState(cwd, state);
    }
  });

  // Initial discovery on session start
  pi.on('session_start', async (event, ctx) => {
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for stabilization
    const cwd = ctx.cwd;
    let state = loadState(cwd);
    if (state.isRunning) {
      startAutonomousInterval(cwd);
    }
  });
}

async function runDiscoveryCycle(pi: ExtensionAPI, cwd: string, state: EngineState): Promise<void> {
  if (!state.isRunning) return;

  // Check discovery interval (skip if too soon)
  const now = Date.now();
  if (state.lastDiscoveryTime && now - state.lastDiscoveryTime < state.config.discoveryIntervalMs) {
    const remaining = state.config.discoveryIntervalMs - (now - state.lastDiscoveryTime);
    logger.log(`Discovery skipped (interval not elapsed). Next in ${Math.round(remaining/1000)}s`);
    return;
  }

  logger.log(`=== Discovery Cycle ${state.cycleCount + 1} ===`);
  const cycleStart = Date.now();

  try {
    const qualityGate = new QualityGate(cwd);
    const taskDiscovery = new TaskDiscovery(cwd, qualityGate);

    // Discover tasks
    const newTasks = await taskDiscovery.discoverTasks();

    // Deduplicate
    const existingIds = new Set(state.taskQueue.map(t => t.id));
    const uniqueNew = newTasks.filter(t => !existingIds.has(t.id));

    state.taskQueue.push(...uniqueNew);
    state.taskQueue.sort((a, b) => a.priority - b.priority);

    // Limit queue size
    if (state.taskQueue.length > 30) {
      state.taskQueue = state.taskQueue.slice(0, 30);
    }

    state.lastDiscoveryTime = Date.now();
    state.cycleCount++;
    saveState(cwd, state);

    logger.log(`Discovery added ${uniqueNew.length} tasks. Queue size: ${state.taskQueue.length}`);

    // If there's no current task, trigger first one
    if (state.currentTask === null && state.taskQueue.length > 0) {
      state.currentTask = state.taskQueue.shift()!;
      saveState(cwd, state);

      const prompt = buildTaskPrompt(state.currentTask, state.config);
      pi.sendMessage(
        {
          customType: 'autonomous-task',
          content: [{ type: 'text', text: prompt }],
          display: false,
        },
        {
          triggerTurn: true,
          deliverAs: 'followUp',
        }
      );
      logger.log(`Triggering task: ${state.currentTask.action}`);
    }
  } catch (error) {
    logger.error('Discovery cycle failed', { error });
    state.tasksFailed++;
    state.consecutiveFailures++;
    saveState(cwd, state);
  }

  const duration = (Date.now() - cycleStart) / 1000;
  logger.log(`=== Cycle completed in ${duration}s ===`);
}

async function appendMetrics(cwd: string, state: EngineState, task: TaskQueueItem, coverage: { statements: number; branches: number; functions: number; lines: number } | undefined, testResults: { total: number; passed: number; failed: number; skipped: number; durationMs: number }): Promise<void> {
  try {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const log = `\n## [${timestamp}] Cycle ${state.cycleCount} - Task: ${task.action}
- **Type**: ${task.type === 'VIOLATION_FIX' ? 'Violation Fix' : 'Proactive Improvement'}
- **Priority**: ${mapPriority(task.priority)}
- **Duration**: (estimated ${task.estimatedMinutes}m)
- **Status**: ✅ Success
- **Test Delta**: +0 tests
- **Coverage Delta**: Statements ${coverage ? coverage.statements + '%' : 'N/A'}, Branches ${coverage ? coverage.branches + '%' : 'N/A'}
- **Quality Gate Score**: (verified)
- **Tests**: ${testResults.passed}/${testResults.total} passed
- **Build**: (verified)
${task.estimatedMinutes ? `- **Cost**: ~${task.estimatedMinutes}m\n` : ''}`;

    if (existsSync(METRICS_FILE)) {
      appendFileSync(METRICS_FILE, log);
    } else {
      writeFileSync(METRICS_FILE, `# Agent Metrics\n\n> Auto-maintained by autonomous loop per GOAL.md Section 8.2.\n\n## [${timestamp}] Cycle ${state.cycleCount} - Task: ${task.action}\n- **Type**: ${task.type}\n- **Priority**: ${mapPriority(task.priority)}\n- **Status**: ✅ Success\n`);
    }
  } catch (error) {
    logger.error('Failed to log metrics', { error });
  }
}

function mapPriority(p: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  switch (p) {
    case 1: return 'CRITICAL';
    case 2: return 'HIGH';
    case 3: return 'MEDIUM';
    default: return 'LOW';
  }
}
