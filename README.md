# Rakuta - Ultimate Coding Agent CLI

> **J**F + **EVO** + **TAU** = The ultimate combined AI coding agent with the best features from all three codebases.

A production-ready AI coding assistant that combines the strongest features from three independent codebases into a single, powerful CLI tool.

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](package.json)
[![Tests](https://img.shields.io/badge/tests-2114%20passing-green.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](tsconfig.json)
[![License](https://img.shields.io/badge/license-Apache--2.0-orange.svg)](LICENSE)

---

## 🌟 Why Rakuta?

| Codebase | Best Feature | Status |
|---|---|---|
| **JF** | Master Tool, Bash Action, Compaction, Codebase Indexer, Session Tool, Skills, Time, Project Profile | ✅ Integrated |
| **EVO** | Builtin Tools Override, Clean CLI Delegation | ✅ Integrated |
| **TAU** | OFM Provider (Token Saver), Capability System (16 caps), Tracing, Observability | ✅ Integrated |

**Result**: A single CLI with **17 custom tools**, **16 capabilities across 5 plugins**, **2 providers (Kilo + OFM)**, **full project intelligence**, and **complete observability**.

---

## 🚀 Quick Start

```bash
# Install
npm install -g @cotapelu/rakuta
# OR run directly
npx @cotapelu/rakuta

# Basic usage
rakuta                                    # Interactive mode
rakuta "refactor this file"               # Quick task
rakuta --print "explain this code"        # Non-interactive output
rakuta --list-models                      # List available models
rakuta --version                          # Show version

# Advanced
echo "fix bugs" | rakuta                  # Stdin piping
rakuta @file1.ts @file2.ts "review"       # File arguments
```

---

## ✨ Features

### 🤖 Core Capabilities

| Category | Tools/Capabilities |
|---|---|
| **Code Intelligence** | `codebase_index` (AST search), `analyze`, `analyze_ast`, `ast_query`, `call_graph`, `dependency_tree`, `complexity`, `metrics`, `search`, `safe_edit`, `audit`, `benchmark`, `quality_gate` |
| **Development** | `build`, `format`, `scripts`, `test`, `audit` |
| **Git Operations** | `git_status`, `git_diff`, `git_log`, `git_commit`, `git_push`, `git_pull`, `git_branch`, `git_checkout`, `git_add` |
| **Security** | `scan` (secrets, vulnerabilities) |
| **System** | `metrics`, `health`, `audit` |

### 🛠️ Custom Tools (17)

| Tool | Description | Source |
|---|---|---|
| `bash_action` | Shell + glob with cache/rate-limit | JF |
| `compact_session` | Session history compaction | JF |
| `codebase_index` | AST-based symbol search | JF |
| `skills` | Load markdown skill files | JF |
| `get_time` | Timezone-aware time | JF |
| `master` | Unified command executor | JF |
| `session` | Session management (15 ops) | JF |
| `multi-agent` | Child agent orchestration | TAU/EVO |
| `todos` | Task tracking | ALL |
| `memory` | Persistent memory | ALL |
| `skill-reader` | Skill documentation loader | ALL |
| `subtool-loader` | Dynamic sub-tool loading | ALL |
| `tool-template` | Tool creation template | ALL |
| `find`/`grep`/`ls` | Builtin overrides | EVO |

### 🤖 Providers

| Provider | Features |
|---|---|
| **Kilo** | 397+ free models via kilo.ai gateway |
| **OFM** | **Token saver** (15 filters), **Chains** (fallback), **Lanes** (ofm-kilo, ofm-opencode) |

### 🔍 Project Intelligence

- **Auto-detection**: Project size, risk level, deployment type, team size
- **Profile-driven**: Adjusts quality gates, security scans, review requirements
- **Output**: `docs/PROJECT_PROFILE.md` for team alignment

### 📊 Observability

- **OpenTelemetry tracing** with `withSpan()` on all capability executions
- **Structured logging** with correlation IDs
- **Health checks** via `system.health` capability
- **Performance metrics** via `system.metrics`

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      STANDALONE CLI                             │
│  src/main.ts  →  Project Profile  →  Vendored SDK Main         │
│                          ↓                                      │
│              Global Runtime Hook (setCurrentRuntime)           │
│                          ↓                                      │
│              Extension Loading (25+ extensions)                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     EXTENSION LAYER                             │
│  • Capability System (16 caps, 5 plugins)                      │
│  • Providers (Kilo + OFM with token saver)                     │
│  • Tools (17 custom tools via registerTool)                    │
│  • Session/Multi-Agent orchestration                           │
│  • Master Tool (unified command executor)                      │
│  • Prompt Hooks (auto-continue, auto-compact)                  │
│  • Renderers (todos, memory, team-ops, branch-summary)         │
│  • Commands/Keybindings                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Component | Location | Why |
|---|---|---|
| **CLI Args / Main Lifecycle** | `src/main.ts` (standalone) | Framework constraints - extensions load AFTER runtime creation |
| **Project Profile** | `src/main.ts` | Must run BEFORE services creation |
| **Global Runtime Hook** | `src/main.ts` | Extensions cannot create/set runtime |
| **All Features** | `src/addon/extensions/` | Extension API provides full access post-runtime |

---

## 📦 Installation

### Global Install (Recommended)

```bash
npm install -g @cotapelu/rakuta
rakuta --version
```

### Local Development

```bash
git clone https://github.com/cotapelu/rakuta.git
cd rakuta
npm install
npm run build
./dist/cli.js --version
```

### As Pi Extension

```bash
pi install https://github.com/cotapelu/rakuta
# Adds capabilities, OFM provider, tools to existing pi installation
# Note: Loses CLI args, project profile, global runtime hook
```

---

## 🎯 Usage Examples

### Interactive Coding

```bash
rakuta
# Opens TUI with full tool access
```

### Quick Tasks

```bash
# Print mode (non-interactive)
rakuta --print "write a hello world in rust"

# JSON output for scripting
rakuta --mode json "list files in src"

# With file context
rakuta @src/main.ts "add error handling"
```

### Advanced Workflows

```bash
# Session management
rakuta --continue                    # Continue last session
rakuta --session abc123              # Resume specific session
rakuta --fork abc123                 # Fork from session

# Model selection
rakuta --provider anthropic --model claude-3-opus "complex task"
rakuta --list-models                 # See all available

# Export session
rakuta --export html session.jsonl
```

### Automation

```bash
# CI/CD integration
echo "review this PR" | rakuta --print --mode json > review.json

# Batch processing
for f in src/**/*.ts; do
  rakuta --print "@$f add JSDoc" >> docs.md
done
```

---

## ⚙️ Configuration

### Project Profile (Auto-generated)

```markdown
# docs/PROJECT_PROFILE.md
size: large
risk: high
deployment: cloud
team: small
```

### Settings

```json
// ~/.config/pi/settings.json or .pi/settings.json
{
  "theme": "dark",
  "enabledModels": ["anthropic/*", "openai/*"],
  "capabilities": {
    "codebase": true,
    "dev": true,
    "git": true,
    "security": true,
    "system": true
  }
}
```

### Environment Variables

```bash
export PICLAW_PLUGINS_DIR=/custom/plugins
export PICLAW_DEV=1
export PI_OFFLINE=1
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Type checking
npm run typecheck

# Linting
npm run lint
```

---

## 📁 Project Structure

```
rakuta/
├── src/
│   ├── main.ts                 # Standalone entry: profile → SDK main → runtime hook
│   ├── cli.ts                  # 3-line entry point
│   ├── project-profile.ts      # Project intelligence
│   ├── prompts/                # Custom prompt templates
│   ├── runtime-context.ts      # Global runtime accessors
│   ├── tools/                  # Core implementations (canonical)
│   │   ├── compaction/         # Session compaction algorithm
│   │   ├── indexer/            # AST-based codebase indexer
│   │   ├── session/            # Session management (15 ops)
│   │   ├── multi-agent/        # Child agent orchestration
│   │   ├── skills/             # Skill loader
│   │   ├── time/               # Time tool
│   │   └── utils/              # path-security, circuit-breaker
│   └── addon/
│       ├── registry.ts         # Extension registry
│       ├── extensions/
│       │   ├── factory.ts      # Unified registration (25+ extensions)
│       │   ├── capability-system/  # 16 capabilities, 5 plugins
│       │   ├── providers/      # Kilo + OFM (token saver, chains)
│       │   ├── master-tool/    # Unified command executor
│       │   ├── tools/          # 17 tool registrations
│       │   ├── session-tool/   # Session management
│       │   ├── team/           # Agent message bus, workspace
│       │   ├── renderers/      # Custom message renderers
│       │   ├── hooks/          # auto-continue, auto-compact
│       │   ├── commands/       # provider, team commands
│       │   ├── keybinding/     # Custom shortcuts
│       │   ├── piclaw-header/  # Header display
│       │   ├── prompt-hooks/   # Prompt injection
│       │   ├── buildin-tools/  # find/grep/ls override
│       │   ├── multi-agent-tool/  # Child orchestration
│       │   └── skill-reader/   # Skill documentation
│       └── utils/
│           ├── tracing.ts      # OpenTelemetry withSpan
│           └── icons.ts        # Icon constants
├── dist/                       # Built output
└── package.json
```

---

## 🔧 Development

### Adding a New Capability

```typescript
// src/addon/extensions/capability-system/plugins/codebase/capabilities/my-cap.ts
import { Capability } from "../../../types.js";

export const myCapability: Capability = {
  id: "codebase.my_cap",
  name: "My Capability",
  description: "Does something useful",
  pluginId: "codebase",
  tags: ["codebase", "analysis"],
  parameters: { type: "object", properties: {} },
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    return { content: [{ type: "text", text: "Done!" }] };
  }
};
```

### Adding a New Tool

```typescript
// src/addon/extensions/tools/my-tool.ts
import { ToolDefinition } from "@earendil-works/pi-coding-agent";

export const myTool: ToolDefinition = {
  name: "my_tool",
  label: "My Tool",
  description: "Does something",
  parameters: { type: "object", properties: {} },
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    return { content: [{ type: "text", text: "Result" }] };
  }
};

// Register in factory.ts
import { myTool } from "./tools/my-tool.js";
api.registerTool(myTool);
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing`
3. Run tests: `npm test`
4. Type check: `npm run typecheck`
5. Submit PR

---

## 📄 License

Apache-2.0 © 2024

---

## 🙏 Acknowledgments

Built on top of the excellent [Pi Coding Agent SDK](https://github.com/earendil-works/pi-coding-agent) by @earendil-works.

Combines the best of:
- **JF** (autonomous protocol, master tool, project intelligence)
- **EVO** (clean delegation, builtin overrides)
- **TAU** (OFM provider, capability system, observability)

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/cotapelu/rakuta/issues)
- **Discussions**: [GitHub Discussions](https://github.com/cotapelu/rakuta/discussions)

---

**Made with ❤️ by combining the best of three worlds.**
