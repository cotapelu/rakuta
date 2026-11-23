#!/usr/bin/env node

/**
 * Provider Management Command
 *
 * /providers list|add|remove|test
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Container, Text, Spacer } from "@earendil-works/pi-tui";
import { parseArgs } from "../utils/command-args.js";

function buildProviderMap(models: any[]): Map<string, { name: string; baseUrl?: string; models: string[] }> {
  const map = new Map<string, { name: string; baseUrl?: string; models: string[] }>();
  for (const m of models) {
    const provider = m.provider;
    if (!map.has(provider)) {
      // @ts-ignore
      map.set(provider, { name: provider, baseUrl: m.providerBaseUrl, models: [] });
    }
    map.get(provider)!.models.push(m.id);
  }
  return map;
}

function mapProviderInfo(providers: Map<string, { name: string; baseUrl?: string; models: string[] }>): Array<{ name: string; displayName: string; modelCount: number; baseUrl?: string }> {
  return Array.from(providers.values()).map(p => ({
    name: p.name,
    displayName: p.name,
    modelCount: p.models.length,
    baseUrl: p.baseUrl,
  }));
}

function getProviderInfo(ctx: any): Array<{ name: string; displayName: string; modelCount: number; baseUrl?: string }> {
  const modelRegistry = ctx.modelRegistry;
  const allModels = modelRegistry.getAll();
  const providers = buildProviderMap(allModels);
  return mapProviderInfo(providers);
}

function buildProvidersComponent(theme: any, infos: any[]): Container {
  const container = new Container();
  container.addChild(new Text(theme.fg("accent", theme.bold("📦 Registered Providers")), 1, 0));
  container.addChild(new Spacer(1));
  for (const info of infos) {
    const line = `• ${info.displayName} (${info.name}) - ${info.modelCount} models`;
    if (info.baseUrl) {
      container.addChild(new Text(`${theme.fg("text", line)} ${theme.fg("dim", `[${info.baseUrl}]`)}`, 0, 0));
    } else {
      container.addChild(new Text(theme.fg("text", line), 0, 0));
    }
  }
  return container;
}

async function handleList(ctx: any): Promise<void> {
  const infos = getProviderInfo(ctx);
  if (infos.length === 0) {
    ctx.ui.notify("No providers registered", "info");
    return;
  }
  await ctx.ui.custom((_tui: any, theme: any, _kb: any, done: any) => {
    const container = buildProvidersComponent(theme, infos);
    const component = {
      render(w: number) { return container.render(w); },
      invalidate() { container.invalidate(); },
      handleInput(_: string) { done(undefined); },
    };
    return component;
  });
}

function handleAdd(ctx: any, args: string[]): void {
  const providerName = args[0];
  const baseUrl = args[1];
  const apiKey = args[2];
  if (!providerName || !baseUrl || !apiKey) {
    ctx.ui.notify("Usage: /providers add <name> <baseUrl> <apiKey>", "error");
    return;
  }
  try {
    ctx.modelRegistry.registerProvider(providerName, { name: providerName, baseUrl, apiKey });
    ctx.ui.notify(`Added provider ${providerName}`, "info");
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : String(e);
    // Avoid leaking apiKey in error messages
    ctx.ui.notify(`Failed to add provider ${providerName}: ${msg.replace(apiKey, "[REDACTED]")}`, "error");
  }
}

function handleRemove(ctx: any, args: string[]): void {
  const providerName = args[0];
  if (!providerName) {
    ctx.ui.notify("Usage: /providers remove <name>", "error");
    return;
  }
  ctx.modelRegistry.unregisterProvider(providerName);
  ctx.ui.notify(`Removed provider ${providerName}`, "info");
}

function handleTest(ctx: any, args: string[]): void {
  const providerName = args[0];
  if (!providerName) {
    ctx.ui.notify("Usage: /providers test <name>", "error");
    return;
  }
  try {
    const available = ctx.modelRegistry.getAvailable();
    const count = available.filter((m: any) => m.provider === providerName).length;
    if (count === 0) {
      ctx.ui.notify(`No available models for ${providerName} (auth required)`, "warning");
    } else {
      ctx.ui.notify(`${providerName} OK: ${count} models available`, "info");
    }
  } catch (e: any) {
    ctx.ui.notify(`Test failed: ${e.message}`, "error");
  }
}

async function providerCommandHandler(args: string, ctx: any): Promise<void> {
  const parsed = parseArgs(args);
  const action = parsed.action || "list";
  switch (action) {
    case "list":
      await handleList(ctx);
      break;
    case "add":
      handleAdd(ctx, parsed.args);
      break;
    case "remove":
      handleRemove(ctx, parsed.args);
      break;
    case "test":
      handleTest(ctx, parsed.args);
      break;
    default:
      ctx.ui.notify(`Unknown action: ${action}`, "error");
  }
}

export function registerProviderCommand(api: ExtensionAPI): void {
  api.registerCommand("providers", {
    description: "Manage LLM providers: list, add, remove, test",
    handler: providerCommandHandler,
  });
}
