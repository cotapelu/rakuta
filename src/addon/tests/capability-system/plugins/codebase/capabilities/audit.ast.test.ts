import { describe, it, expect } from 'vitest';
import { detectSqlInjection } from '../../../../../extensions/capability-system/plugins/codebase/capabilities/audit.js';

describe('detectSqlInjection (AST)', () => {
  it('should not flag safe parameterized query', () => {
    const code = `
      db.query('SELECT * FROM users WHERE id = $1', [userId]);
      pool.execute('UPDATE accounts SET balance = $1 WHERE id = $2', [amount, accountId]);
    `;
    expect(detectSqlInjection(code)).toBeNull();
  });

  it('should flag template literal with expression directly in query call', () => {
    const code = "db.query(`SELECT * FROM users WHERE id = ${userId}`);";
    const loc = detectSqlInjection(code);
    expect(loc).not.toBeNull();
    expect(loc?.line).toBeGreaterThan(0);
  });

  it('should flag string concatenation directly in query call', () => {
    const code = `
      db.query('SELECT * FROM users WHERE id = ' + req.body.id);
    `;
    const loc = detectSqlInjection(code);
    expect(loc).not.toBeNull();
  });

  it('should flag concatenation with multiple parts', () => {
    const code = `
      db.query('SELECT * FROM users WHERE name = \\'' + req.body.name + '\\' AND active = true');
    `;
    const loc = detectSqlInjection(code);
    expect(loc).not.toBeNull();
  });

  it('should not flag static literal without interpolation', () => {
    const code = `
      db.query('SELECT * FROM products');
    `;
    expect(detectSqlInjection(code)).toBeNull();
  });

  it('should ignore non-query function calls', () => {
    const code = `
      const result = someOtherFunction('SELECT * FROM users');
    `;
    expect(detectSqlInjection(code)).toBeNull();
  });

  it('should detect raw() with template literal', () => {
    const code = `
      connection.raw(\`INSERT INTO logs (msg) values (\${msg})\`);
    `;
    const loc = detectSqlInjection(code);
    expect(loc).not.toBeNull();
  });

  it('should not flag query with placeholder array even if using template literal for other reason', () => {
    const code = `
      db.query('SELECT * FROM users WHERE id = $1', [req.body.id]); // safe param
    `;
    expect(detectSqlInjection(code)).toBeNull();
  });
});
