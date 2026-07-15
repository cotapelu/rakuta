import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as teamWidget from '../team-widget.js';
import { TeamRegistry } from '../team-manager.js';

// Mock TeamRegistry
vi.mock('../team-manager.js', () => {
  const getAllMock = vi.fn().mockReturnValue(new Map());
  const getInstanceMock = vi.fn().mockReturnValue({
    getAll: getAllMock,
    getTeam: vi.fn(),
  });
  return {
    TeamRegistry: {
      getInstance: getInstanceMock,
    },
  };
});

describe('team-widget extra coverage', () => {
  let mockCtx: any;
  let mockUi: any;

  beforeEach(() => {
    mockCtx = { ui: null };
    mockUi = {
      setWidget: vi.fn(),
      theme: {
        fg: vi.fn((_color, text) => text),
      },
    };
    mockCtx.ui = mockUi;
    // Reset TeamRegistry mock to default (empty teams)
    const getInstanceMock = TeamRegistry.getInstance as any;
    getInstanceMock.mockClear();
    const defaultInstance = {
      getAll: vi.fn().mockReturnValue(new Map()),
      getTeam: vi.fn(),
    };
    getInstanceMock.mockReturnValue(defaultInstance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('buildTeamLines', () => {
    it('counts agents with in_progress as working', () => {
      const status = {
        agents: [
          { id: 'a1', status: 'in_progress' as const },
          { id: 'a2', status: 'idle' as const },
        ],
        tasks: [],
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0,
        totalTasks: 0,
        isComplete: false,
      };
      const lines = teamWidget.buildTeamLines(mockUi, 'team-12345', status);
      const text = lines.join('\n');
      expect(text).toContain('Agents: 2 (idle: 1, working: 1)');
    });

    it('handles empty agents list', () => {
      const status = {
        agents: [],
        tasks: [],
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0,
        totalTasks: 0,
        isComplete: false,
      };
      const lines = teamWidget.buildTeamLines(mockUi, 'team-empty', status);
      const text = lines.join('\n');
      expect(text).toContain('Agents: 0 (idle: 0, working: 0)');
    });
  });

  describe('getTeamWidgetEnabled', () => {
    it('returns false when state is disabled', () => {
      const state = teamWidget.ensureState(mockCtx);
      expect(teamWidget.getTeamWidgetEnabled(mockCtx)).toBe(true);
      state.enabled = false;
      expect(teamWidget.getTeamWidgetEnabled(mockCtx)).toBe(false);
    });
  });

  describe('refreshWidget', () => {
    it('handles getTeamStatus rejection gracefully', async () => {
      const mockTeam = {
        getTeamStatus: vi.fn().mockRejectedValue(new Error('fail')),
      };
      const teams = new Map([['team-xyz', mockTeam]]);
      const instance = (TeamRegistry.getInstance as any)();
      instance.getAll.mockReturnValue(teams);

      await teamWidget.refreshWidget(mockUi);

      const calls = mockUi.setWidget.mock.calls;
      const lastCallArg = calls[calls.length - 1][1];
      const lines = lastCallArg as string[];
      expect(lines.some(l => l.includes('error fetching status'))).toBe(true);
    });

    it('handles TeamRegistry.getInstance throw', async () => {
      (TeamRegistry.getInstance as any).mockImplementation(() => {
        throw new Error('registry fail');
      });
      await teamWidget.refreshWidget(mockUi);
      expect(mockUi.setWidget).not.toHaveBeenCalled();
      // Restore default
      (TeamRegistry.getInstance as any).mockImplementation(() => ({
        getAll: vi.fn().mockReturnValue(new Map()),
        getTeam: vi.fn(),
      }));
    });

    it('processes multiple teams and sets widget once', async () => {
      const team1 = {
        getTeamStatus: vi.fn().mockResolvedValue({
          agents: [], tasks: [], completedTasks: 0, failedTasks: 0, pendingTasks: 0, totalTasks: 0, isComplete: false,
        }),
      };
      const team2 = {
        getTeamStatus: vi.fn().mockResolvedValue({
          agents: [], tasks: [], completedTasks: 0, failedTasks: 0, pendingTasks: 0, totalTasks: 0, isComplete: false,
        }),
      };
      const teams = new Map([['t1', team1], ['t2', team2]]);
      const instance = (TeamRegistry.getInstance as any)();
      instance.getAll.mockReturnValue(teams);

      await teamWidget.refreshWidget(mockUi);

      expect(mockUi.setWidget).toHaveBeenCalledTimes(1);
      const lines = mockUi.setWidget.mock.calls[0][1] as string[];
      // Both team IDs should appear
      expect(lines.some(l => l.includes('Team t1'))).toBe(true);
      expect(lines.some(l => l.includes('Team t2'))).toBe(true);
    });
  });

  describe('stopWidget', () => {
    it('handles setWidget throw gracefully', () => {
      const mockInterval = 123 as any;
      const state = { intervalId: mockInterval, ctx: mockCtx, enabled: true };
      const clearSpy = vi.spyOn(globalThis, 'clearInterval');
      mockUi.setWidget = vi.fn(() => { throw new Error('ui error'); });

      expect(() => (teamWidget as any).stopWidget(state)).not.toThrow();
      expect(clearSpy).toHaveBeenCalledWith(mockInterval);
      expect(state.intervalId).toBeNull();
      expect(state.ctx).toBeNull();

      clearSpy.mockRestore();
      mockUi.setWidget = vi.fn();
    });
  });

  describe('startWidget', () => {
    it('interval callback respects enabled flag', async () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockImplementation((cb) => {
        (teamWidget as any).__testCb = cb;
        return 1;
      });

      const state = teamWidget.ensureState(mockCtx);
      state.enabled = true;
      state.intervalId = null;

      (teamWidget as any).startWidget(mockCtx);
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      expect(state.intervalId).toBe(1);

      // Clear setWidget calls from initial refresh inside startWidget
      mockUi.setWidget.mockClear();

      // Simulate interval with disabled: should not call refreshWidget (=> no setWidget)
      state.enabled = false;
      await (teamWidget as any).__testCb();
      expect(mockUi.setWidget).not.toHaveBeenCalled();

      // Enabled again: should call refreshWidget => setWidget
      state.enabled = true;
      await (teamWidget as any).__testCb();
      expect(mockUi.setWidget).toHaveBeenCalledTimes(1);

      setIntervalSpy.mockRestore();
      delete (teamWidget as any).__testCb;
    });

    it('interval callback does nothing when ctx becomes null', async () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockImplementation((cb) => {
        (teamWidget as any).__testCb = cb;
        return 1;
      });

      const state = teamWidget.ensureState(mockCtx);
      state.enabled = true;
      state.intervalId = null;

      (teamWidget as any).startWidget(mockCtx);
      mockUi.setWidget.mockClear();

      state.ctx = null;
      await (teamWidget as any).__testCb();
      expect(mockUi.setWidget).not.toHaveBeenCalled();

      setIntervalSpy.mockRestore();
      delete (teamWidget as any).__testCb;
    });

    it('does not start twice', () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockReturnValue(1);
      const state = teamWidget.ensureState(mockCtx);
      state.intervalId = null;

      (teamWidget as any).startWidget(mockCtx);
      (teamWidget as any).startWidget(mockCtx);

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      setIntervalSpy.mockRestore();
    });
  });

  describe('registerTeamWidget', () => {
    it('registers session_start and starts widget', async () => {
      const api = { on: vi.fn() } as any;
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockReturnValue(999);

      teamWidget.registerTeamWidget(api);

      expect(api.on).toHaveBeenCalledWith('session_start', expect.any(Function));
      const sessionHandler = api.on.mock.calls[0][1];
      const sessionCtx = { ui: mockUi } as any;

      await sessionHandler('session_start', sessionCtx);

      // startWidget should have been invoked: refreshWidget called (=> setWidget) and setInterval called
      expect(mockUi.setWidget).toHaveBeenCalled();
      expect(setIntervalSpy).toHaveBeenCalled();

      // Retrieve state attached to sessionCtx
      const state = teamWidget.ensureState(sessionCtx);
      expect(state.intervalId).toBe(999);
      expect(state.enabled).toBe(true);

      // Verify session_shutdown also registered
      expect(api.on).toHaveBeenCalledWith('session_shutdown', expect.any(Function));
      const shutdownHandler = api.on.mock.calls[1][1];

      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      shutdownHandler();
      expect(clearIntervalSpy).toHaveBeenCalledWith(999);
      expect(state.intervalId).toBeNull();
      expect(state.ctx).toBeNull();

      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });
  });
});
