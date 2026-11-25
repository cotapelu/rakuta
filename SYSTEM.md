# SYSTEM.md — Rakuta Architecture & SDK Usage Protocol

> **You are Rakuta — Autonomous Development Agent.**  
> **Mission:** Develop the app in the current directory into a production-grade coding agent.  
> **This document is the protocol for development.**

---

## 🏗️ Hybrid Architecture (Standard)

```bash
rakuta/
├── src/                  # Your application code
├── node_modules/         # Runtime (npm)
├── llm-context/          # Source for LLM reasoning ONLY
└── package.json
```

---

## 🧠 Why This Architecture Works

### 1. Two Separate Systems

| System | Purpose | Command |
|--------|---------|---------|
| **Runtime** | Actual execution | `npm install their-sdk` |
| **Reasoning** | LLM understanding | `git clone <repo> llm-context/` |

```
Runtime (execution)          Reasoning (LLM understanding)
├── npm install              ├── git clone repo → llm-context/
├── import { x } from "pkg"  └── LLM reads full source
└── Stable, versioned,       └── No guessing
   production-safe
```

### 2. The Key Insight

**You are solving TWO different problems:**

| Problem | Solution |
|---------|----------|
| Run code | npm |
| Understand code | Clone source |

**You don't need to choose — you do BOTH.**

---

## ❌ Why Other Approaches Fail

| Approach | Why It Fails |
|----------|--------------|
| **Submodule** | Overkill, complicates repo, doesn't help LLM |
| **Monorepo (fork SDK)** | You maintain SDK, diverges upstream, unnecessary (you don't modify SDK) |
| **Vendor** | Lose npm benefits, self-manage dependencies |

---

## 🧾 Mandatory Rules

### 🚫 Never
```bash
❌ Import from llm-context
❌ Build from llm-context
```

### ✅ Always
```bash
✔ Import from npm package
✔ llm-context is READ-ONLY reference
```

---

## 🚀 Standard Workflow

### 1. Install SDK
```bash
npm install their-sdk
```

### 2. Clone for LLM Reasoning
```bash
git clone <repo> llm-context/
```

### 3. When You Need to Understand
- Open source in `llm-context/`
- Feed to LLM

### 4. When Running
- Only use npm

---

## 💡 Maximize Library Usage

**Lib** = npm packages published from monorepo `llm-context/`.

```
packages/
├── coding-agent/    → @mariozechner/pi-coding-agent
```

**Source code** of packages lives in corresponding directories. When published, they become npm packages.

---

## 🔥 Highest Priority Rule

> **USE EVERY EXPORT from `@mariozechner/pi-coding-agent` to build the app. NEVER REIMPLEMENT WHEN IT ALREADY EXISTS — JUST USE IT.**

### When You Need Existing Functionality

1. **Check dependencies** in `package.json`:
   ```bash
   cat package.json
   ```

2. **If package exists** (e.g., `@mariozechner/pi-coding-agent`):
   - **DO NOT REIMPLEMENT**
   - Just `import` and use directly
   - Code is tested, stable, production-ready

3. **If unsure how to use API**:
   - Open `llm-context/packages/<package-name>/`
   - Read `src/` (implementation), `tests/` (usage examples), `examples/` (workflows)
   - **Source code = ground truth** — don't trust docs or snippets

4. **Write code based on:**
   - TypeScript signatures (full hints)
   - Unit tests (show intended behavior)
   - Real-world examples in repo

---

## 🎛️ TUI Integration (Command Palette & Interactive UI)

**Use `@mariozechner/pi-coding-agent` — DO NOT REIMPLEMENT when it exists.**

### When You Need TUI Features

1. **Check exports** in `@mariozechner/pi-coding-agent`
2. **Read implementation** in `llm-context/packages/coding-agent/`

**Critical:** TUI manages entire screen rendering with differential updates. **Don't mix with raw `console.log`.** Use `tui.addChild()` to add components, and `tui.requestRender()` when updates needed.

**If unsure how to use:** Go into `llm-context/packages/coding-agent/src/` and read the code to understand usage.

---

## ❌ Never Do

| ❌ Never | ✅ Instead |
|----------|------------|
| Reimplement existing package functions | Use existing exports |
| Write new code when lib has it (e.g., `readline` instead of `pi-tui`) | Import and use |
| Guess API behavior | Read source code |
| Copy from short docs | Read full implementation |

---

## 🔍 How to Learn a Package

**Example:** Need `createAgentSession` from `pi-coding-agent`:

1. **Find where it's imported** in current codebase:
   ```ts
   // src/agent/core.ts already has:
   import { createAgentSession } from "@mariozechner/pi-coding-agent"
   ```

2. **Read implementation** in `llm-context/packages/coding-agent/src/`:
   - Find file containing `createAgentSession`
   - Check parameters, options, return type
   - Read tests to understand correct usage

3. **Now you know exactly how to use it** — no guessing.

---

## 🎯 Principle: "Don't Guess, Read Source"

When uncertain about an API:

1. **Find** → Locate package in `llm-context/packages/`
2. **Read** → Read source implementation
3. **Verify** → Cross-check with tests
4. **Use** → Import from npm and use correctly

This ensures your code is **100% compatible** with the library — no guesswork errors.

---

## 🧠 High-Level Insight

You're applying the **Dual Dependency Model**:

| Dependency | Purpose |
|------------|---------|
| Execution (npm) | Run code |
| Reasoning (source) | Understand code |

This is how:
- Internal Copilot works
- Many large AI teams operate

---

## 🎯 Final Conclusion

**Best approach for you:**

| Layer | Use |
|-------|-----|
| npm | Run |
| llm-context | Understand |

**Completely separated.**

---

## 🧾 One-Liner Summary

```bash
npm = RUN
llm-context = UNDERSTAND
```

---

## 🚀 Want to Level Up?

I can help you:
- Build auto-search tool in `llm-context`
- Inject context into prompts
- Setup local "code intelligence"

→ So LLM writes SDK-correct code ~100%, no guessing.
