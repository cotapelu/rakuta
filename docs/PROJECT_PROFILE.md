# Project Profile

**Generated**: 2026-11-25T14:34:51.118Z
**Source**: Auto-detected at startup

## Size
- Category: **LARGE**
- Evidence:
  - LOC: 71905
  - Files: 496
  - Tests: 238
  - Dependencies: 27

## Risk
- Category: **HIGH**
- Evidence:
  - High-risk keywords: 679
  - Medium-risk keywords: 2022
  - Low-risk keywords: 105
- ⚠️ High-risk keywords detected – full compliance scanning enabled


## Deployment
- Category: **CLOUD**
- Cloud provider: detected



- Cost Optimization: Required

## Team
- Category: **SMALL**
- Evidence:
  - Authors (30d): 3
  - Commits (30d): 47
  - PR estimate: 0
  - CODEOWNERS: No
- Process: 1 review required

## Applied Thresholds

| Metric | Standard | Adjusted | Reason |
|--------|----------|----------|--------|
| Max Function Lines | 20 | 15 | large size |
| Min Coverage | 80% | 85% | large size |
| Complexity Limit | 10 | 10 | Default |
| Security Scan | HIGH | CRITICAL | high risk |
| Performance Gates | Required | Yes | high risk |
| Compliance Matrix | Full | Yes | high risk |
| PR Reviews Required | 1 | 1 | small team |
| SLA Initial Review | <24h | <4h | small team |

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
