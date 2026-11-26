/**
 * Extensions Utils - Shared Helpers
 *
 * Logging, tracing, locking, rendering and icon helpers shared by the
 * extension layer.
 */

export { createLogger, logger, type Logger } from "./logger.js";
export { getTracer, withSpan, SpanStatusCode } from "./tracing.js";
export { Mutex } from "./mutex.js";
export { ICONS, icon, type IconKey } from "./icons.js";
export { renderError, renderSuccess, renderMuted, renderAccent } from "./render-utils.js";
export { parseArgs, requireArgs, getArg, type ParsedArgs } from "./command-args.js";
export { addSectionHeader } from "./widget-helpers.js";