import { mkdtemp, rmdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SystemAudit } from '../../../extensions/autonomous-engine/system-audit';

describe('SystemAudit - Additional Coverage for Critical Branches', () => {
  let fixtureDir: string;

  beforeEach(async () => {
    fixtureDir = await mkdtemp(join(tmpdir(), 'audit-cov-'));
  });

  afterEach(async () => {
    try {
      await rmdir(fixtureDir, { recursive: true });
    } catch (e) {}
  });

  async function writeFileAsync(fileName: string, content: string) {
    await writeFile(join(fixtureDir, fileName), content, 'utf-8');
  }

  describe('True branches for previously untriggered Security STRIDE checks', () => {
    test('detects command injection', async () => {
      await writeFileAsync('cmd-inject.ts', `
        import { exec } from 'child_process';
        function run(cmd: string) {
          exec('ls ' + cmd);
        }
      `);
      const auditor = new SystemAudit(fixtureDir);
      const report = await auditor.runFullAudit();
      expect(report.findings.some(f => f.dimension === 'Security (STRIDE)' && f.exploit.includes('command injection'))).toBe(true);
    });

    test('detects XSS vulnerability', async () => {
      await writeFileAsync('xss.ts', `
        app.get('/user', (req, res) => {
          const name = req.query.name as string;
          res.send('<div>Hello ' + name + '</div>');
        });
      `);
      const auditor = new SystemAudit(fixtureDir);
      const report = await auditor.runFullAudit();
      expect(report.findings.some(f => f.dimension === 'Security (STRIDE)' && f.exploit.includes('XSS'))).toBe(true);
    });

    test('detects denial of service via unbounded loop', async () => {
      await writeFileAsync('dos.ts', `
        while (true) {
          doWork();
        }
      `);
      const auditor = new SystemAudit(fixtureDir);
      const report = await auditor.runFullAudit();
      expect(report.findings.some(f => f.dimension === 'Security (STRIDE)' && f.exploit.includes('DoS'))).toBe(true);
    });
  });

  describe('True branches for previously untriggered Scalability checks', () => {
    test('detects nested loops causing O(n²)', async () => {
      await writeFileAsync('nested-loops.ts', `
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < m; j++) {
            sum += arr[i][j];
          }
        }
      `);
      const auditor = new SystemAudit(fixtureDir);
      const report = await auditor.runFullAudit();
      expect(report.findings.some(f => f.dimension === 'Scalability' && f.exploit.includes('O(n²)'))).toBe(true);
    });

    test('detects N+1 query pattern', async () => {
      await writeFileAsync('n-plus-one.ts', `
        for (const id of ids) {
          const item = db.find(id);
        }
      `);
      const auditor = new SystemAudit(fixtureDir);
      const report = await auditor.runFullAudit();
      expect(report.findings.some(f => f.dimension === 'Scalability' && f.exploit.includes('N+1'))).toBe(true);
    });
  });

  describe('True branches for Business Logic Integrity checks', () => {
    test('detects bypass validation mechanism', async () => {
      await writeFileAsync('bypass.ts', `
        if (skipValidation) { /* allow */ }
      `);
      const auditor = new SystemAudit(fixtureDir);
      const report = await auditor.runFullAudit();
      expect(report.findings.some(f => f.dimension === 'Business Logic Integrity' && f.rootCause === 'Code contains validation bypass mechanisms')).toBe(true);
    });

    test('detects dangerous assumptions (early return without throw)', async () => {
      await writeFileAsync('danger-assume.ts', `
        function process(input) {
          if (!input) return;
        }
      `);
      const auditor = new SystemAudit(fixtureDir);
      const report = await auditor.runFullAudit();
      expect(report.findings.some(f => f.dimension === 'Business Logic Integrity' && f.rootCause === 'Missing error handling for null/undefined')).toBe(true);
    });
  });
});
