# Project Profile

**Generated**: 2026-08-08T10:57:29.307Z
**Source**: Auto-detected at startup

## Size
- Category: **LARGE**
- Evidence:
  - LOC: 48584
  - Files: 343
  - Tests: 206
  - Dependencies: 19

## Risk
- Category: **HIGH**
- Evidence:
  - High-risk keywords: 447
  - Medium-risk keywords: 1584
  - Low-risk keywords: 8
- ⚠️ High-risk keywords detected – full compliance scanning enabled


## Deployment
- Category: **CLOUD**
- Cloud provider: detected



- Cost Optimization: Required

## Team
- Category: **SOLO**
- Evidence:
  - Authors (30d): 1
  - Commits (30d): 79
  - PR estimate: 0
  - CODEOWNERS: No
- Process: Self-merge allowed

## Applied Thresholds

| Metric | Standard | Adjusted | Reason |
|--------|----------|----------|--------|
| Max Function Lines | 20 | 15 | large size |
| Min Coverage | 80% | 85% | large size |
| Complexity Limit | 10 | 10 | Default |
| Security Scan | HIGH | CRITICAL | high risk |
| Performance Gates | Required | Yes | high risk |
| Compliance Matrix | Full | Yes | high risk |
| PR Reviews Required | 1 | 0 | solo team |
| SLA Initial Review | <24h | <168h | solo team |

## Manual Override

To override auto-detected profile, create `docs/PROJECT_PROFILE_OVERRIDE.md`:

```yaml
size: large
risk: high
deployment: cloud
team: large-org
```

Agent will use override values on next startup.

## Notes

- Profile auto-updates on agent startup (if evidence changes significantly)
- Adjustments applied to quality gates, testing pipeline, compliance scanning
- For questions, see GOAL.md §20.2 and docs/PROJECT_PROFILE.md
