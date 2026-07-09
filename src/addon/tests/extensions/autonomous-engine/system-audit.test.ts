import { mkdtemp, rmdir, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SystemAudit } from '../../../extensions/autonomous-engine/system-audit';

describe('SystemAudit', () => {
  let fixtureDir: string;

  beforeEach(async () => {
    fixtureDir = await mkdtemp(join(tmpdir(), 'audit-test-'));
  });

  afterEach(async () => {
    // Cleanup fixture dir recursively (simple: ignore errors)
    try {
      await rmdir(fixtureDir, { recursive: true });
    } catch (e) {
      // ignore
    }
  });

  async function writeFileAsync(fileName: string, content: string) {
    await writeFile(join(fixtureDir, fileName), content, 'utf-8');
  }

  test('detects missing authentication on POST endpoint', async () => {
    await writeFileAsync('server.ts', `
      app.post('/api/users', async (req, res) => {
        // No token check
        await db.createUser(req.body);
        res.json({ ok: true });
      });
    `);

    const auditor = new SystemAudit(fixtureDir);
    const report = await auditor.runFullAudit();

    expect(report.findings.some(f => f.dimension.includes('Security') && f.location.includes('server.ts'))).toBe(true);
  });

  test('detects SQL injection vulnerability', async () => {
    await writeFileAsync('repository.ts', `
      async function getUser(name: string) {
        const sql = 'SELECT * FROM users WHERE name = "' + name + '"';
        return await db.query(sql);
      }
    `);

    const auditor = new SystemAudit(fixtureDir);
    const report = await auditor.runFullAudit();

    expect(report.findings.some(f => f.dimension.includes('Security') && f.exploit.includes('SQL/NoSQL injection'))).toBe(true);
  });

  test('detects missing transaction on writes', async () => {
    await writeFileAsync('order-service.ts', `
      async function createOrder(data: any) {
        await db.orders.insert(data);
        await db.items.insert(data.items);
        // Atomicity missing
      }
    `);

    const auditor = new SystemAudit(fixtureDir);
    const report = await auditor.runFullAudit();
    expect(report.findings.some(f => f.dimension.includes('Database'))).toBe(true);
  });

  test('detects non-atomic counter increment', async () => {
    await writeFileAsync('counter.ts', `
      let count = 0;
      export function increment() {
        count++;
      }
    `);

    const auditor = new SystemAudit(fixtureDir);
    const report = await auditor.runFullAudit();

    expect(report.findings.some(f => f.dimension.includes('Concurrency') && f.location.includes('counter.ts'))).toBe(true);
  });

  test('detects missing timeout configuration', async () => {
    await writeFileAsync('http-client.ts', `
      import https from 'https';
      function get(url: string) {
        return new Promise((resolve, reject) => {
          https.get(url, (res) => { ... }).on('error', reject);
        });
        // No timeout
      }
    `);

    const auditor = new SystemAudit(fixtureDir);
    const report = await auditor.runFullAudit();

    expect(report.findings.some(f => f.dimension.includes('Failure'))).toBe(true);
  });

  test('detects missing structured logs', async () => {
    await writeFileAsync('logger.ts', `
      export function info(msg: string) {
        console.log(msg); // plain text, not JSON
      }
    `);

    const auditor = new SystemAudit(fixtureDir);
    const report = await auditor.runFullAudit();

    expect(report.findings.some(f => f.dimension.includes('Observability'))).toBe(true);
  });

  test('detects missing health check endpoints', async () => {
    await writeFileAsync('api.ts', `
      app.get('/users', handler);
      // No /health or /healthz
    `);

    const auditor = new SystemAudit(fixtureDir);
    const report = await auditor.runFullAudit();

    expect(report.findings.some(f => f.dimension.includes('Observability'))).toBe(true);
  });

  test('audit report has required fields', async () => {
    await writeFileAsync('dummy.ts', `// empty file`);

    const auditor = new SystemAudit(fixtureDir);
    const report = await auditor.runFullAudit();

    expect(report).toHaveProperty('passed');
    expect(report).toHaveProperty('overallRisk');
    expect(report).toHaveProperty('score');
    expect(report).toHaveProperty('findings');
    expect(report).toHaveProperty('compliance');
    expect(report).toHaveProperty('observabilityGaps');
    expect(report).toHaveProperty('recommendations');
    expect(typeof report.score).toBe('number');
    expect(Array.isArray(report.findings)).toBe(true);
  });

  test('detects cache without TTL', async () => {
    await writeFileAsync('cache.ts', `
      const cache = new Map<string, any>();
      function set(key: string, value: any) {
        cache.set(key, value); // no TTL
      }
    `);

    const auditor = new SystemAudit(fixtureDir);
    const report = await auditor.runFullAudit();

    expect(report.findings.some(f => f.dimension.includes('Caching') && f.location.includes('cache.ts'))).toBe(true);
  });

  test('detects missing idempotency on state-changing endpoint', async () => {
    await writeFileAsync('payment.ts', `
      app.post('/pay', async (req, res) => {
        // Duplicate requests possible
        await charge(req.body);
        res.json({ status: 'charged' });
      });
    `);

    const auditor = new SystemAudit(fixtureDir);
    const report = await auditor.runFullAudit();
    expect(report.findings.some(f => f.dimension.includes('Idempotency'))).toBe(true);
  });

  test('detects missing retry logic for transient failures', async () => {
    await writeFileAsync('db-client.ts', `
      async function query(sql: string) {
        try {
          return await pool.query(sql);
        } catch (err) {
          throw err; // Propagate error
        }
      }
    `);

    const auditor = new SystemAudit(fixtureDir);
    const report = await auditor.runFullAudit();

    // This may be detected as missing retry in Failure Scenarios dimension
    expect(report.findings.some(f => f.dimension.includes('Failure'))).toBe(true);
  });

  test('detects PII logged directly (Information Disclosure)', async () => {
    await writeFileAsync('pii-log.ts', `
      function logUser(user) {
        console.log('User email: ' + user.email + ' phone: ' + user.phone);
      }
    `);

    const auditor = new SystemAudit(fixtureDir);
    const report = await auditor.runFullAudit();

    expect(report.findings.some(f => f.dimension === 'Security (STRIDE)' && f.rootCause === 'PII logged directly')).toBe(true);
  });
});
