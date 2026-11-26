/**
 * Project Profile Auto-Detection
 * Adjusts quality thresholds based on project size, risk, deployment, team
 * GOAL.md §20.2 + docs/PROJECT_PROFILE.md
 */

import { promises as fs } from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execAsync = promisify(exec);

export type ProjectProfile = {
  size: 'small' | 'medium' | 'large';
  risk: 'low' | 'medium' | 'high';
  deployment: 'cloud' | 'on-prem' | 'serverless' | 'edge';
  team: 'solo' | 'small' | 'large-org';
  evidence: Record<string, any>;
};

export type QualityConfig = {
  maxFunctionLines: number;
  maxComplexity: number;
  minCoverage: number;
  securityScanLevel: 'low' | 'high' | 'critical';
  requirePerformanceGates: boolean;
  requireComplianceMatrix: boolean;
  requiredPRReviews: number;
  slaInitialReviewHours: number;
};

/**
 * Main detection function - runs at startup
 */
export async function detectProjectProfile(cwd: string): Promise<ProjectProfile> {
  const evidence: Record<string, any> = {};

  // 1. Detect size
  const size = await detectSize(cwd, evidence);

  // 2. Detect risk
  const risk = await detectRisk(cwd, evidence);

  // 3. Detect deployment
  const deployment = await detectDeployment(cwd, evidence);

  // 4. Detect team
  const team = await detectTeam(cwd, evidence);

  return { size, risk, deployment, team, evidence };
}

/**
 * Size detection: LOC, files, tests, dependencies
 */
async function countSourceFilesAndLoc(cwd: string, evidence: Record<string, any>): Promise<{ fileCount: number; loc: number }> {
  const { stdout: fileCountStr } = await execAsync(
    'find src -type f \\( -name "*.ts" -o -name "*.js" \\) 2>/dev/null | wc -l',
    { cwd }
  );
  const fileCount = parseInt(fileCountStr.trim(), 10) || 0;
  evidence.fileCount = fileCount;

  const { stdout: locStr } = await execAsync(
    'find src -type f \\( -name "*.ts" -o -name "*.js" \\) -exec cat {} + 2>/dev/null | wc -l',
    { cwd }
  );
  const loc = parseInt(locStr.trim(), 10) || 0;
  evidence.loc = loc;
  return { fileCount, loc };
}

async function countTestFiles(cwd: string, evidence: Record<string, any>): Promise<number> {
  const { stdout: testCountStr } = await execAsync(
    'find src -type f \\( -name "*.test.*" -o -name "*.spec.*" \\) 2>/dev/null | wc -l',
    { cwd }
  );
  const testCount = parseInt(testCountStr.trim(), 10) || 0;
  evidence.testCount = testCount;
  return testCount;
}

async function countDependencies(cwd: string, evidence: Record<string, any>): Promise<number> {
  try {
    const pkgPath = path.join(cwd, 'package.json');
    const pkgContent = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(pkgContent);
    const deps = Object.keys(pkg.dependencies || {}).length + Object.keys(pkg.devDependencies || {}).length;
    evidence.dependencyCount = deps;
    return deps;
  } catch {
    evidence.dependencyCount = 0;
    return 0;
  }
}

function classifySize(fileCount: number, loc: number, testCount: number, deps: number): 'small' | 'medium' | 'large' {
  if (loc < 10_000 && fileCount < 100 && testCount < 50 && deps < 20) {
    return 'small';
  }
  if (loc > 100_000 || fileCount > 500 || testCount > 200 || deps > 50) {
    return 'large';
  }
  return 'medium';
}

async function detectSize(cwd: string, evidence: Record<string, any>): Promise<'small' | 'medium' | 'large'> {
  try {
    const { fileCount, loc } = await countSourceFilesAndLoc(cwd, evidence);
    const testCount = await countTestFiles(cwd, evidence);
    const deps = await countDependencies(cwd, evidence);
    return classifySize(fileCount, loc, testCount, deps);
  } catch (error) {
    console.warn('[ProjectProfile] Size detection failed:', error);
    return 'medium'; // default
  }
}

/**
 * Risk detection: keyword scanning in repo
 */
