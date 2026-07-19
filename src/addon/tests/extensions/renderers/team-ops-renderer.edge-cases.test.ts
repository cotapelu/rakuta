import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerTeamOpsRenderer } from '../../../extensions/renderers/team-ops-renderer.ts';

vi.mock('@earendil-works/pi-tui', () => ({
  Text: class Text {
    text: string;
    constructor(text: string, _x: number, _y: number) {
      this.text = text;
    }
  },
}));

describe('Team Ops Renderer edge cases', () => {
  let mockApi: any;
  let capturedRenderer: any;

  beforeEach(() => {
    mockApi = { registerMessageRenderer: vi.fn() };
    capturedRenderer = null;
    (mockApi.registerMessageRenderer as any).mockImplementation((type: string, fn: any) => {
      if (type === 'team_ops_result') capturedRenderer = fn;
    });
    registerTeamOpsRenderer(mockApi);
  });

  function mockTheme() {
    return {
      fg: (c: string, v: string) => v,
      bold: (v: string) => v,
    };
  }

  describe('get_team_status edge cases', () => {
    it('handles empty agents array', () => {
      const details = {
        action: 'get_team_status',
        teamId: 'team-1',
        totalAgents: 5,
        activeAgents: 3,
        pendingTasks: 2,
        completedTasks: 10,
        agents: [] as any[]
      };
      const msg = { details, content: [] };
      const result = capturedRenderer(msg, {}, mockTheme());
      // Should not list individual agents
      expect(result.text).not.toMatch(/\b(agent-|id:)/);
      expect(result.text).toContain('Team: team-1');
    });

    it('handles agents undefined', () => {
      const details = {
        action: 'get_team_status',
        teamId: 'team-1',
        totalAgents: 5,
        activeAgents: 3,
        pendingTasks: 2,
        completedTasks: 10
        // agents omitted
      } as any;
      const msg = { details, content: [] };
      const result = capturedRenderer(msg, {}, mockTheme());
      // Should not list individual agents
      expect(result.text).not.toMatch(/\b(agent-|id:)/);
    });
  });

  describe('get_messages edge cases', () => {
    it('does not add truncation line when exactly 10 messages', () => {
      const msgs = Array.from({ length: 10 }, (_, i) => ({
        from: `user${i+1}`,
        channel: 'team.chat',
        content: `Message ${i+1}`
      }));
      const details = { action: 'get_messages', messages: msgs };
      const msg = { details, content: [] };
      const result = capturedRenderer(msg, {}, mockTheme());
      expect(result.text).toContain('Messages (10):');
      expect(result.text).not.toContain('...and');
    });

    it('handles message content with length > 60 (ellipsis)', () => {
      const longText = 'A'.repeat(70);
      const details = {
        action: 'get_messages',
        messages: [{ from: 'user1', channel: 'chat', content: longText }]
      };
      const msg = { details, content: [] };
      const result = capturedRenderer(msg, {}, mockTheme());
      expect(result.text).toContain('...'); // should be truncated
    });

    it('handles undefined messages (default to empty array)', () => {
      const details = { action: 'get_messages' } as any; // no messages
      const msg = { details, content: [] };
      const result = capturedRenderer(msg, {}, mockTheme());
      expect(result.text).toContain('Messages (0):');
    });
  });

  describe('workspace_read edge cases', () => {
    it('shows value when length <= 200 (no ellipsis)', () => {
      const details = { action: 'workspace_read', key: 'k', value: 'A'.repeat(100) };
      const msg = { details, content: [] };
      const result = capturedRenderer(msg, {}, mockTheme());
      expect(result.text).toContain('A'.repeat(100));
      expect(result.text).not.toContain('...');
    });
  });

  describe('send_message edge cases', () => {
    it('uses default channel when details.channel is undefined', () => {
      const details = { action: 'send_message' } as any; // no channel
      const msg = { details, content: [] };
      const result = capturedRenderer(msg, {}, mockTheme());
      expect(result.text).toContain('team.chat');
    });

    it('uses default channel when details.channel is empty string', () => {
      const details = { action: 'send_message', channel: '' };
      const msg = { details, content: [] };
      const result = capturedRenderer(msg, {}, mockTheme());
      expect(result.text).toContain('team.chat');
    });
  });

  describe('registration edge cases', () => {
    it('does not register if api.registerMessageRenderer is not a function', () => {
      const badApi = { registerMessageRenderer: 123 as any };
      registerTeamOpsRenderer(badApi);
      // Should not throw and not attempt to assign
      expect(badApi.registerMessageRenderer).toBe(123);
    });
  });

  describe('error handling edge cases', () => {
    it('shows fallback error message when msg.isError true but details.error absent', () => {
      const msg = {
        details: { action: 'some_action' },
        isError: true,
        content: []
      };
      const result = capturedRenderer(msg, {}, mockTheme());
      expect(result.text).toContain('❌ Error occurred');
    });
  });
});
