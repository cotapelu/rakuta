# AUTO-CONTINUE.md — Autonomous Agent Workflow
*Version: v2.1 Compact (AGENTS.md compliant)*

---

## 🔄 Workflow (Mandatory)

```
Analyze → Clarify → Plan → Test(fail) → Implement → Refactor → Optimize → Verify

LOOP: while failed || improvable || not_minimal:
  detect → improve → test → verify
```

---

## 🚀 Session Start (Required)

At the start of **every new session** or after reading new codebase:

1. **Read entire repository** — understand current state
2. **Read `docs/PROJECT_STATE.md`** (if exists) — current status
3. **Understand capabilities & failures** — what works, what doesn't
4. **Identify next highest-impact task** — prioritize by impact
5. **Implement improvements** — follow workflow
6. **Run tests/builds** — use tools
7. **Update `PROJECT_STATE.md`** — record progress
8. **Update `TODO.md`** — mark completed, add follow-ups

---

## 🔄 Continuous Loop Mode (Default)

**Continuous evolution.** After completing an iteration:

- Identify next highest-impact TODO
- Continue work **immediately** — even without new user prompt

**Stop only if:**
- User explicitly says stop/pause
- Tests/builds fail and need clarification
- No actionable TODO items remain

---

## 📈 Evolution & Self-Improvement (Core)

**Every loop iteration MUST update evolution files:**

| File | Purpose |
|------|---------|
| `docs/AGENT_METRICS.md` | Iterations/task, test failure rate, rollback count, regressions, MTTR |
| `docs/AGENT_PROFILE.md` | Common failures, weak languages/stacks, fragile modules, weaknesses |
| `docs/EVOLUTION.md` | Trajectory changes, planned refactors, anticipated debt updates |

**Meta-Goal:** System breaks less, fixes faster, plans further ahead, fewer repeated mistakes.

---

## 📝 Git Commit (Mandatory)

**AFTER completing each loop iteration:**

```bash
git add -A
git commit -m "chore: evolution round - <brief description>"
```

**Only after commit completes** — start next iteration.

---

## 🧠 Mental Testing (No Code Writing)

Before writing code, mentally verify:
- Valid / invalid / null / edge case inputs
- Every logic branch covered?
- Error paths handled?
- Data flow both directions (UI→DB and DB→UI)
- **If missing → WRITE MORE CODE** (don't skip)

---

## 🛡️ Code Preservation (No Deletion)

### Debugging Protocol (Mandatory)

1. **Read entire file** (not just suspected section)
2. **Understand context** — dependencies, structure, related logic
3. **Find root cause** — check braces, imports, async/sync, lifetimes
3. **Incremental isolation** — add debug prints, isolate sections, test hypotheses step-by-step
4. **Systematic** — Read → Understand → Isolate → Test → Verify

### If Still Failing
- Consult team
- Review git history
- Pair programming
- **Disable feature temporarily** instead of deleting code
- Always have a restore plan

### ❌ Absolutely Forbidden
- Delete code to pass tests
- "Band-aid" temporary fixes
- Accept degradation

---

## ⚖️ Change Cost & Risk Assessment

**Every Feature/Refactor/Migration must assess:**

| Factor | Requirement |
|--------|-------------|
| Engineering cost | Hours / days |
| Risk level | **Low** / **Medium** / **High** |
| Estimated rollback time | Time to revert |

**Prefer:** Low-risk, high-impact > high-risk, aesthetic/speculative.

---

## ✍️ Missing Code = Write More

| ❌ Don't | ✅ Do |
|----------|-------|
| Skip because "not required" | Write missing feature/API/logic/edge case |
| Remove code to simplify | Write more, don't remove |
| Reduce scope to pass fast | App must become **more complete**, not less |

> **App must continuously become more complete, never less complete.**

---

## 📚 Skill Integration (Required)

Read skill file **before** modifying related code:

| Skill | Use Case |
|-------|----------|
| `angular-modular-architect` | Angular SPA architecture |
| `backend-db-pattern` | Database design (4 steps) |
| `code-review` | Code cleanup |
| `dotnet-modular-architect` | .NET modular monolith |
| `erp-architect` | Fullstack ERP (BE .NET + FE Angular) |
| `iam-platform-layer` | Auth/Authorization platform |
| `go-architect` | Go services |
| `python-architect` | Python applications |
| `react-architect` | React apps |
| `rust-architect` | Rust systems |

> **Rule:** Read skill `.md` file **before** modifying related code.

---

## 🔍 Debugging Checklist

### Systematic Process
1. Read **entire file** (every line, imports)
2. Understand context (structure, related logic)
3. Isolate problem (reproduction case)
4. Test hypotheses (debug prints, unit tests)
5. Verify fix (no regression)

### Per-File Checklist
- [ ] Read entire file before modify
- [ ] Identify root cause (don't skip)
- [ ] Check braces, parentheses, indentation
- [ ] Verify async/await, promises
- [ ] Check lifetimes (memory, connections)
- [ ] Review error logs full context
- [ ] Add debug output if needed
- [ ] Isolate section with comments
- [ ] Test hypotheses step-by-step
- [ ] Verify happy & error paths

### If Still Failing
- Consult team
- Review git history
- **Disable feature temporarily** (don't delete)
- Plan restore

### ❌ Absolutely Forbidden
- Delete code to pass tests
- Band-aid temporary fixes
- Accept degradation

---

## 📋 Quick Reference

### Mental Test Prompt
```
Inputs/Outputs/Branches/Errors/DataFlow(UI↔DB)/Security/Performance/Concurrency/State/Observability
```

### Quality Gate Checklist
```
[✔] Funcs ≤20 lines | Complexity ≤10 | No dup5 | 100% ErrHnd | 100% Val | No secrets | Testable
[✔] Cov ≥80% | Tests pass | No 12 anti-patterns | Devil's advocate | Mental test done
[✔] Flow coverage (UI→DB & DB→UI) | Missing code written | Code preserved
[✔] Risk assessed (Low/Med/High) | Git committed
```

### Risk Levels
| Level | Examples |
|-------|----------|
| **Low** | Docs, refactor same module, add tests, fix typos |
| **Medium** | Add feature, modify API, change DB schema |
| **High** | Rewrite core, change architecture, security fix |

### Git Commit Format
```
feat: <description>
fix: <description>
refactor: <description>
chore: evolution round - <description>
```

---

## 🎯 Principles, Scope & Targets

### Principles
- **Simplicity-first** (200→50 lines)
- **No over-engineering**
- **Declarative > Imperative**
- **Readable > Clever**

### Scope
| In Scope | Out of Scope |
|----------|--------------|
| Security, Testing, Bug Fix | DevOps, Infra, CI/CD |
| Code Quality, Performance | Deployment, Cloud, Ops |
| Scalability | Meetings |

### Targets
| Metric | Target |
|--------|--------|
| Coverage | ≥80% |
| Functions | ≤20 lines |
| Complexity | ≤10 |
| Security | 100% |
| Self-Score | ≥90 |

---

## ✅ Done & Anti-Slop

### Done = All Of:
- [ ] Requirements met
- [ ] Tests 100% pass
- [ ] Minimal & clear code
- [ ] No hidden assumptions
- [ ] No regression

### Anti-Slop (Strictly Forbidden)
| Forbidden | Description |
|-----------|-------------|
| Bloat | Unnecessary code/abstraction |
| Over-abstraction | Premature abstraction |
| Side effects | Unintended side effects |
| Duplication | Copy-paste duplication |
| Premature optimization | Optimizing before measuring |

---

*v2.1 Compact — Evolution-focused workflow with all critical features.*
