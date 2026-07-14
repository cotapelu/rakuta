import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SystemAudit } from '../../../extensions/autonomous-engine/system-audit.js';
import { readFileSync } from 'node:fs';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn(() => ({ isFile: () => true }))
}));

vi.mock('node:child_process', () => ({
  execFile: vi.fn()
}));

describe('SystemAudit Observability Patterns', () => {
  let audit: SystemAudit;

  beforeEach(() => {
    vi.clearAllMocks();
    audit = new SystemAudit('/cwd');
    vi.spyOn(audit as any, 'findFiles').mockImplementation((pattern: string, options: any) => {
      if (pattern === '**/*.ts') {
        return [
          'no-structured-logs.ts',
          'no-metrics.ts',
          'no-tracing.ts',
          'no-correlation.ts',
          'no-health.ts'
        ];
      }
      if (pattern.includes('route')) {
        return ['no-health.ts'];
      }
      return [];
    });
    vi.spyOn(audit as any, 'searchCode').mockReturnValue(false);
  });

  it('detects missing observability components', async () => {
    const contentMap: Record<string, string> = {
      'no-structured-logs.ts': `console.log('msg');`,
      'no-metrics.ts': `function handler() { return 42; }`,
      'no-tracing.ts': `async function process() { await db.query(); }`,
      'no-correlation.ts': `app.use((req,res,next) => { next(); });`,
      'no-health.ts': `app.get('/status', (req,res) => res.send('ok'));`
    };
    vi.mocked(readFileSync).mockImplementation((p: string) => {
      const file = p.split(/[\\/]/).pop();
      return contentMap[file!] || '';
    });

    const findings = await audit.auditObservability();
    console.log('Findings count:', findings.length);
    console.log('Root causes:', findings.map(f => f.rootCause));

    // Expect at least 5 findings for missing: structured logs, metrics, traces, correlation, health, alerts
    expect(findings.length).toBeGreaterThanOrEqual(5);

    const rootCauses = findings.map(f => f.rootCause);
    expect(rootCauses.some(rc => rc.includes('structured JSON logging'))).toBe(true);
    expect(rootCauses.some(rc => rc.includes('custom application metrics'))).toBe(true);
    expect(rootCauses.some(rc => rc.includes('distributed tracing'))).toBe(true);
    expect(rootCauses.some(rc => rc.includes('correlation ID propagation'))).toBe(true);
    expect(rootCauses.some(rc => rc.includes('health check endpoints'))).toBe(true);
    expect(rootCauses.some(rc => rc.includes('alerting configuration'))).toBe(true);
  });
});
