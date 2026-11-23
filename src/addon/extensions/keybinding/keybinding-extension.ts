#!/usr/bin/env node

/**
 * Keybinding Extension
 *
 * Enables user-defined keyboard shortcuts for slash commands.
 * Configuration: add `keybindings` to ~/.piclaw/config.json, e.g.
 * {
 *   "keybindings": {
 *     "team": "t",
 *     "settings": "s",
 *     "copy": "c",
 *     "providers": "p",
 *     "tree": "ctrl+r"
 *   }
 * }
 *
 * Shortcuts are active only in TUI mode and when the agent is idle.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

const AGENT_DIR = getAgentDir();
const CONFIG_DIR_NAME = dirname(AGENT_DIR).split(/[/\\]/).pop() || ".pi";

function loadKeybindings(): Record<string, string> {
  const configPath = join(homedir(), CONFIG_DIR_NAME, "config.json");
  if (!existsSync(configPath)) {
    return {};
  }
  try {
    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content);
    return config.keybindings || {};
  } catch (e) {
    console.error("[KeybindingExtension] Failed to load config:", e);
    return {};
  }
}

function decodeModifiers(mod?: string): string[] {
  if (!mod) return [];
  const num = parseInt(mod, 10);
  if (isNaN(num)) return [];
  const m = num - 1;
  const mods: string[] = [];
  if (m & 4) mods.push("ctrl");
  if (m & 2) mods.push("alt");
  if (m & 1) mods.push("shift");
  return mods;
}

const TILDE_KEY_MAP: Record<string, string> = {
  "15": "f5",
  "17": "f6",
  "18": "f7",
  "19": "f8",
  "20": "f9",
  "21": "f10",
  "23": "f11",
  "24": "f12",
};

export function normalizeTerminalKey(data: string): string | null {
  if (data.length === 1) {
    const code = data.charCodeAt(0);
    if (code === 27) return null; // escape, ignore
    if (code >= 1 && code <= 26) {
      const letter = String.fromCharCode(code + 96);
      return `ctrl+${letter}`;
    }
    return data.toLowerCase();
  }

  if (!data.startsWith("\x1b")) return null;

  // SS3 function keys F1-F4
  if (data.length === 3 && data[1] === "O") {
    const ss3Map: Record<string, string> = { P: "f1", Q: "f2", R: "f3", S: "f4" };
    const key = ss3Map[data[2]];
    if (key) return key;
  }

  // CSI sequences
  const csi = data.slice(2); // strip \x1b[
  // Simple arrows
  const simpleArrow: Record<string, string> = { A: "up", B: "down", C: "right", D: "left" };
  if (simpleArrow[csi]) return simpleArrow[csi];

  const m = csi.match(/^(\d+)?(?:;(\d+))?([A-Za-z~])$/);
  if (m) {
    const keyNum = m[1];
    const mod = m[2];
    const final = m[3];
    let base: string | null = null;
    if (final === "A") base = "up";
    else if (final === "B") base = "down";
    else if (final === "C") base = "right";
    else if (final === "D") base = "left";
    else if (final === "H") base = "home";
    else if (final === "F") base = "end";
    else if (final === "~" && keyNum && TILDE_KEY_MAP[keyNum]) base = TILDE_KEY_MAP[keyNum];
    if (base) {
      const mods = decodeModifiers(mod);
      if (mods.length > 0) return `${mods.join("+")}+${base}`;
      return base;
    }
  }

  return null;
}

export function registerKeybindingExtension(api: ExtensionAPI): void {
  // Listen for session start to set up keybindings
  api.on("session_start", async (_event, ctx: ExtensionContext) => {
    const bindings = loadKeybindings();

    // Build inverse map: key string -> command name
    // Support simple keys (single char) or combos like "ctrl+r", "alt+s", "ctrl+shift+t"
    const keyToCmd = new Map<string, string>();
    for (const [cmd, key] of Object.entries(bindings)) {
      if (typeof key === "string" && key.length > 0) {
        // Normalize: lowercase, but preserve ctrl/alt/shift modifiers (case-insensitive)
        const normalized = key.toLowerCase();
        keyToCmd.set(normalized, cmd);
      }
    }

    if (keyToCmd.size === 0) {
      // No bindings configured, do nothing
      return;
    }

    // Register a terminal input listener
    const unsubscribe = ctx.ui.onTerminalInput((data) => {
      // Only process if agent idle and in TUI mode (to avoid interfering with streaming output)
      if (!ctx.isIdle() || !ctx.hasUI) {
        return; // don't consume
      }

      // Normalize incoming terminal data into a comparable key name.
      // Supports single chars, ctrl+letter, function keys (F1-F12), arrows,
      // and modifier combinations (ctrl/alt/shift).
      const normalizedReceived = normalizeTerminalKey(data);
      if (!normalizedReceived) {
        return; // let input pass through
      }

      const cmd = keyToCmd.get(normalizedReceived);
      if (cmd) {
        // Execute slash command via sendUserMessage (handled synchronously by command system)
        try {
          api.sendUserMessage(`/${cmd}`);
        } catch (err: any) {
          ctx.ui.notify(`Failed to execute ${cmd}: ${err?.message || "unknown error"}`, "error");
        }
        // Consume the input so it doesn't go to editor
        return { consume: true };
      }
      // If not matched, let it pass through
    });

    // Ensure cleanup on session shutdown
    api.on("session_shutdown", () => {
      unsubscribe();
    });
  });
}
