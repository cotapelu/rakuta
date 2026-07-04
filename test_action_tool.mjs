#!/usr/bin/env node
// Quick test script for action_tool (using compiled dist)

import { createActionTool } from './dist/addon/extensions/tools/action-tool.js';
import { actions } from './dist/addon/extensions/tools/actions/index.js';

// Create the tool
const tool = createActionTool();

// Fake context: we'll call execute and it will use the action signatures we fixed
// But note: the execute function expects an ExtensionContext which normally has exec.
// However our actions now ignore ctx and use spawnCommand directly.
// So we can pass a minimal ctx.

const fakeCtx = {
  session: { cwd: process.cwd() }
};

async function testAction(actionName, args) {
  console.log(`\n=== Testing ${actionName} ===`);
  try {
    const result = await tool.execute('test-call', { action: actionName, ...args }, null, null, fakeCtx);
    console.log('Result:', result.isError ? '❌ Error' : '✅ Success');
    console.log('Content:', result.content[0].text.substring(0, 200) + (result.content[0].text.length > 200 ? '...' : ''));
    if (result.details) {
      console.log('Details:', result.details);
    }
  } catch (e) {
    console.error('Exception:', e);
  }
}

// Test a few actions
await testAction('ls', { path: '.' });
await testAction('cat', { path: 'package.json' });
await testAction('ps', {});
// await testAction('git_status', {}); // Uncomment if in a git repo
// await testAction('curl', { url: 'https://httpbin.org/ip' });

console.log('\n=== Test complete ===');
