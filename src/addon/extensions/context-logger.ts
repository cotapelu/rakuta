#!/usr/bin/env node
import { existsSync, mkdirSync } from "node:fs";
import { appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ExtensionAPI, BeforeProviderRequestEvent } from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";

const AGENT_DIR = getAgentDir();

/**
 * Redact PII from an object before logging.
 * Replaces common PII patterns (emails, phone numbers, SSNs, tokens) with [REDACTED].
 */
function redactPII(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return obj
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
      .replace(/\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, '[REDACTED_SSN]')
      .replace(/\b\d{10,}\b/g, '[REDACTED_PHONE]')
      .replace(/(?:api[_-]?key|token|secret|password|passwd)\s*[:=]\s*['"`][^'"`]{8,}['"`]/gi, '[REDACTED_SECRET]');
  }
  if (Array.isArray(obj)) return obj.map(redactPII);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token') || lowerKey.includes('apikey') || lowerKey.includes('api_key')) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactPII(value);
      }
    }
    return result;
  }
  return obj;
}
const CONFIG_DIR_NAME = dirname(AGENT_DIR).split(/[/\\]/).pop() || ".pi";

/**
 * Context Logger Extension
 *
 * Logs LLM context (system prompt, messages, tools) before each provider request.
 * Configure via flag: --contextLogFile <path>
 *
 * Output format: JSON lines (one JSON object per request)
 */

const DEFAULT_LOG_PATH = join(CONFIG_DIR_NAME, "context", "context.log");

export default function (pi: ExtensionAPI): any {
	// Register CLI flags for this extension
	pi.registerFlag("contextLogFile", {
		description: "Path to file where LLM context will be logged (default: .piclaw/context/context.log)",
		type: "string",
		default: undefined,
	});

	pi.registerFlag("contextLogAppend", {
		description: "Append to context log (default: true)",
		type: "boolean",
		default: true,
	});

	// Hook into before_provider_request to capture context
	pi.on("before_provider_request", async (event: BeforeProviderRequestEvent) => {
		const logFile = pi.getFlag("contextLogFile") as string | undefined;

		// If no log file specified, use default in cwd
		const effectiveLogFile = logFile ?? DEFAULT_LOG_PATH;

		// If explicitly set to empty string or "false", disable logging
		if (!effectiveLogFile || effectiveLogFile === "false" || effectiveLogFile === "") {
			return;
		}

		try {
			const logDir = dirname(effectiveLogFile);
			if (!existsSync(logDir)) {
				mkdirSync(logDir, { recursive: true });
			}

			// Cast payload to expected shape (model, context, options)
			const payload = event.payload as { model: unknown; context: unknown; options: unknown };

			// Redact PII from context before logging
			const redactedContext = redactPII(payload.context);

			const logEntry = JSON.stringify({
				timestamp: new Date().toISOString(),
				model: payload.model,
				context: redactedContext,
				options: payload.options,
			}) + "\n";

			await appendFile(effectiveLogFile, logEntry, { mode: 0o600 });
		} catch (err) {
			// Log error but don't break the request flow
			console.error("[ContextLogger] Failed to write log:", err);
		}
	});
	// Return empty object to satisfy extension discovery
	return {};
}
