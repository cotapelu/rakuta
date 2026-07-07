import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildHeaderLines, buildTeamLines, refreshWidget } from '../../../extensions/team/team-widget';
import type { ExtensionUIContext } from '@earendil-works/pi-coding-agent';

// Mock TeamRegistry module
let mockRegistry: any;

vi.mock('../../../extensions/team/team-manager', () => {
  return {
    TeamRegistry: class {
      static getInstance() {
        return mockRegistry;
      }
    }
  };
});

function createMockTheme() {
  return {
    fg: (color: string, text: string) => {
      const obj = new String(text);
      obj.bold = () => `<b>${text}</b>`;
      return obj as any;
    }
  };
}

describe('team-widget', () => {
  let theme: any;

  beforeEach(() => {
    theme = createMockTheme();
    mockRegistry = {
      getAll: vi.fn()
    };
  });

  describe('buildHeaderLines', () => {
    it('returns header lines with team icon', () => {
      const lines = buildHeaderLines(theme);
      expect(lines.length).toBe(2);
      expect(String(lines[0])).toContain('👥 Team');
      expect(lines[1]).toBe('');
    });
  });

  describe('buildTeamLines', () => {
    it('formats team status with agents and tasks', () => {
      const teamId = 'team123456';
      const status = {
        agents: [
          { id: 'a1', currentTaskIndex: 0, status: 'idle' },
          { id: 'a2', currentTaskIndex: null, status: 'working' }
        ],
        tasks: [
          { index: 0, assignee: 'a1', status: 'pending' as const, result: '', retryCount: 0 },
          { index: 1, assignee: 'a2', status: 'in_progress' as const, result: '', retryCount: 0 }
        ],
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 2,
        totalTasks: 2,
        isComplete: false
      };
      const ui: ExtensionUIContext = {
        theme,
        setWidget: () => {}
      } as any;
      const rawLines = buildTeamLines(ui, teamId, status);
      const lines = rawLines.map(l => String(l));
      const shortId = teamId.slice(-6);
      expect(lines[0]).toBe(`Team ${shortId}`);
      expect(lines[1]).toContain(`Tasks: 0/2 (pending: 2, failed: 0)`);
      // working includes 'working' and 'in_progress'
      expect(lines[2]).toContain(`Agents: 2 (idle: 1, working: 1)`);
    });

    it('handles zero agents', () => {
      const status = {
        agents: [],
        tasks: [],
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0,
        totalTasks: 0,
        isComplete: true
      };
      const ui: ExtensionUIContext = { theme, setWidget: () => {} } as any;
      const lines = buildTeamLines(ui, 'team0', status).map(l => String(l));
      expect(lines[2]).toContain('Agents: 0 (idle: 0, working: 0)');
    });

    it('counts working agents including in_progress', () => {
      const status = {
        agents: [
          { id: 'a1', status: 'idle' },
          { id: 'a2', status: 'in_progress' },
          { id: 'a3', status: 'working' }
        ],
        tasks: [],
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0,
        totalTasks: 0,
        isComplete: false
      } as any;
      const ui: ExtensionUIContext = { theme, setWidget: () => {} } as any;
      const lines = buildTeamLines(ui, 'team1', status).map(l => String(l));
      expect(lines[2]).toContain('Agents: 3 (idle: 1, working: 2)');
    });
  });

  describe('refreshWidget', () => {
    it('renders "No active teams" when registry empty', async () => {
      mockRegistry.getAll.mockReturnValue(new Map());
      const ui: ExtensionUIContext = {
        theme,
        setWidget: vi.fn()
      } as any;
      await refreshWidget(ui);
      const [widgetName, rawLines] = ui.setWidget.mock.calls[0];
      expect(widgetName).toBe('team');
      const lines = rawLines.map((l: any) => String(l));
      expect(lines[0]).toContain('👥 Team');
      expect(lines[1]).toBe('');
      expect(lines[2]).toContain('No active teams');
    });

    it('renders team lines for a single team', async () => {
      const teamId = 'team987654321'; // longer to test slice
      const mockTeam = {
        getTeamStatus: vi.fn().mockResolvedValue({
          agents: [{ id: 'agent1', currentTaskIndex: null, status: 'idle' }],
          tasks: [],
          completedTasks: 0,
          failedTasks: 0,
          pendingTasks: 0,
          totalTasks: 0,
          isComplete: true
        })
      };
      const teams = new Map([[teamId, mockTeam]]);
      mockRegistry.getAll.mockReturnValue(teams);
      const ui: ExtensionUIContext = {
        theme,
        setWidget: vi.fn()
      } as any;
      await refreshWidget(ui);
      const [widgetName, rawLines] = ui.setWidget.mock.calls[0];
      expect(widgetName).toBe('team');
      const lines = rawLines.map((l: any) => String(l));
      expect(lines[0]).toContain('👥 Team');
      expect(lines[1]).toBe('');
      const joined = lines.join('\n');
      expect(joined).toContain(`Team ${teamId.slice(-6)}`);
      expect(joined).toContain('Agents: 1 (idle: 1, working: 0)');
      expect(joined).toContain('Tasks: 0/0');
    });
  });
});
