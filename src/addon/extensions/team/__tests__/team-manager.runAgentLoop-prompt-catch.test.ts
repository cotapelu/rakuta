import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentTeam } from '../team-manager.js';
import { createMockRuntime } from './test-utils.js';

describe('AgentTeam runAgentLoop prompt error catch', () => {
  let team: AgentTeam;
  let agentRuntime: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    team = new AgentTeam();
    team.id = 'test-prompt-catch';
    const parentRuntime = createMockRuntime();
    parentRuntime.session.sessionId = 'parent-session-123';
    parentRuntime.services.agentDir = '/tmp/agent';
    team.registerRuntime(parentRuntime, 'parent');
    agentRuntime = createMockRuntime();
    // By default, prompt will be set to always throw in the test
    agentRuntime.session.prompt = vi.fn().mockRejectedValue(new Error('LLM error'));
    team.registerRuntime(agentRuntime, 'agent-1');
    await team.initialize(['task1']);
  });

  afterEach(async () => {
    vi.useRealTimers();
    await team.dispose();
  });

  it('catches prompt error each iteration and eventually exits on MAX_TURNS', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    team.startAgentLoops();

    // Advance time past MAX_TURNS (50 turns => 50 seconds)
    await vi.advanceTimersByTimeAsync(51000);

    // Loop should have exited due to max turns; child promises should settle
    await Promise.allSettled(team.childPromises);

    // Agent should be idle
    expect(team.agentStatuses.get('agent-1')?.status).toBe('idle');

    // The error should have been logged many times (at least once)
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
