import type { TaskQueueItem } from "../types.js";
import { DEFAULT_CONFIG } from "../types.js";

/**
 * Determine if discovery should run based on interval.
 */
export function shouldRunDiscovery(
  state: { lastDiscoveryTime: number; config: { discoveryIntervalMs: number } },
  now: number
): boolean {
  if (!state.lastDiscoveryTime) return true;
  const elapsed = now - state.lastDiscoveryTime;
  return elapsed >= state.config.discoveryIntervalMs;
}

/**
 * Compute remaining time before next discovery (for logging).
 */
export function getRemainingTime(
  state: { lastDiscoveryTime: number; config: { discoveryIntervalMs: number } },
  now: number
): number {
  if (!state.lastDiscoveryTime) return 0;
  const elapsed = now - state.lastDiscoveryTime;
  const remaining = state.config.discoveryIntervalMs - elapsed;
  return remaining > 0 ? remaining : 0;
}

/**
 * Deduplicate and sort tasks by priority.
 */
const MAX_QUEUE_SIZE = DEFAULT_CONFIG.maxQueueSize;

export function deduplicateAndSort(
  newTasks: TaskQueueItem[],
  existingIds: Set<string>
): TaskQueueItem[] {
  const deduped = newTasks.filter(t => !existingIds.has(t.id)).sort((a, b) => a.priority - b.priority);
  if (deduped.length > MAX_QUEUE_SIZE) {
    return deduped.slice(0, MAX_QUEUE_SIZE);
  }
  return deduped;
}

/**
 * Check if there is no current task and queue is non-empty.
 */
export function hasReadyTask(state: { currentTask: TaskQueueItem | null; taskQueue: TaskQueueItem[] }): boolean {
  return state.currentTask === null && state.taskQueue.length > 0;
}

/**
 * Build discovery skip reason (for logging).
 */
export function buildSkipReason(remainingMs: number): string {
  const seconds = Math.round(remainingMs / 1000);
  return `Discovery skipped (interval not elapsed). Next in ${seconds}s`;
}
