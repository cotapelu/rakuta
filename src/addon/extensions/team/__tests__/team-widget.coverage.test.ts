import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as teamWidget from '../team-widget.js';

// Mock TeamRegistry - static getInstance method
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

describe('team-widget coverage', () => {
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('buildHeaderLines', () => {
    it('returns header containing team icon and blank line', () => {
      const lines = teamWidget.buildHeaderLines({ fg: (c, t) => t } as any);
      // .bold() adds <b> tags, so just check contains 'Team'
      expect(lines[0]).toContain('Team');
      expect(lines[1]).toBe('');
    });
  });

  describe('buildTeamLines', () => {
    it('builds team status with correct short id and stats', () => {
      const status = {
        agents: [
          { id: 'a1', currentTaskIndex: null, status: 'idle' as const },
          { id: 'a2', currentTaskIndex: 0, status: 'working' as const },
        ],
        tasks: [
          { index: 0, assignee: 'a2', status: 'in_progress' as const, result: '', retryCount: 0 },
          { index: 1, assignee: null, status: 'pending' as const, result: '', retryCount: 0 },
        ],
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 1,
        totalTasks: 2,
        isComplete: false,
      };
      const lines = teamWidget.buildTeamLines(mockUi, 'team-xyz', status);
      const text = lines.join('\n');
      // short id = last 6 chars: 'am-xyz' for 'team-xyz'
      expect(text).toContain('Team am-xyz');
      expect(text).toContain('Tasks: 0/2');
      expect(text).toContain('Agents: 2 (idle: 1, working: 1)');
    });
  });

  describe('refreshWidget', () => {
    it('hides widget when registry empty', async () => {
      await teamWidget.refreshWidget(mockUi);
      const calls = mockUi.setWidget.mock.calls;
      const lastCall = calls[calls.length - 1][1];
      expect(lastCall).toEqual([]);
    });
  });

  describe('startWidget', () => {
    it('sets interval with 2 second period', () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockImplementation(() => 1);
      (teamWidget as any).startWidget(mockCtx);
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
      setIntervalSpy.mockRestore();
    });

    it('does not start twice', () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockReturnValue(1);
      (teamWidget as any).startWidget(mockCtx);
      (teamWidget as any).startWidget(mockCtx);
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      setIntervalSpy.mockRestore();
    });
  });

  describe('stopWidget', () => {
    it('clears interval and removes widget', () => {
      const mockInterval = 123 as any;
      const state = { intervalId: mockInterval, ctx: mockCtx, enabled: true };
      const clearSpy = vi.spyOn(globalThis, 'clearInterval');

      (teamWidget as any).stopWidget(state);

      expect(clearSpy).toHaveBeenCalledWith(mockInterval);
      expect(mockUi.setWidget).toHaveBeenCalledWith('team', undefined);
      expect(state.intervalId).toBeNull();
      expect(state.ctx).toBeNull();

      clearSpy.mockRestore();
    });

    it('handles null interval safely', () => {
      const state = { intervalId: null, ctx: null, enabled: false };
      const clearSpy = vi.spyOn(globalThis, 'clearInterval');

      (teamWidget as any).stopWidget(state);

      expect(clearSpy).not.toHaveBeenCalled();

      clearSpy.mockRestore();
    });
  });

  describe('getTeamWidgetEnabled', () => {
    it('returns true by default', () => {
      expect(teamWidget.getTeamWidgetEnabled(mockCtx)).toBe(true);
    });
  });
});
