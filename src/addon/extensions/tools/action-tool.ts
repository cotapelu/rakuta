#!/usr/bin/env node

import type { ExtensionAPI, ToolDefinition } from "@earendil-works/pi-coding-agent";
import { actions } from "./actions/index.js";

/**
 * Action Tool
 *
 * A unified tool that provides access to various system operations via action registry.
 * Each action is implemented in the actions/ directory and registered in actions/index.ts.
 */
export function createActionTool(): ToolDefinition {
  // Get all available action names from registry
  const actionNames = Object.keys(actions);

  // Build detailed guidelines for each action with examples
  const actionLines: string[] = [];
  for (const name of actionNames) {
    const action = actions[name];
    const desc = action.description || "No description";
    // Build simple example from required parameters if schema available
    let example = `action_tool({ action: '${name}', args: {} })`;
    if (action.getParameters) {
      try {
        const schema = action.getParameters();
        const required = schema.required || [];
        const props = (schema as any).properties || {};
        if (Object.keys(props).length > 0 && required.length > 0) {
          const exampleArgs: Record<string, any> = {};
          for (const key of required) {
            const prop = props && props[key] as any;
            if (prop) {
              const type = prop.type;
              if (type === "string") exampleArgs[key] = "value";
              else if (type === "number") exampleArgs[key] = 1;
              else if (type === "boolean") exampleArgs[key] = true;
              else if (Array.isArray(type) && type.includes("string")) exampleArgs[key] = ["a", "b"];
              else if (type === "array") exampleArgs[key] = [];
              else if (type === "object") exampleArgs[key] = {};
              else exampleArgs[key] = null;
            }
          }
          // Add some optional defaults to make example more realistic
          for (const [key, prop] of Object.entries(props)) {
            const p = prop as any;
            if (!required.includes(key) && exampleArgs[key] === undefined) {
              if (p.default !== undefined) {
                exampleArgs[key] = p.default;
              }
            }
          }
          example = `action_tool({ action: '${name}', args: ${JSON.stringify(exampleArgs)} })`;
        }
      } catch (e) {
        // ignore schema errors, keep generic example
      }
    }
    actionLines.push(`• ${name}: ${desc}\n  Example: ${example}`);
  }

  return {
    name: "action_tool",
    label: "Action Tool",
    description: "Comprehensive tool for system operations (process, file, system, network, docker, git, packages, etc.).",
    promptSnippet: "action_tool({ action: '<action>', args: { ... } })",
    promptGuidelines: [
      "Use action_tool for performing system operations.",
      "Available actions:",
      ...actionLines
    ],
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: actionNames,
          description: "Which action to perform"
        },
        args: {
          type: "object",
          description: "Action-specific parameters"
        }
      },
      required: ["action"]
    },

    async execute(_toolCallId: string, params: any, signal: AbortSignal | undefined, _onUpdate: any, ctx: any) {
      const { action, ...args } = params;

      if (!action) {
        return {
          isError: true,
          content: [{ type: "text", text: "Missing required parameter: action" }],
          details: null
        } as const;
      }

      const actionImpl = actions[action];
      if (!actionImpl) {
        return {
          isError: true,
          content: [{ type: "text", text: `Unknown action: ${action}. Available: ${actionNames.join(", ")}` }],
          details: null
        } as const;
      }

      try {
        const cwd = ctx.session?.cwd ?? process.cwd();
        const result = await actionImpl.execute(args, cwd, signal, ctx);

        return {
          isError: result.isError || false,
          content: result.content,
          details: { ...result.details, action },
        } as const;
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `❌ Error in action '${action}': ${error.message}` }],
          details: { error: error.message, action },
        } as const;
      }
    }
  };
}

/**
 * Register the action tool with the extension API.
 */
export function registerActionTool(api: ExtensionAPI): void {
  api.registerTool(createActionTool());
}
