import * as path from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { DEFAULT_CONFIG, type AutonomousEngineConfig, type TaskQueueItem } from '../types.js';

const STATE_FILE = '.pi/autonomous-state.json';

export interface EngineState {
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
  lastCoverage?: { statements: number; branches: number; functions: number; lines: number };
  lastTestTotal?: number;
}

export const defaultState: EngineState = {
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

export function getStatePath(cwd: string): string {
  return path.join(cwd, STATE_FILE);
}

export function loadState(cwd: string): EngineState {
  try {
    const statePath = getStatePath(cwd);
    if (existsSync(statePath)) {
      const raw = readFileSync(statePath, 'utf-8');
      const saved = JSON.parse(raw);
      return { ...defaultState, ...saved, config: { ...DEFAULT_CONFIG, ...saved.config } };
    }
  } catch (error) {
    // Return default state on any error
  }
  return defaultState;
}

export function saveState(cwd: string, state: EngineState): void {
  try {
    const statePath = getStatePath(cwd);
    const dir = path.dirname(statePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(statePath, JSON.stringify(state, null, 2));
  } catch (error) {
    // Ignore save errors
  }
}
