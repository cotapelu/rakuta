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

describe('SystemAudit Remaining Dimensions', () => {
  let audit: SystemAudit;

  beforeEach(() => {
    vi.clearAllMocks();
    audit = new SystemAudit('/cwd');
    vi.spyOn(audit as any, 'findFiles').mockReturnValue([
      'logic.ts',
      'concurrency.ts',
      'database.ts',
      'caching.ts',
      'idempotency.ts',
      'failure.ts'
    ]);
    // Mock searchCode to return false (no matches) so we rely on file content patterns
    vi.spyOn(audit as any, 'searchCode').mockReturnValue(false);
  });

  it('detects issues across business logic, concurrency, database, caching, idempotency, failure', async () => {
    const contentMap: Record<string, string> = {
      // Business Logic Integrity: missing input validation
      'logic.ts': `
        function transfer(from, to, amount) {
          accounts[from] -= amount;
          accounts[to] += amount;
        }
      `,
      // Concurrency: unsynchronized shared state
      'concurrency.ts': `
        let counter = 0;
        async function inc() {
          counter++; // race condition
        }
      `,
      // Database Integrity: missing index on foreign key
      'database.ts': `
        const posts = await db.query('SELECT * FROM posts WHERE author_id = ?', [id]);
        // no index on author_id
      `,
      // Caching Consistency: cache never invalidated
      'caching.ts': `
        const cache = new Map();
        function getData(key) {
          if (cache.has(key)) return cache.get(key);
          const data = db.query('SELECT * FROM data');
          cache.set(key, data); // no TTL or invalidation
          return data;
        }
      `,
      // Idempotency: non-idempotent operation without dedup
      'idempotency.ts': `
        app.post('/pay', (req,res) => {
          chargeCustomer(req.body.card); // no idempotency key
        });
      `,
      // Failure Scenarios: missing retry/backoff
      'failure.ts': `
        async function callExternal() {
          const res = await fetch(url); // no retry on network failure
          return res;
        }
      `
    };
    vi.mocked(readFileSync).mockImplementation((p: string) => {
      const file = p.split(/[\\/]/).pop();
      return contentMap[file!] || '';
    });

    // Run all audits by calling runFullAudit? Or call each method individually?
    // For branch coverage, we can call runFullAudit to execute all dimensions.
    const report = await audit.runFullAudit();
    console.log('Findings dimensions:', report.findings.map(f => f.dimension));

    const byDimension = new Map<string, typeof report.findings[0][]>();
    for (const f of report.findings) {
      const arr = byDimension.get(f.dimension) || [];
      arr.push(f);
      byDimension.set(f.dimension, arr);
    }

    // Expect each dimension to have at least one finding
    expect(byDimension.get('Business Logic Integrity')?.length).toBeGreaterThanOrEqual(1);
    expect(byDimension.get('Concurrency & Race Condition')?.length).toBeGreaterThanOrEqual(1);
    expect(byDimension.get('Database & Data Integrity')?.length).toBeGreaterThanOrEqual(1);
    expect(byDimension.get('Caching & Consistency')?.length).toBeGreaterThanOrEqual(1);
    expect(byDimension.get('Idempotency')?.length).toBeGreaterThanOrEqual(1);
    expect(byDimension.get('Failure Scenarios')?.length).toBeGreaterThanOrEqual(1);
  });
});
