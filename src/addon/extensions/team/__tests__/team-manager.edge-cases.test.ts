import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentTeam } from '../team-manager.js';

async function initTeam(team: AgentTeam, tasks: string[]) {
  await team.initialize(tasks);
}

describe('AgentTeam edge cases', () => {
  let team: AgentTeam;

  beforeEach(() => {
    team = new AgentTeam();
    team.id = 'test-team';
  });

  afterEach(async () => {
    await team.dispose();
  });

  describe('claimTask', () => {
    it('returns null when no pending tasks', async () => {
      await initTeam(team, ['t1']);
      const idx1 = await team.claimTask('agent-1');
      expect(idx1).toBe(0);
      // No pending tasks left
      const idx2 = await team.claimTask('agent-2');
      expect(idx2).toBeNull();
    });
  });

  describe('releaseTask', () => {
    it('returns false and does not change assignment if task not owned by agent', async () => {
      await initTeam(team, ['t1']);
      const idx = await team.claimTask('agent-1');
      expect(idx).toBe(0);
      const released = await team.releaseTask('agent-2', idx);
      expect(released).toBe(false);
      // Task should still be assigned to agent-1
      const status = await team.getTeamStatus();
      const task = status.tasks[idx];
      expect(task.assignee).toBe('agent-1');
      expect(task.status).toBe('in_progress');
    });
  });

  describe('handleAgentFailure', () => {
    it('does nothing if task not assigned to the given agent', async () => {
      await initTeam(team, ['t1']);
      const idx = await team.claimTask('agent-1');
      expect(idx).toBe(0);
      // agent-2 reports failure for task owned by agent-1
      await team.handleAgentFailure('agent-2', idx, new Error('oops'));
      // Task should remain assigned to agent-1 and still in_progress
      const status = await team.getTeamStatus();
      const task = status.tasks[idx];
      expect(task.assignee).toBe('agent-1');
      expect(task.status).toBe('in_progress');
    });
  });

  describe('getMyCurrentTask', () => {
    it('returns null for unknown agent', async () => {
      const idx = await team.getMyCurrentTask('unknown');
      expect(idx).toBeNull();
    });
  });

  describe('concurrency control', () => {
    it('serializes concurrent claimTask calls, returning distinct indices', async () => {
      await initTeam(team, ['t1', 't2']);
      const p1 = team.claimTask('agent-1');
      const p2 = team.claimTask('agent-2');
      const [idx1, idx2] = await Promise.all([p1, p2]);
      expect(idx1 !== null && idx2 !== null).toBe(true);
      expect(idx1 !== idx2).toBe(true);
      expect([0, 1]).toContain(idx1);
      expect([0, 1]).toContain(idx2);
      // Verify agent statuses updated
      expect(team.agentStatuses.get('agent-1')?.currentTaskIndex).toBe(idx1);
      expect(team.agentStatuses.get('agent-2')?.currentTaskIndex).toBe(idx2);
    });
  });
});
