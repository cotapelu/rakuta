# CAPABILITI.md — Rakuta Capability Gap Analysis

**Date:** 2026-07-19  
**Scope:** Comparison of `@earendil-works/pi-coding-agent` (v1.5.0) exports vs. actual imports in `src/`  
**Method:** Full scan of `index.d.ts` (500+ exports) + `src/` import grep + manual review

---

## ✅ Currently Used (~20 exports)

| Export | Source File(s) |
|--------|----------------|
| `ExtensionAPI` | factory.ts, all extensions |
| `ExtensionContext` | team-widget, session-tool, etc. |
| `ExtensionUIContext` | team-widget, renderers |
| `Theme` | all renderers |
| `ToolDefinition` | all capability plugins |
| `AgentSession` | multi-agent types |
| `AgentSessionRuntime` | multi-agent types |
| `AgentSessionServices` | multi-agent types |
| `AgentSessionEvent` | multi-agent runtime |
| `AgentToolResult` | all tool definitions |
| `AgentToolUpdateCallback` | capability router |
| `SessionManager` | session-tool manager |
| `SettingsManager` | session-tool manager |
| `ModelRuntime` | multi-agent types |
| `PromptTemplate` | prompt-hooks |
| `ProviderConfig` | provider-command |
| `ProviderModelConfig` | provider-command |
| `getAgentDir` | (imported, unused) |
| `VERSION` | (imported, unused) |
| `withFileMutationQueue` | todos-tool |
| `ToolResult` | session-tool router |

---

## 🔴 High Value — Should Integrate

| Capability | Module | Description | Current App Approach |
|------------|--------|-------------|----------------------|
| `EventBus` (`createEventBus`) | `core/event-bus.ts` | Pub/sub between extensions | Custom `message-bus.ts` |
| `KeybindingsManager` | `core/keybindings.ts` | Keybinding management | Custom `keybinding-extension.ts` |
| `DefaultPackageManager` | `core/package-manager.ts` | Install extensions from npm | Manual extension loading |
| `DefaultResourceLoader` / `loadProjectContextFiles` | `core/resource-loader.ts` | Auto-load AGENTS.md, context files | Manual file reading |
| `ModelRegistry` | `core/model-registry.ts` | Model registry | Custom provider registry |
| `createBashTool`, `createReadTool`, `createEditTool`, `createWriteTool`, `createFindTool`, `createGrepTool`, `createLsTool` | `core/sdk.ts` | Standard tool definitions | Custom sub-tools |
| `discoverAndLoadExtensions` | `core/extensions/index.ts` | Auto-discover extensions | Manual registration in factory.ts |
| `ProjectTrustStore` / `ProjectTrustManager` | `core/trust-manager.ts` | Trust management for project resources | Not implemented |

---

## 🟡 Medium Value — Could Be Useful

