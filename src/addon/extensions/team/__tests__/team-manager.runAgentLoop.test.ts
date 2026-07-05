import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentTeam } from '../team-manager.js';
import { createMockRuntime } from './test-utils.js';

describe('AgentTeam runAgentLoop completion', () => {
  let team: AgentTeam;
  let parentRuntime: any;

  beforeEach(async () => {
    team = new AgentTeam();
    team.id = 'test-loop';
    parentRuntime = createMockRuntime();
    parentRuntime.session.sessionId = 'parent-session-123';
    // Ensure required services exist
    parentRuntime.services.agentDir = '/tmp/agent';
    team.registerRuntime(parentRuntime, 'parent');
    // Register an agent role
    const agentRuntime = createMockRuntime();
    team.registerRuntime(agentRuntime, 'agent-1');
  });

  afterEach(async () => {
    await team.dispose();
  });

  it('exits loop when all tasks are already completed', async () => {
    await team.initialize(['task1']);
    // Mark the only task as completed so total == completed
    team.taskManager.reportResult(0, 'done');
    // Start agent loops
    team.startAgentLoops();
    // Wait for the child loop promises to settle
    await Promise.all(team.childPromises);
    // Agent should remain idle
    expect(team.agentStatuses.get('agent-1')?.status).toBe('idle');
  });
});
