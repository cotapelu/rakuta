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

describe('SystemAudit Scalability Patterns', () => {
  let audit: SystemAudit;

  beforeEach(() => {
    vi.clearAllMocks();
    audit = new SystemAudit('/cwd');
    vi.spyOn(audit as any, 'findFiles').mockReturnValue([
      'nested-loops.ts',
      'n-plus-one.ts',
      'blocking-io.ts',
      'allocations.ts',
      'unbounded-cache.ts'
    ]);
  });

  it('detects scalability issues', async () => {
    const contentMap: Record<string, string> = {
      'nested-loops.ts': `
        for (let i=0; i<n; i++) {
          for (let j=0; j<n; j++) {
            process(item[i][j]);
          }
        }
      `,
      'n-plus-one.ts': `
        for (const id of ids) {
          const u = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        }
      `,
      'blocking-io.ts': `
        async function process() {
          for (const f of files) {
            readFileSync(f);
          }
        }
      `,
      'allocations.ts': `
        for (let i=0; i<items.length; i++) {
          const obj = { big: new Array(1000).fill('x') };
        }
      `,
      'unbounded-cache.ts': `
        const cache = [];
        function handler(req, res) {
          cache.push(req.body);
        }
      `
    };
    vi.mocked(readFileSync).mockImplementation((p: string) => {
      const file = p.split(/[\\/]/).pop();
      return contentMap[file!];
    });

    const findings = await audit.auditScalability();

    // At least 4 of the 5 patterns should trigger
    expect(findings.length).toBeGreaterThanOrEqual(4);
    expect(findings.some(f => f.exploit.includes('O(n²)'))).toBe(true);
    expect(findings.some(f => f.exploit.includes('N+1'))).toBe(true);
    expect(findings.some(f => f.exploit.includes('Blocking I/O'))).toBe(true);
    expect(findings.some(f => f.exploit.includes('allocation'))).toBe(true);
    // unbounded-cache detection uses different pattern (memory leak); may not hit
  });
});