async function detectRisk(cwd: string, evidence: Record<string, any>): Promise<'low' | 'medium' | 'high'> {
  const keywords = {
    high: [
      'payment', 'card', 'billing', 'credit', 'cvv', 'pan',
      'health', 'medical', 'patient', 'phi', 'hipaa',
      'gdpr', 'pii', 'ssn', 'personal data', 'data protection',
      'pci', 'dss', 'soc2', 'sox', 'compliance', 'audit'
    ],
    medium: [
      'api', 'public', 'customer-facing', 'production', 'service',
      'webhook', 'oauth', 'jwt', 'authentication', 'authorization'
    ],
    low: [
      'internal tool', 'admin panel', 'prototype', 'poc', 'demo',
      'proof of concept', 'internal only', 'localhost'
    ]
  };

  try {
    // Use git grep to count matches efficiently without reading all file contents.
    // Levels are independent, so the greps run in parallel (no await-in-loop).
    const countEntries = await Promise.all(
      Object.entries(keywords).map(async ([level, words]) => {
        const pattern = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'); // escape regex
        try {
          const { stdout } = await execAsync(
            `git grep -i -E '${pattern}' -- . ':!node_modules' ':!dist' ':!.git' 2>/dev/null || true`,
            { cwd, shell: '/bin/bash' }
          );
          const lines = stdout.split('\n').filter(l => l.trim().length > 0);
          return [level, lines.length] as const;
        } catch {
          return [level, 0] as const;
        }
      })
    );
    const counts: Record<string, number> = Object.fromEntries(countEntries);

    evidence.riskKeywordCounts = counts;

    if (counts.high > 0) {
      return 'high';
    } else if (counts.medium > 0) {
      return 'medium';
    } 
      return 'low';
    
  } catch (error) {
    console.warn('[ProjectProfile] Risk detection failed:', error);
    // Check for explicit compliance docs as fallback
    try {
      const compliancePath = path.join(cwd, 'docs', 'COMPLIANCE.md');
      await fs.access(compliancePath);
      return 'high'; // compliance file exists → likely high risk
    } catch {
      return 'medium'; // conservative default
    }
  }
}

function findIndicator(indicators: Record<string, RegExp>, primary: string, secondary?: string): string | null {
  for (const [key, regex] of Object.entries(indicators)) {
    if (regex.test(primary) || (secondary && regex.test(secondary))) {
      return key;
    }
  }
  return null;
}

/**
 * Deployment detection: cloud providers, serverless, edge
 */
async function detectDeployment(cwd: string, evidence: Record<string, any>): Promise<'cloud' | 'on-prem' | 'serverless' | 'edge'> {
  try {
    // Check package.json for cloud SDKs
    const pkgPath = path.join(cwd, 'package.json');
    const pkgContent = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(pkgContent);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    const cloudIndicators = {
      'aws': /@aws-sdk|aws-sdk|aws-cdk|serverless-aws/i,
      'gcp': /@google-cloud|gcp|firebase|gcloud/i,
      'azure': /@azure|azure-sdk|azure-functions/i
    };

    const serverlessIndicators = {
      'serverless': /serverless\.yml|serverless\.json|\.lambda\.ts/i,
      'vercel': /vercel|next\.js/i,
      'netlify': /netlify/i
    };

    const edgeIndicators = {
      'cloudflare': /cloudflare|workers|@cloudflare\/kv/i,
      'fastly': /fastly|compute@edge/i
    };

    // Scan deps for patterns
    const depString = Object.keys(deps).join(' ').toLowerCase();
    const scriptsString = JSON.stringify(pkg.scripts || {});

    const cloudMatch = findIndicator(cloudIndicators, depString);
    if (cloudMatch) {
      evidence.cloudProvider = cloudMatch;
      return 'cloud';
    }

    const serverlessMatch = findIndicator(serverlessIndicators, depString, scriptsString);
    if (serverlessMatch) {
      evidence.serverlessPlatform = serverlessMatch;
      return 'serverless';
    }

    const edgeMatch = findIndicator(edgeIndicators, depString);
    if (edgeMatch) {
      evidence.edgePlatform = edgeMatch;
      return 'edge';
    }

    // Check for on-prem specific: docker compose with host networking, internal IPs
    const dockerComposePath = path.join(cwd, 'docker-compose.yml');
    try {
      const dcContent = await fs.readFile(dockerComposePath, 'utf-8');
      if (dcContent.includes('host.docker.internal') || /192\.168|10\.|172\.(1[6-9]|2[0-9]|3[0-1])/.test(dcContent)) {
        return 'on-prem';
      }
    } catch {
      // ignore
    }

    // Default: assume cloud if any infrastructure dir exists.
    // Checks are independent -> probe in parallel (no await-in-loop); the
    // first existing dir decides.
    const infraDirs = ['infra', 'terraform', 'kubernetes', 'k8s', 'helm'];
    const exists = await Promise.all(
      infraDirs.map(async (dir) => {
        try {
          await fs.access(path.join(cwd, dir));
          return true;
        } catch {
          return false;
        }
      })
    );

    return 'cloud'; // any infra dir (or none found) -> conservative default
  } catch (error) {
    console.warn('[ProjectProfile] Deployment detection failed:', error);
    return 'cloud';
  }
}

/**
 * Team detection: git history, CODEOWNERS, PR volume
 */
