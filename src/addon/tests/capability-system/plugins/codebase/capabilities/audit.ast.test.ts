import { describe, it, expect } from 'vitest';
import { detectSqlInjection, detectXSS, detectJwtVerification, detectIDOR } from '../../../../../extensions/capability-system/plugins/codebase/capabilities/audit.js';

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
describe('detectXSS (AST)', () => {
  it('should not flag safe innerHTML with static string', () => {
    const code = `
      element.innerHTML = '<div>Hello</div>';
    `;
    expect(detectXSS(code)).toBeNull();
  });

  it('should flag innerHTML with template literal', () => {
    const code = `
      element.innerHTML = \`<div>\${userInput}</div>\`;
    `;
    const loc = detectXSS(code);
    expect(loc).not.toBeNull();
    expect(loc?.line).toBeGreaterThan(0);
  });

  it('should flag innerHTML with string concatenation', () => {
    const code = `
      element.innerHTML = '<div>' + userInput + '</div>';
    `;
    const loc = detectXSS(code);
    expect(loc).not.toBeNull();
  });

  it('should flag innerHTML with variable', () => {
    const code = `
      element.innerHTML = userInput;
    `;
    const loc = detectXSS(code);
    expect(loc).not.toBeNull();
  });

  it('should flag document.write with template literal', () => {
    const code = `
      document.write(\`<script>\${malicious}</script>\`);
    `;
    const loc = detectXSS(code);
    expect(loc).not.toBeNull();
  });

  it('should flag document.write with concatenation', () => {
    const code = `
      document.write('<b>' + data + '</b>');
    `;
    const loc = detectXSS(code);
    expect(loc).not.toBeNull();
  });

  it('should flag document.write with variable', () => {
    const code = `
      document.write(unsanitized);
    `;
    const loc = detectXSS(code);
    expect(loc).not.toBeNull();
  });

  it('should flag res.send with template literal containing HTML', () => {
    const code = `
      res.send(\`<div>\${req.body.content}</div>\`);
    `;
    const loc = detectXSS(code);
    expect(loc).not.toBeNull();
  });

  it('should not flag res.send with static HTML', () => {
    const code = `
      res.send('<div>Hello</div>');
    `;
    expect(detectXSS(code)).toBeNull();
  });
});

describe('detectJwtVerification (AST)', () => {
  it('should not flag when JWT verify with RS256 is present', () => {
    const code = `
      const token = jwt.verify(req.body.token, publicKey, { algorithms: ['RS256'], audience: 'myapp', issuer: 'auth' });
    `;
    expect(detectJwtVerification(code)).toBeNull();
  });

  it('should flag jwt.sign with HS256', () => {
    const code = `
      const token = jwt.sign(payload, secret, { algorithm: 'HS256' });
    `;
    const loc = detectJwtVerification(code);
    expect(loc).not.toBeNull();
  });

  it('should flag jwt.sign with HS384', () => {
    const code = `
      jwt.sign(data, key, { algorithm: 'HS384' });
    `;
    const loc = detectJwtVerification(code);
    expect(loc).not.toBeNull();
  });

  it('should flag jwt.sign with HS512', () => {
    const code = `
      const token = jwt.sign(user, shhh, { algorithm: 'HS512' });
    `;
    const loc = detectJwtVerification(code);
    expect(loc).not.toBeNull();
  });

  it('should flag when jwt.decode is used but no verify present', () => {
    const code = `
      const payload = jwt.decode(token);
    `;
    const loc = detectJwtVerification(code);
    expect(loc).not.toBeNull();
  });

  it('should flag when jwt used but verify missing altogether', () => {
    const code = `
      const token = jwt.sign(user, secret, { algorithm: 'RS256' });
      // no verify
    `;
    const loc = detectJwtVerification(code);
    expect(loc).not.toBeNull();
  });

  it('should not flag when JWT not used at all', () => {
    const code = `
      const x = 1;
    `;
    expect(detectJwtVerification(code)).toBeNull();
  });

  it('should flag verify with algorithms that exclude RS256', () => {
    const code = `
      jwt.verify(token, secret, { algorithms: ['HS256'] });
    `;
    const loc = detectJwtVerification(code);
    expect(loc).not.toBeNull();
  });
});

describe('detectIDOR (AST)', () => {
  it('should not flag when query includes userId from req.user', () => {
    const code = `
      app.get('/profile', (req, res) => {
        const user = User.findById(req.params.id, { where: { userId: req.user.id } });
        res.json(user);
      });
    `;
    expect(detectIDOR(code)).toBeNull();
  });

  it('should flag findById without ownership check', () => {
    const code = `
      app.get('/user/:id', (req, res) => {
        const user = User.findById(req.params.id);
        res.json(user);
      });
    `;
    const loc = detectIDOR(code);
    expect(loc).not.toBeNull();
  });

  it('should flag findOne without user filter', () => {
    const code = `
      export async function getUser(ctx) {
        return await User.findOne({ where: { email: ctx.body.email } });
      }
    `;
    const loc = detectIDOR(code);
    expect(loc).not.toBeNull();
  });

  it('should flag raw query without user_id condition', () => {
    const code = `
      app.get('/order/:id', (req, res) => {
        db.query('SELECT * FROM orders WHERE order_id = ' + req.params.id);
      });
    `;
    const loc = detectIDOR(code);
    expect(loc).not.toBeNull();
  });

  it('should not flag when no database query present', () => {
    const code = `
      app.get('/health', (req, res) => {
        res.status(200).send('OK');
      });
    `;
    expect(detectIDOR(code)).toBeNull();
  });

  it('should not flag when handler does not use request object', () => {
    const code = `
      function processData(data) {
        return Data.find({ type: data.type });
      }
    `;
    expect(detectIDOR(code)).toBeNull();
  });

  it('should flag query inside function that uses req but no ownership', () => {
    const code = `
      const handler = async (req, res) => {
        const result = await db.query('SELECT * FROM accounts WHERE account_id = $1', [req.query.id]);
        res.json(result);
      };
    `;
    const loc = detectIDOR(code);
    expect(loc).not.toBeNull();
  });

  it('should flag findByPrimary without user check', () => {
    const code = `
      router.get('/items/:id', async (req, res) => {
        const item = await Item.findByPrimary(req.params.id);
        res.json(item);
      });
    `;
    const loc = detectIDOR(code);
    expect(loc).not.toBeNull();
  });
});
