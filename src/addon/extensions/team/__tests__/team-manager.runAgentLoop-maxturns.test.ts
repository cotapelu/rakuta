import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentTeam } from '../team-manager.js';
import { createMockRuntime } from './test-utils.js';

describe('AgentTeam runAgentLoop max turns', () => {
  let team: AgentTeam;
  let parentRuntime: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    team = new AgentTeam();
    team.id = 'test-maxturns';
    parentRuntime = createMockRuntime();
    parentRuntime.session.sessionId = 'parent-session-123';
    parentRuntime.services.agentDir = '/tmp/agent';
    team.registerRuntime(parentRuntime, 'parent');
    const agentRuntime = createMockRuntime();
    // Mock prompt to avoid actual LLM calls
    agentRuntime.session.prompt = vi.fn().mockResolvedValue(undefined);
    team.registerRuntime(agentRuntime, 'agent-1');
  });

  afterEach(async () => {
    vi.useRealTimers();
    await team.dispose();
  });

  it('exits loop when MAX_TURNS reached', async () => {
    await team.initialize(['task1']);
    // Do NOT complete the task; let it stay pending so the loop doesn't exit early

    team.startAgentLoops();

    // Advance timers to simulate many iterations.
    // Each iteration sleeps 1s; we need at least MAX_TURNS (50) iterations.
    // Advance by 60 seconds to be safe.
    await vi.advanceTimersByTimeAsync(60000);

    // Wait for child promises to settle
    await Promise.all(team.childPromises);

    // Agent should be idle and loop exited due to max turns
    expect(team.agentStatuses.get('agent-1')?.status).toBe('idle');
  });
});