async function countAuthors(cwd: string): Promise<number> {
  const { stdout: authorsStr } = await execAsync(
    'git shortlog -sne --all --since="30 days ago" 2>/dev/null | wc -l',
    { cwd }
  );
  return parseInt(authorsStr.trim(), 10) || 1;
}

async function countCommits(cwd: string): Promise<number> {
  const { stdout: commitsStr } = await execAsync(
    'git log --oneline --since="30 days ago" 2>/dev/null | wc -l',
    { cwd }
  );
  return parseInt(commitsStr.trim(), 10) || 0;
}

async function countPullRequests(cwd: string): Promise<number> {
  const { stdout: branchesStr } = await execAsync(
    'git branch -r 2>/dev/null | grep -E "(origin/PR-|origin/pull/)" | wc -l',
    { cwd }
  );
  return parseInt(branchesStr.trim(), 10) || 0;
}

async function hasCodeowners(cwd: string): Promise<boolean> {
  try {
    await fs.access(path.join(cwd, 'CODEOWNERS'), fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function classifyTeam(authorCount: number, commitCount: number, prCount: number, codeowners: boolean): 'solo' | 'small' | 'large-org' {
  if (authorCount === 1 && commitCount < 100) {
    return 'solo';
  }
  if (authorCount > 10 || prCount > 20 || codeowners) {
    return 'large-org';
  }
  return 'small';
}

async function detectTeam(cwd: string, evidence: Record<string, any>): Promise<'solo' | 'small' | 'large-org'> {
  try {
    const authorCount = await countAuthors(cwd);
    evidence.authorCount30d = authorCount;

    const commitCount = await countCommits(cwd);
    evidence.commits30d = commitCount;

    const prCount = await countPullRequests(cwd);
    evidence.prCountEstimate = prCount;

    const codeowners = await hasCodeowners(cwd);
    evidence.hasCODEOWNERS = codeowners;

    return classifyTeam(authorCount, commitCount, prCount, codeowners);
  } catch (error) {
    console.warn('[ProjectProfile] Team detection failed:', error);
    return 'small';
  }
}

/**
 * Adapt quality configuration based on profile
 */
export function adaptQualityConfig(profile: ProjectProfile): QualityConfig {
  const base: QualityConfig = {
    maxFunctionLines: 20,
    maxComplexity: 10,
    minCoverage: 0.80,
    securityScanLevel: 'high',
    requirePerformanceGates: true,
    requireComplianceMatrix: true,
    requiredPRReviews: 1,
    slaInitialReviewHours: 24,
  };

  // Size adjustments
  switch (profile.size) {
    case 'small':
      base.maxFunctionLines = 25;
      base.minCoverage = 0.75;
      base.requirePerformanceGates = false;
      base.requireComplianceMatrix = false;
      break;
    case 'large':
      base.maxFunctionLines = 15;
      base.minCoverage = 0.85;
      base.securityScanLevel = 'critical';
      break;
    case 'medium':
      // keep defaults
      break;
  }

  // Risk adjustments
  switch (profile.risk) {
    case 'high':
      base.securityScanLevel = 'critical';
      base.requireComplianceMatrix = true;
      base.slaInitialReviewHours = 4;
      break;
    case 'low':
      base.securityScanLevel = 'high';
      base.requireComplianceMatrix = false;
      break;
    case 'medium':
      // keep defaults
      break;
  }

  // Team adjustments
  switch (profile.team) {
    case 'solo':
      base.requiredPRReviews = 0;
      base.slaInitialReviewHours = 168; // no strict SLA
      break;
    case 'large-org':
      base.requiredPRReviews = 2;
      base.slaInitialReviewHours = 4;
      break;
    case 'small':
      // keep defaults
      break;
  }

  return base;
}

/**
 * Write profile to docs/PROJECT_PROFILE.md
 */
export async function writeProjectProfile(profile: ProjectProfile): Promise<void> {
  const docsDir = path.resolve(process.cwd(), 'docs');
  await fs.mkdir(docsDir, { recursive: true });

  const content = generateMarkdown(profile);
  await fs.writeFile(path.join(docsDir, 'PROJECT_PROFILE.md'), content, 'utf-8');
  console.log('[ProjectProfile] Profile written to docs/PROJECT_PROFILE.md');
}

/**
 * Generate markdown report
 */
function sizeSection(profile: ProjectProfile): string {
  const { size, evidence } = profile;
  return `## Size
- Category: **${size.toUpperCase()}**
- Evidence:
  - LOC: ${evidence.loc ?? 'N/A'}
  - Files: ${evidence.fileCount ?? 'N/A'}
  - Tests: ${evidence.testCount ?? 'N/A'}
  - Dependencies: ${evidence.dependencyCount ?? 'N/A'}
`;
}

function riskSection(profile: ProjectProfile): string {
  const { risk, evidence } = profile;
  const warning = risk === 'high' ? '- ⚠️ High-risk keywords detected – full compliance scanning enabled\n' : '';
  return `## Risk
- Category: **${risk.toUpperCase()}**
- Evidence:
  - High-risk keywords: ${evidence.riskKeywordCounts?.high ?? 0}
  - Medium-risk keywords: ${evidence.riskKeywordCounts?.medium ?? 0}
  - Low-risk keywords: ${evidence.riskKeywordCounts?.low ?? 0}
${warning}`;
}

function deploymentSection(profile: ProjectProfile): string {
  const { deployment, evidence } = profile;
  const provider = deployment === 'cloud' ? `- Cloud provider: ${evidence.cloudProvider ?? 'detected'}\n` : '';
  const platform = deployment === 'serverless' ? `- Platform: ${evidence.serverlessPlatform ?? 'detected'}\n` : '';
  const edge = deployment === 'edge' ? `- Platform: ${evidence.edgePlatform ?? 'detected'}\n` : '';
  const cost = deployment === 'cloud' ? 'Required' : 'Not applicable';
  return `## Deployment
- Category: **${deployment.toUpperCase()}**
${provider}${platform}${edge}- Cost Optimization: ${cost}
`;
}

function teamSection(profile: ProjectProfile): string {
  const { team, evidence } = profile;
  const process = team === 'solo' ? 'Self-merge allowed' : team === 'large-org' ? '2 reviews required' : '1 review required';
  return `## Team
- Category: **${team.toUpperCase()}**
- Evidence:
  - Authors (30d): ${evidence.authorCount30d ?? 'N/A'}
  - Commits (30d): ${evidence.commits30d ?? 'N/A'}
  - PR estimate: ${evidence.prCountEstimate ?? 'N/A'}
  - CODEOWNERS: ${evidence.hasCODEOWNERS ? 'Yes' : 'No'}
- Process: ${process}
`;
}

function generateMarkdown(profile: ProjectProfile): string {
  const now = new Date().toISOString();
  const { size, risk, team } = profile;
  const qualityConfig = adaptQualityConfig(profile);

  return `# Project Profile

**Generated**: ${now}
**Source**: Auto-detected at startup

${sizeSection(profile)}
${riskSection(profile)}
${deploymentSection(profile)}
${teamSection(profile)}

## Applied Thresholds

| Metric | Standard | Adjusted | Reason |
|--------|----------|----------|--------|
| Max Function Lines | 20 | ${qualityConfig.maxFunctionLines} | ${size} size |
| Min Coverage | 80% | ${(qualityConfig.minCoverage * 100).toFixed(0)}% | ${size} size |
| Complexity Limit | 10 | 10 | Default |
| Security Scan | HIGH | ${qualityConfig.securityScanLevel.toUpperCase()} | ${risk} risk |
| Performance Gates | Required | ${qualityConfig.requirePerformanceGates ? 'Yes' : 'No'} | ${risk} risk |
| Compliance Matrix | Full | ${qualityConfig.requireComplianceMatrix ? 'Yes' : 'No'} | ${risk} risk |
| PR Reviews Required | 1 | ${qualityConfig.requiredPRReviews} | ${team} team |
| SLA Initial Review | <24h | <${qualityConfig.slaInitialReviewHours}h | ${team} team |

## Manual Override

To override auto-detected profile, create \`docs/PROJECT_PROFILE_OVERRIDE.md\`:

\`\`\`yaml
size: large
risk: high
deployment: cloud
team: large-org
\`\`\`

Agent will use override values on next startup.

## Notes

- Profile auto-updates on agent startup (if evidence changes significantly)
- Adjustments applied to quality gates, testing pipeline, compliance scanning
- For questions, see GOAL.md §20.2 and docs/PROJECT_PROFILE.md
`;
}

/**
 * Load override if present
 */
export async function loadOverride(cwd: string): Promise<Partial<ProjectProfile> | null> {
  const overridePath = path.join(cwd, 'docs', 'PROJECT_PROFILE_OVERRIDE.md');
  try {
    const content = await fs.readFile(overridePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/) || content.match(/(\w+):\s*(.+)/g);
    if (!match) return null;

    const yamlStr = match[1] || match[0];
    const override = parseYaml(yamlStr);
    return override;
  } catch {
    return null;
  }
}

/**
 * Very simple YAML parser for override (key: value pairs)
 */
function parseYaml(yamlStr: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = yamlStr.split('\n');
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      result[match[1]] = match[2].toLowerCase();
    }
  }
  return result;
}

// Export for use in main.ts
export default {
  detectProjectProfile,
  adaptQualityConfig,
  writeProjectProfile,
  loadOverride,
};
