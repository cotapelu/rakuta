import type { PromptTemplate } from '@earendil-works/pi-coding-agent';

/**
 * JF Prompt Template - Coding Guidelines
 *
 * Behavioral guidelines for professional coding assistance.
 * Slash command: /jf
 */

export const defaultAssistantPrompt: PromptTemplate = {
  name: 'jf',
  description: 'JF coding guidelines and best practices',
  filePath: '<inline:jf-prompts>',
  sourceInfo: {
    path: 'src/addon/prompts/default-assistant.prompt.ts',
    source: 'jf-prompts',
    scope: 'project',
    origin: 'top-level',
  },
  content: `# JF Coding Guidelines

## Core Principles

1. **Professional Engineering** - No hacks, no toy code. Production-ready only.
2. **User-First** - UX is priority. Think about who will maintain this code.
3. **Quality Over Speed** - Ship fast but never broken. Tests first, then code.
4. **No Guessing** - Read source, understand APIs, don't assume behavior.
5. **Existing Libraries** - Use @earendil-works packages first, never reimplement.
6. **Continuous Improvement** - Every change should make codebase better.

## Workflow Standards

**Always follow:**
- Read entire file before modifying
- Understand context and dependencies
- Write tests for new logic (red-green-refactor)
- Match existing code style
- Update documentation when APIs change
- Run quality checks before committing: lint, type-check, tests
- Verify no regressions with coverage reports

**Never do:**
- Delete code to make tests pass
- Modify unrelated files
- Leave dead code
- Commit without running tests
- Over-engineer for hypothetical futures

## Quality Gate (Must Pass)

Every change must meet:
- Functions ≤20 lines
- Complexity (cyclomatic) ≤10
- No 5+ line duplications
- Error handling 100% on public APIs
- Input validation 100% on external inputs
- No hardcoded secrets
- Coverage ≥80% for modified code
- All tests pass

## Security Checklist

- Parameterized queries for all SQL/NoSQL
- No eval() or unsafe Function()
- TLS 1.2+ for external calls
- KMS/secret manager for all credentials
- Auth on all state-changing endpoints
- XSS prevention (output encoding, CSP)
- Rate limiting for public APIs
- No PII in logs or error messages

## Observability Requirements

Every service/module should have:
- Structured JSON logging
- Correlation IDs propagated
- Prometheus metrics (counters, histograms)
- Health check endpoints (/health/live, /health/ready)
- Distributed tracing (OpenTelemetry) for cross-service calls

## Testing Standards

- Unit tests for all pure functions and business logic
- Integration tests for service contracts
- E2E tests sparingly (expensive)
- Branch coverage ≥80% for all code
- Error paths must be tested
- Fuzz testing for public input parsers

## Mental Testing Before Commit

Before any commit, mentally verify:
- Valid inputs work correctly
- Invalid inputs are rejected with proper errors
- Null/undefined/empty cases handled
- Boundary values tested
- Every conditional branch covered
- Error paths handled gracefully
- No security vulnerabilities introduced
- Performance acceptable (no O(n²), no blocking I/O)
- Data flow consistent (both write and read paths)

## Git Commit Messages

Use Conventional Commits:
- feat: New feature
- fix: Bug fix
- refactor: Code restructuring
- test: Add or update tests
- docs: Documentation changes
- chore: Build/CI changes

## When in Doubt

1. Read the source code in llm-context/
2. Consult AGENTS.md for full standards
3. Check AGENT_PROFILE.md for known weaknesses
4. Review EVOLUTION.md for trajectory
5. Ask clarifying questions rather than guessing

**Remember:** It's better to ask than to assume. It's better to write tests than to hope it works. It's better to simplify than to complicate.

`,
};

export default defaultAssistantPrompt;
