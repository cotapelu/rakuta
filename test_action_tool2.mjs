#!/usr/bin/env node
import { createActionTool } from './dist/addon/extensions/tools/action-tool.js';

const tool = createActionTool();
const fakeCtx = { session: { cwd: process.cwd() } };

async function test(actionName, args = {}) {
  const result = await tool.execute('test-call', { action: actionName, ...args }, null, null, fakeCtx);
  console.log(`${actionName}: ${result.isError ? '❌' : '✅'}`);
  if (!result.isError && result.content[0]) {
    console.log(`  Output: ${result.content[0].text.substring(0, 150)}${result.content[0].text.length > 150 ? '...' : ''}`);
  } else if (result.isError) {
    console.log(`  Error: ${result.content[0].text}`);
  }
}

await test('ls', { path: '.' });
await test('cat', { path: 'AGENTS.md' });
await test('ps');
await test('df');
await test('du', { path: '.' });
await test('git_status'); // works even if not a git repo, will show error message
await test('npm', { install: false, packages: [] }); // This will error: requires packages

console.log('\nAll tests done.');
