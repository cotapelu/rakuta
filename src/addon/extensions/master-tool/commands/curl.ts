#!/usr/bin/env node
/**
 * Curl Command - HTTP requests via curl CLI
 * Category: network
 */

import { Type } from "typebox";
import { Text } from "@earendil-works/pi-tui";

export const metadata = {
  name: "curl",
  category: "network",
  description: "Make HTTP requests using curl",
  longDescription: `
Execute HTTP requests using the curl command-line tool.
Supports all common curl options: method, headers, body, auth, etc.
Works on any system with curl installed (macOS, Linux, Windows 10+).

Note: For complex JSON bodies, consider using a dedicated HTTP tool.
  `.trim(),
  examples: [
    "master_tool({ command: 'curl', args: { url: 'https://api.example.com', method: 'GET' } })",
    "master_tool({ command: 'curl', args: { url: 'https://api.example.com', method: 'POST', body: '{\"key\":\"value\"}', headers: { 'Content-Type': 'application/json' } } })",
    "master_tool({ command: 'curl', args: { url: 'https://example.com', output: 'response.txt' } })"
  ],
  tags: ["network", "http", "curl"],
  permissions: ["exec:curl", "fs:write"],
  experimental: false
};

export const schema = Type.Object({
  url: Type.String({ description: "URL to request (required)" }),
  method: Type.Optional(Type.Union([
    Type.Literal("GET"),
    Type.Literal("POST"),
    Type.Literal("PUT"),
    Type.Literal("DELETE"),
    Type.Literal("PATCH"),
    Type.Literal("HEAD")
  ], { description: "HTTP method (default: GET)" })),
  headers: Type.Optional(Type.Record(Type.String(), { description: "Headers as key-value pairs" })),
  body: Type.Optional(Type.String({ description: "Request body (for POST/PUT/PATCH)" })),
  data: Type.Optional(Type.Record(Type.Any(), { description: "JSON data object (will be JSON-stringified)" })),
  output: Type.Optional(Type.String({ description: "File path to save response body" })),
  includeHeaders: Type.Optional(Type.Boolean({ description: "Include response headers in output (default: false)" })),
  silent: Type.Optional(Type.Boolean({ description: "Silent mode (no progress) (default: true)" })),
  timeout: Type.Optional(Type.Integer({ description: "Timeout in seconds (default: 30)" })),
  followRedirects: Type.Optional(Type.Boolean({ description: "Follow redirects (default: true)" })),
  user: Type.Optional(Type.String({ description: "Basic auth user:password" })),
  insecure: Type.Optional(Type.Boolean({ description: "Allow insecure SSL connections (default: false)" }))
}, { additionalProperties: false });

interface CurlResult {
  code: number;
  stdout: string;
  stderr: string;
  headers?: string | undefined;
  durationMs: number;
  url: string;
}

