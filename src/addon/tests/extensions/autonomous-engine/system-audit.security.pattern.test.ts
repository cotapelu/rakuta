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

describe('SystemAudit Security Patterns', () => {
  let audit: SystemAudit;

  beforeEach(() => {
    vi.clearAllMocks();
    audit = new SystemAudit('/cwd');
    vi.spyOn(audit as any, 'findFiles').mockReturnValue([
      'xss.ts',
      'cmd.ts',
      'jwt.ts',
      'priv.ts',
      'log.ts',
      'api.ts'
    ]);
  });

  it('detects multiple security issues', async () => {
    const contentMap: Record<string, string> = {
      'xss.ts': `res.send('<div>' + userInput + '</div>');`,
      'cmd.ts': `exec('rm -rf ' + userPath);`,
      'jwt.ts': `jwt.verify(token, secret);`,
      'priv.ts': `const role = 'admin';`,
      'log.ts': `console.log(password);`,
      'api.ts': `app.post('/delete', handler); // no auth`
    };
    vi.mocked(readFileSync).mockImplementation((p: string) => {
      const file = p.split(/[\\/]/).pop();
      return contentMap[file!];
    });

    const findings = await audit.auditSecuritySTRIDE();
    console.log('Findings count:', findings.length);
    console.log('Exploits:', findings.map(f => f.exploit));

    // Expect at least 4 issues
    expect(findings.length).toBeGreaterThanOrEqual(4);

    // Check specific expected types
    expect(findings.some(f => f.exploit.includes('XSS'))).toBe(true);
    expect(findings.some(f => f.exploit.includes('arbitrary command injection'))).toBe(true);
    expect(findings.some(f => f.exploit.includes('JWT tokens not signature verified'))).toBe(true);
    expect(findings.some(f => f.exploit.includes('privileged operations'))).toBe(true); // Elevation of Privilege
    expect(findings.some(f => f.exploit.includes('Sensitive data written to logs'))).toBe(true);
    // POST without auth detection
    expect(findings.some(f => f.exploit.includes('Unauthenticated attacker can modify data'))).toBe(true);
  });
});
