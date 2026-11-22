/**
 * Shared icon registry for consistent icon usage across all renderers.
 *
 * All renderers should import icons from here instead of using
 * ad-hoc emoji/unicode characters.
 */

export const ICONS = {
  // Task status
  completed: "✅",
  inProgress: "🔄",
  abandoned: "❌",
  pending: "⏳",

  // Success / error
  success: "✓",
  error: "✗",
  warning: "⚠",

  // General
  info: "ℹ",
  search: "🔍",
  memory: "📝",
  tag: "🏷️",
  team: "👥",
  todo: "📋",
  file: "📄",
  link: "🔗",

  // Status indicators
  statusUpdated: "●",
  running: "▶",
  stopped: "■",
} as const;

export type IconKey = keyof typeof ICONS;

/** Get an icon by key, falling back to the key itself if not found. */
export function icon(key: IconKey): string {
  return ICONS[key] ?? key;
}
