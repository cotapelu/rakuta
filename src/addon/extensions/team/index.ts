/**
 * Team System - Exports
 *
 * Simple team collaboration: one tool (team_run) that auto-executes tasks.
 * This barrel is the registration point for the whole team layer.
 */

// Core classes (if needed externally)
export { AgentTeam, type AgentTeamRuntime } from "./team-manager.js";
export { SharedWorkspace, type WorkspaceEntry } from "./workspace.js";

// Encapsulation helpers (message bus + workspace facade for a team)
export { AgentMessageBus } from "./agent-message-bus.js";
export { AgentWorkspace } from "./agent-workspace.js";

// Monitoring + task/status tracking
export { AgentMonitor, type AgentStatus, type AgentMonitorOptions } from "./agent-monitor.js";
export { TaskManager, type TaskStatus, type TeamTaskStatus, type TeamStatus, type TaskManagerOptions } from "./task-manager.js";

// Boot functions
export { bootPiclawTeam, executeTeamTasks } from "./team-manager.js";

// Tool registration
export { registerTeamTool } from "./team-tool.js";
export { createTeamOpsTool } from "./team-ops-tool.js";

// Widget registration (TUI panel)
export {
  registerTeamWidget,
  startWidget,
  stopWidget,
  toggleTeamWidget,
  getTeamWidgetEnabled,
  ensureState,
  buildHeaderLines,
  buildTeamLines,
  refreshWidget,
} from "./team-widget.js";