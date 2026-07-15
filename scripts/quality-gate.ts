#!/usr/bin/env node
/**
 * Quality Gate CI runner
 *
 * Runs the quality.gate capability and exits with code 0 if passing, 1 if failing.
 * Usage: npm run quality-gate [--threshold N]
 */

// Import the execute function from the capability
import { execute as qualityGateExecute } from '../src/addon/extensions/capability-system/plugins/codebase/capabilities/quality_gate.ts';

// Parse args
const args = process.argv.slice(2);
let threshold = 90;
if (args[0]?.startsWith('--threshold=')) {
  threshold = parseInt(args[0].split('=')[1], 10);
} else if (args[0] === '--threshold' && args[1]) {
  threshold = parseInt(args[1], 10);
}

// Run quality gate
const cwd = process.cwd();
try {
  const result = await qualityGateExecute({ threshold }, { cwd });
  const report = result.report;
  console.log(report.summary);
  console.log('');
  // Also print detailed breakdown if needed
  for (const [key, score] of Object.entries(report.scores)) {
    const status = score.score === score.max ? '✅' : (score.score > 0 ? '⚠️' : '❌');
    console.log(`${status} ${key}: ${score.score}/${score.max} — ${score.details}`);
  }

  if (report.pass) {
    console.log('\n✅ Quality Gate PASSED');
    process.exit(0);
  } else {
    console.log(`\n❌ Quality Gate FAILED: ${report.total}/100 (need ${threshold})`);
    console.log('Please address the failing categories to reach production-ready standards.');
    process.exit(1);
  }
} catch (err: any) {
  console.error('Error running quality gate:', err.message);
  process.exit(1);
}
