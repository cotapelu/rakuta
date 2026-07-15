#!/usr/bin/env node
/**
 * Benchmark Runner for CI
 *
 * Runs performance benchmarks against SLO targets.
 * Fails if any SLO is violated (exit code 1).
 *
 * Usage: npm run benchmark [--scenario analyze_file] [--iterations 50]
 */

import { execute as benchmarkExecute } from '../src/addon/extensions/capability-system/plugins/codebase/capabilities/benchmark.ts';

// Parse args
const args = process.argv.slice(2);
let scenario = 'analyze_file';
let iterations = 50;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--scenario' && args[i+1]) {
    scenario = args[i+1];
  } else if (args[i] === '--iterations' && args[i+1]) {
    iterations = parseInt(args[i+1], 10);
  }
}

// Run benchmark
const cwd = process.cwd();
try {
  const response = await benchmarkExecute({ scenario, iterations, warmup: 5 }, { cwd });
  const report = response.result; // response has { content, result, isError }

  console.log(`\n📊 Benchmark Results: ${report.scenario}`);
  console.log(`   p50: ${report.p50Ms.toFixed(2)}ms (target ≤100ms)`);
  console.log(`   p99: ${report.p99Ms.toFixed(2)}ms (target ≤200ms)`);
  console.log(`   Throughput: ${report.throughputOpsPerSec.toFixed(2)} ops/sec`);
  console.log(`   Memory: ${report.memoryPeakMB.toFixed(2)} MB`);

  if (report.passSLO) {
    console.log('\n✅ All SLOs met');
    process.exit(0);
  } else {
    console.log('\n❌ SLO violations detected:');
    for (const s of report.sLOResults) {
      if (!s.pass) {
        console.log(`   - ${s.metric}: ${s.actual.toFixed(2)} > target ${s.target}`);
      }
    }
    process.exit(1);
  }
} catch (err: any) {
  console.error('Benchmark failed:', err.message);
  process.exit(1);
}
