import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentTeam } from '../team-manager.js';
import { createMockRuntime } from './test-utils.js';

describe('AgentTeam runAgentLoop early abort', () => {
  let team: AgentTeam;
  let agentRuntime: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    team = new AgentTeam();
    team.id = 'test-early-abort';
    const parentRuntime = createMockRuntime();
    parentRuntime.session.sessionId = 'parent-session-123';
    parentRuntime.services.agentDir = '/tmp/agent';
    team.registerRuntime(parentRuntime, 'parent');
    agentRuntime = createMockRuntime();
    agentRuntime.session.prompt = vi.fn().mockResolvedValue(undefined);
    team.registerRuntime(agentRuntime, 'agent-1');
    await team.initialize(['task1']);
  });

  afterEach(async () => {
    vi.useRealTimers();
    await team.dispose();
  });

  it('exits immediately if controller already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    // Access private runAgentLoop; should resolve without entering loop body
    const loopPromise = (team as any).runAgentLoop('agent-1', agentRuntime, controller);
    await loopPromise;
  });
});
