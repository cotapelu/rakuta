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
await test('cat', { path: 'package.json' });
await test('ps');
await test('df');
await test('du', { path: '.' });
await test('git_status');
await test('grep', { pattern: 'tau', path: 'package.json' });
await test('find', { path: '.', name: '*.md' });
await test('curl', { url: 'https://httpbin.org/ip' });

// npm test with proper args
await test('npm', { install: true, packages: ['lodash'] }); // This will actually install if run, but we can see error if not allowed

console.log('\nAll tests done.');
