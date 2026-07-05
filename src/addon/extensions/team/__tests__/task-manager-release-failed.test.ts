import { describe, it, expect, beforeEach } from 'vitest';
import { TaskManager } from '../task-manager.js';

describe('TaskManager releaseTask failed status', () => {
  let tm: TaskManager;
  beforeEach(() => {
    tm = new TaskManager();
    tm.initialize(['t1']);
  });

  it('returns false and does not change assignee when task is failed', () => {
    const task = tm.getTaskStatus(0)!;
    task.assignee = 'agent-1';
    task.status = 'failed';
    const released = tm.releaseTask('agent-1', 0);
    expect(released).toBe(false);
    expect(task.status).toBe('failed');
    expect(task.assignee).toBe('agent-1');
  });
});