export async function execute(
  args: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    data?: Record<string, any>;
    output?: string;
    includeHeaders?: boolean;
    silent?: boolean;
    timeout?: number;
    followRedirects?: boolean;
    user?: string;
    insecure?: boolean;
  },
  cwd: string,
  signal?: AbortSignal,
  ctx?: any
): Promise<{ code: number; stdout: string; stderr: string; data?: CurlResult }> {
  const startTime = Date.now();

  try {
    if (!args.url) {
      return {
        code: 1,
        stdout: "",
        stderr: "Missing required parameter: url",
        data: undefined
      };
    }

    // Build curl command
    const cmdArgs: string[] = [];

    // Method
    const method = args.method?.toUpperCase() ?? 'GET';
    if (method !== 'GET') {
      cmdArgs.push('-X', method);
    }

    // Headers
    if (args.headers) {
      for (const [key, value] of Object.entries(args.headers)) {
        cmdArgs.push('-H', `${key}: ${value}`);
      }
    }

    // Body
    let bodyContent: string | undefined;
    if (args.data) {
      bodyContent = JSON.stringify(args.data);
      cmdArgs.push('-H', 'Content-Type: application/json');
    } else if (args.body) {
      bodyContent = args.body;
    }

    if (bodyContent) {
      cmdArgs.push('-d', bodyContent);
    }

    // Output to file
    if (args.output) {
      cmdArgs.push('-o', args.output);
    }

    // Include headers in output
    if (args.includeHeaders) {
      cmdArgs.push('-i');  // include HTTP headers in output
    }

    // Silent mode
    if (args.silent !== false) {
      cmdArgs.push('-s');  // silent (no progress)
    }

    // Timeout
    const timeout = args.timeout ?? 30;
    cmdArgs.push('--max-time', timeout.toString());

    // Follow redirects
    if (args.followRedirects !== false) {
      cmdArgs.push('-L');  // follow redirects
    }

    // Basic auth
    if (args.user) {
      cmdArgs.push('-u', args.user);
    }

    // Insecure (skip SSL verification)
    if (args.insecure) {
      cmdArgs.push('-k');
    }

    // URL (last)
    cmdArgs.push(args.url);

    // Execute curl
    const result = await (ctx as any).exec('curl', cmdArgs, { cwd, signal })
      ?? { code: 0, stdout: "", stderr: "" };

    const duration = Date.now() - startTime;
    const curlResult: CurlResult = {
      code: result.code,
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs: duration,
      url: args.url
    };

    // If includeHeaders, split headers/body
    if (args.includeHeaders && result.stdout) {
      const splitIdx = result.stdout.indexOf('\r\n\r\n');
      if (splitIdx !== -1) {
        curlResult.headers = result.stdout.substring(0, splitIdx);
        curlResult.stdout = result.stdout.substring(splitIdx + 4);
      } else {
        // Try \n\n
        const splitIdx2 = result.stdout.indexOf('\n\n');
        if (splitIdx2 !== -1) {
          curlResult.headers = result.stdout.substring(0, splitIdx2);
          curlResult.stdout = result.stdout.substring(splitIdx2 + 2);
        }
      }
    }

    return {
      code: result.code,
      stdout: result.stdout,
      stderr: result.stderr,
      data: curlResult
    };

  } catch (error: any) {
    return {
      code: 1,
      stdout: "",
      stderr: `curl error: ${error.message}`,
      data: undefined
    };
  }
}

// Custom renderer
export function renderResult(result: any, options: any, theme: any): any {
  if (result.code !== 0) {
    const err = result.stderr || 'Unknown error';
    return new Text(theme.fg("error", `❌ curl failed:\n${err}`));
  }

  const data = result.data as CurlResult | undefined;
  const lines: string[] = [];

  lines.push(theme.fg("accent", `🌐 HTTP Request:`));
  lines.push(`URL: ${theme.fg("highlight", data?.url || '')} ${theme.fg("dim", `(${data?.code || 0})`)}`);
  lines.push(`Time: ${theme.fg("dim", `${data?.durationMs ?? 0}ms`)}`);

  if (data?.headers) {
    lines.push("");
    lines.push(theme.fg("accent", "Response Headers:"));
    data.headers.split('\n').filter(Boolean).slice(0, 10).forEach(h => {
      lines.push(`  ${theme.fg("dim", h)}`);
    });
    if (data.headers.split('\n').length > 10) {
      lines.push(theme.fg("dim", "  ..."));
    }
  }

  if (data?.stdout) {
    lines.push("");
    lines.push(theme.fg("accent", "Response Body:"));
    const bodyPreview = data.stdout.length > 500 ? data.stdout.substring(0, 500) + '...' : data.stdout;
    lines.push(`  ${theme.fg("text", bodyPreview.replace(/\n/g, '\n  '))}`);
    if (data.stdout.length > 500) {
      lines.push(theme.fg("dim", `  ...(${data.stdout.length} total bytes)`));
    }
  }

  return new Text(lines.join("\n"));
}

export const StateClass = undefined;
export const getPersistencePath = undefined;
