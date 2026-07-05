import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentTeam } from '../team-manager.js';

async function initTeam(team: AgentTeam, tasks: string[]) {
  await team.initialize(tasks);
}

describe('AgentTeam extra branch coverage', () => {
  let team: AgentTeam;

  beforeEach(() => {
    team = new AgentTeam();
    team.id = 'test-team';
  });

  afterEach(async () => {
    await team.dispose();
  });

  describe('withLock error handling', () => {
    it('propagates exception from fn and releases lock', async () => {
      await initTeam(team, ['t1']);
      // Acquire lock via one operation then throw inside another
      const p1 = team.withLock(async () => {
        // hold lock briefly
        await Promise.resolve();
        // simulate work and then throw
        throw new Error('fail');
      });
      // concurrent call should wait then throw same error type (not suppressed)
      const p2 = team.withLock(async () => {
        return 'ok';
      });
      await expect(p1).rejects.toThrow('fail');
      // After error, lock should be released so p2 completes
      await expect(p2).resolves.toBe('ok');
    });
  });

  describe('dispose idempotency', () => {
    it('can be called multiple times without error', async () => {
      await initTeam(team, ['t1']);
      await team.dispose();
      // Second dispose should be safe (no-op)
      await expect(team.dispose()).resolves.toBeUndefined();
    });
  });

  describe('claimTask when no tasks', () => {
    it('returns null after initialization with no tasks', async () => {
      await initTeam(team, []);
      const idx = await team.claimTask('agent-1');
      expect(idx).toBeNull();
    });
  });
});
