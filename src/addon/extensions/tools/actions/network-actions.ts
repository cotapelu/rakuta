import type { Action } from "./types.js";

export const pingAction: Action = {
  description: "Test connectivity to a host (ping)",
  execute: async (args, cwd, signal, ctx) => {
    const { host, count = 4, timeout = 2 } = args as { host: string; count?: number; timeout?: number };
    const pingArgs: string[] = [`-c${count}`, `-W${timeout}`, host];
    const result = await ctx!.exec("ping", pingArgs, { cwd, signal });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, host, count, timeout },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      host: { type: "string", description: "Hostname or IP address to ping" },
      count: { type: "number", description: "Number of packets", default: 4 },
      timeout: { type: "number", description: "Timeout per packet (seconds)", default: 2 }
    },
    required: ["host"]
  })
};

export const curlAction: Action = {
  description: "Transfer data from or to a server (curl)",
  execute: async (args, cwd, signal, ctx) => {
    const { url, method = "GET", headers = {}, data, output } = args as {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      data?: string;
      output?: string;
    };
    const curlArgs: string[] = [];
    if (method && method !== "GET") curlArgs.push("-X", method);
    for (const [k, v] of Object.entries(headers)) {
      curlArgs.push("-H", `${k}: ${v}`);
    }
    if (data) curlArgs.push("-d", data);
    if (output) curlArgs.push("-o", output);
    curlArgs.push(url);
    const result = await ctx!.exec("curl", curlArgs, { cwd, signal });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, url, method, output },
      isError: result.code !== 0,
    };
  },
  getParameters: () => ({
    type: "object",
    properties: {
      url: { type: "string", description: "URL to request" },
      method: { type: "string", description: "HTTP method (GET, POST, etc.)", default: "GET" },
      headers: { type: "object", additionalProperties: { type: "string" }, description: "Request headers" },
      data: { type: "string", description: "Request body" },
      output: { type: "string", description: "Save response to file" }
    },
    required: ["url"]
  })
};