| Capability | Module | Description |
|------------|--------|-------------|
| `VirtualModelDefinition` / `VIRTUAL_MODEL_STATE_ENTRY` | `core/virtual-models.ts` | Virtual models (router between providers) — could replace OFM-provider chains |
| `Compaction` (`compact`, `shouldCompact`, `findCutPoint`, `generateSummary`) | `core/compaction/` | Compaction utilities — improve auto-compact |
| `ContextEvent` / `ContextEditEntry` | `core/extensions/` | Context editing events |
| `SessionBoundaryDraft` | `core/session-manager.ts` | Session boundary management for handoff |
| `EntryRenderer` / `MessageRenderer` | `core/extensions/` | Custom renderers for entries/messages |
| `MarkdownTransformer` | `core/extensions/` | Transform markdown output |
| `TerminalInputHandler` | `core/extensions/` | Terminal input handling |
| `ReadonlyFooterDataProvider` | `core/footer-data-provider.ts` | Footer data provider for status bar |
| `McpServersChangeEvent` | `core/mcp-servers.ts` | MCP server change events |
| `CacheWarmingDecision` | `core/cache-warmer.ts` | Cache warming |
| `createSyntheticSourceInfo` | `core/source-info.ts` | Source info synthesis |
| `AuthStorage` / `readStoredCredential` | `core/auth-storage.ts` | Auth storage |
| `SettingsDiagnostics` | `core/settings-diagnostics.ts` | Settings diagnostics |
| `SessionExport` | `core/session-export.ts` | Session export (app hasn't implemented) |
| `NestedToolCalls` | `core/nested-tool-calls.ts` | Nested tool calls |
| `OutputGuard` | `core/output-guard.ts` | Output guard |
| `CrashLog` | `core/crash-log.ts` | Crash logging |
| `BugReport` / `BugReportUpload` | `core/bug-report*.ts` | Bug reporting |
| `Diagnostics` | `core/diagnostics.ts` | Diagnostics |

---

## 🟢 Low Value / Niche

| Capability | Module | Description |
|------------|--------|-------------|
| `ArminComponent`, `BorderedLoader`, `DynamicBorder` | `modes/interactive/components/` | TUI components available |
| `ModelSelectorComponent`, `SessionSelectorComponent` | `modes/interactive/components/` | Selector components |
| `OAuthSelectorComponent`, `LoginDialogComponent` | `modes/interactive/components/` | Auth UI |
| `SettingsSelectorComponent` | `modes/interactive/components/` | Settings UI |
| `ThemeSelectorComponent` | `modes/interactive/components/` | Theme picker |
| `ToolExecutionComponent` | `modes/interactive/components/` | Tool execution UI |
| `copyToClipboard` | `utils/clipboard.ts` | Clipboard |
| `convertToPng`, `resizeImage`, `formatDimensionNote` | `utils/image-*.ts` | Image utilities |
| `parseFrontmatter`, `stripFrontmatter` | `utils/frontmatter.ts` | Frontmatter parsing |
| `detectSupportedImageMimeTypeFromFile` | `utils/mime.ts` | MIME detection |
| `getShellConfig`, `getPowerShellConfig` | `utils/shell.ts` | Shell config |
| `formatReadLineRange` | `core/tools/render-utils.ts` | Read line range formatting |
| `hasTrustRequiringProjectResources` | `core/trust-manager.ts` | Trust check |

---

## ❌ Not Used and Not Needed

| Capability | Reason |
|------------|--------|
| `RpcClient`, `runRpcMode`, `runPrintMode` | App is TUI, not RPC |
| `InteractiveMode`, `JsonAgentSessionEvent` | App manages its own UI |
| `PowerShellToolDefinition`, `createPowerShellTool` | Linux-only app |
| `loadSkillsFromDir` | App uses custom skill reader |
| `createCodemodeExtension` | Separate package (`pi-codemode`), not integrated |
| `createMcpExtension` | Separate package (`pi-mcp`), not integrated |
| `createToolSearchExtension` | Separate package, not integrated |
| `main()` / `MainOptions` | App has its own cli.ts |
| `RpcExtensionUIRequest/Response` | RPC mode, not used |

---

## 📊 Summary

| Category | Count | Status |
|----------|-------|--------|
| Already used | ~20 exports | ✅ |
| Not used (high value) | 8 features | 🔴 Should integrate |
| Not used (medium value) | ~18 features | 🟡 Could be useful |
| Not used (low/niche) | ~15 utilities | 🟢 Not urgent |
| Not needed | ~9 features | ❌ Not applicable |

---

## 🎯 Top 3 Recommendations

1. **`EventBus`** (`createEventBus`) — Replace custom `message-bus.ts`, reduce complexity, use built-in pub/sub
2. **`DefaultResourceLoader`** (`loadProjectContextFiles`) — Auto-load AGENTS.md/context files instead of manual reading
3. **Tool factories** (`createBashTool`, `createReadTool`, etc.) — Replace custom sub-tools with SDK-standard implementations, reduce maintenance burden

Additionally, `ProjectTrustStore` and `VirtualModelDefinition` are worth considering for security and provider routing respectively.
