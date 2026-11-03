#!/usr/bin/env node

/**
 * Unit checks for the pi-extension wiring.
 *
 * The wrapper must register both keyless lanes off the offline snapshot when
 * no listing answers (fetch rejects here on purpose, so the suite is hermetic),
 * must not double-register if the aggregator runs twice, and must never let a
 * failing lane take the rest of tau's extensions down — the failure is logged,
 * the call resolves.
 *
 * Each test re-imports the module (vi.resetModules) so the wrapper's
 * registered-flag and the extension's module-level roster state start clean.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/** A recording stand-in for ExtensionAPI: only what the OFM factory touches. */
function mockApi() {
  return {
    registerProvider: vi.fn(),
    unregisterProvider: vi.fn(),
    registerVirtualModel: vi.fn(),
    unregisterVirtualModel: vi.fn(),
    registerCommand: vi.fn(),
    on: vi.fn(),
  };
}

async function loadWrapper() {
  const { registerPiExtensionProvider } = await import("./pi-extension-provider.js");
  return registerPiExtensionProvider;
}

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline — the test blocks the listing"))));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("registerPiExtensionProvider", () => {
  it("registers both free lanes off the offline snapshot, plus the /ofm command", async () => {
    const api = mockApi();
    const registerPiExtensionProvider = await loadWrapper();

    await registerPiExtensionProvider(api as any);

    const providerIds = api.registerProvider.mock.calls.map((call) => call[0]);
    expect(providerIds).toEqual(["ofm-kilo", "ofm-opencode"]);

    const kilo = api.registerProvider.mock.calls.find((call) => call[0] === "ofm-kilo")?.[1];
    expect(kilo).toBeDefined();
    expect(kilo.api).toBe("ofm-free-api");
    expect(typeof kilo.streamSimple).toBe("function");
    expect(typeof kilo.refreshModels).toBe("function");
    expect(kilo.models.length).toBeGreaterThan(0);
    expect(kilo.models.map((m: any) => m.id)).toContain("reflection-beam-free");

    const opencode = api.registerProvider.mock.calls.find((call) => call[0] === "ofm-opencode")?.[1];
    expect(opencode).toBeDefined();
    expect(opencode.api).toBe("ofm-free-api");
    expect(opencode.models.map((m: any) => m.id)).toContain("deepseek-v4.1-flash-free");

    expect(api.registerCommand.mock.calls.map((call) => call[0])).toContain("ofm");
    expect(api.on.mock.calls.map((call) => call[0])).toContain("session_start");
  });

  it("is idempotent within a process", async () => {
    const api = mockApi();
    const registerPiExtensionProvider = await loadWrapper();

    await registerPiExtensionProvider(api as any);
    const calls = api.registerProvider.mock.calls.length;

    await registerPiExtensionProvider(api as any);
    expect(api.registerProvider.mock.calls.length).toBe(calls);
  });

  it("isolates a failing lane: logs the error and still resolves", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const api = mockApi();
    api.registerProvider.mockImplementation(() => {
      throw new Error("lane exploded");
    });
    const registerPiExtensionProvider = await loadWrapper();

    await expect(registerPiExtensionProvider(api as any)).resolves.toBeUndefined();

    expect(api.registerProvider).toHaveBeenCalled();
    const logged = errorSpy.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(logged).toContain("ofm free-model lanes");
  });
});
