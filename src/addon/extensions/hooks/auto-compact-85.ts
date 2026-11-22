/**
 * Auto-Compaction at 85% Context Usage
 *
 * Khi context usage vượt 85%, tự động chạy compaction.
 * Hook này chạy song song với auto-compaction mặc định của pi-coding-agent v0.78.0.
 */

const COMPACTION_THRESHOLD_PERCENT = 85;
const COMPACTION_COOLDOWN_MS = 5 * 60 * 1000; // 5 min cooldown
let lastCompactionTime = 0;
let isCompacting = false;

export default function (pi: import("@earendil-works/pi-coding-agent").ExtensionAPI): any {
  pi.on("turn_end", async (_event, ctx) => {
    const now = Date.now();
    if (isCompacting) return;
    if (now - lastCompactionTime < COMPACTION_COOLDOWN_MS) return;
    const usage = ctx.getContextUsage();
    if (usage?.percent && usage.percent > COMPACTION_THRESHOLD_PERCENT) {
      isCompacting = true;
      try {
        ctx.compact();
        lastCompactionTime = Date.now();
      } finally {
        isCompacting = false;
      }
    }
  });
  // Return empty object to satisfy extension discovery
  return {};
}
