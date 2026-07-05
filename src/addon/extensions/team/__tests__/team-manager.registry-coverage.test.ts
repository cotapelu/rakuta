import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TeamRegistry, AgentTeam } from '../team-manager.js';

describe('TeamRegistry coverage', () => {
  let registry: TeamRegistry;

  beforeEach(() => {
    registry = TeamRegistry.getInstance();
    // Ensure clean state: clear internal maps to avoid leakage from other test files
    (registry as any).teams.clear();
    (registry as any).autoDisposeTimers.clear();
  });

  afterEach(async () => {
    const all = registry.getAll();
    for (const [id] of all) {
      await registry.unregister(id);
    }
    vi.restoreAllMocks();
  });

  it('register adds team; has and getAll reflect it', () => {
    const team = new AgentTeam();
    team.id = 'team-reg-1';
    registry.register('team-reg-1', team);
    expect(registry.has('team-reg-1')).toBe(true);
    expect(registry.getAll().has('team-reg-1')).toBe(true);
  });

  it('unregister removes team', async () => {
    const team = new AgentTeam();
    team.id = 'team-reg-2';
    registry.register('team-reg-2', team);
    await registry.unregister('team-reg-2');
    expect(registry.has('team-reg-2')).toBe(false);
  });

  it('resetAutoDisposeTimer sets timer when team exists', () => {
    const team = new AgentTeam();
    team.id = 'team-reg-3';
    registry.register('team-reg-3', team);
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    registry.resetAutoDisposeTimer('team-reg-3');
    expect(setTimeoutSpy).toHaveBeenCalled();
    // Clear the timer to avoid side effects
    registry.clearAutoDisposeTimer('team-reg-3');
  });

  it('resetAutoDisposeTimer does nothing when team missing', () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    registry.resetAutoDisposeTimer('nonexistent-team');
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  describe('clearAutoDisposeTimer', () => {
    it('clears existing timer and deletes entry', () => {
      const fakeTimer = 123 as any;
      (registry as any).autoDisposeTimers.set('team-x', fakeTimer);
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      registry.clearAutoDisposeTimer('team-x');
      expect(clearTimeoutSpy).toHaveBeenCalledWith(fakeTimer);
      expect((registry as any).autoDisposeTimers.has('team-x')).toBe(false);
    });

    it('does nothing when no timer', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      registry.clearAutoDisposeTimer('nonexistent');
      expect(clearTimeoutSpy).not.toHaveBeenCalled();
    });
  });
});
