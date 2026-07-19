import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerTeamOpsRenderer } from '../../../extensions/renderers/team-ops-renderer.ts';

// Mock @earendil-works/pi-tui Text
vi.mock('@earendil-works/pi-tui', () => ({
  Text: class Text {
    text: string;
    constructor(text: string, _x: number, _y: number) {
      this.text = text;
    }
  },
}));

describe('Team Ops Renderer Edge Cases', () => {
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

  it('renders get_team_status without agents list when agents array missing', () => {
    const details = {
      action: 'get_team_status',
      teamId: 'teamX',
      totalAgents: 0,
      activeAgents: 0,
      pendingTasks: 0,
      completedTasks: 0,
      agents: undefined as any, // no agents array
    };
    const msg = { details, content: [] };
    const result = capturedRenderer(msg, {}, mockTheme());
    expect(result.text).toContain('Team: teamX');
    // Summary line always present; ensure individual agent lines absent (no emoji)
    expect(result.text).not.toContain('🔄');
    expect(result.text).not.toContain('💤');
  });

  it('renders idle agent with sleep icon', () => {
    const details = {
      action: 'get_team_status',
      teamId: 'teamY',
      totalAgents: 1,
      activeAgents: 1,
      pendingTasks: 0,
      completedTasks: 0,
      agents: [
        { id: 'agent-1', status: 'idle' }
      ]
    };
    const msg = { details, content: [] };
    const result = capturedRenderer(msg, {}, mockTheme());
    expect(result.text).toContain('💤');
    expect(result.text).not.toContain('🔄');
  });

  it('truncates messages list to 10 and shows remaining count', () => {
    const manyMessages = Array.from({ length: 15 }, (_, i) => ({
      from: `user${i}`,
      channel: 'chat',
      content: `Message ${i}`
    }));
    const details = {
      action: 'get_messages',
      messages: manyMessages
    };
    const msg = { details, content: [] };
    const result = capturedRenderer(msg, {}, mockTheme());
    expect(result.text).toContain('...and 5 more.');
    // Ensure only first 10 are listed
    for (let i = 0; i < 10; i++) {
      expect(result.text).toContain(`user${i}`);
    }
    // The 11th should not appear
    expect(result.text).not.toContain('user10');
  });

  it('renders workspace_read when value is undefined', () => {
    const details = { action: 'workspace_read', key: 'mykey', value: undefined };
    const msg = { details, content: [] };
    const result = capturedRenderer(msg, {}, mockTheme());
    expect(result.text).toContain('No value set');
  });

  it('renders claim_task without taskIndex shows no tasks message', () => {
    const details = { action: 'claim_task' }; // no taskIndex
    const msg = { details, content: [] };
    const result = capturedRenderer(msg, {}, mockTheme());
    expect(result.text).toContain('No tasks available');
  });

  it('renders release_task without taskIndex shows undefined index', () => {
    const details = { action: 'release_task' }; // missing taskIndex
    const msg = { details, content: [] };
    const result = capturedRenderer(msg, {}, mockTheme());
    expect(result.text).toContain('↩ Released task');
    expect(result.text).toContain('#undefined');
  });

  it('renders update_status with custom status', () => {
    const details = { action: 'update_status', status: 'away' };
    const msg = { details, content: [] };
    const result = capturedRenderer(msg, {}, mockTheme());
    expect(result.text).toContain('● Status updated');
    expect(result.text).toContain('away');
  });
});
