import { describe, it, expect } from 'vitest';
import { execute as safeEditExecute } from '../../../../../extensions/capability-system/plugins/codebase/capabilities/safe_edit.js';
import { promises as fsp } from 'fs';
import { join, relative } from 'path';

describe('safe_edit.execute (coverage)', () => {
  it('returns failure when target file does not exist', async () => {
    const execStub = async (_cmd: string, _args: string[], _options?: any) => ({ code: 0, stdout: '', stderr: '' });
    const result = await safeEditExecute(
      {
        operations: [
          { file: 'no-such-folder/nope.ts', editType: 'replace', range: { start: 0, end: 0 }, newCode: '' }
        ]
      },
      { cwd: process.cwd(), exec: execStub }
    );
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results[0].success).toBe(false);
  });

  it('successfully applies a simple edit on a temporary file', async () => {
    // Provide a no-op exec to skip tsc/prettier external commands
    const execStub = async (_cmd: string, _args: string[], _options?: any) => ({ code: 0, stdout: '', stderr: '' });
    // Create a temporary directory under cwd
    const tmpDir = await fsp.mkdtemp(join(process.cwd(), 'tmp-safe-edit-'));
    const fileAbs = join(tmpDir, 'test.ts');
    await fsp.writeFile(fileAbs, 'const a = 1;\n');
    const fileRel = relative(process.cwd(), fileAbs);
    // Apply an edit: insert a comment line at the start
    const res = await safeEditExecute(
      {
        operations: [
          {
            file: fileRel,
            editType: 'replace',
            range: { start: 0, end: 1 },
            newCode: '// added by test\n'
          }
        ]
      },
      { cwd: process.cwd(), exec: execStub }
    );
    expect(res.success).toBe(true);
    // Verify file content updated
    const after = await fsp.readFile(fileAbs, 'utf-8');
    expect(after.startsWith('// added by test')).toBe(true);
    await fsp.rm(tmpDir, { recursive: true, force: true });
  });
});
