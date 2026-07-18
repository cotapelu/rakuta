#!/usr/bin/env node
/**
 * Benchmark Runner for CI
 *
 * Runs performance benchmarks against SLO targets and compares against baseline.
 * Supports recording a new baseline file.
 *
 * Flags:
 *   --scenario <name>         Scenario to benchmark (default analyze_file)
 *   --iterations <n>          Number of measured iterations (default 50)
 *   --record-baseline         Record the measured p50/p99 into benchmarks/baseline.json
 *   --threshold <factor>      Override regression factor (default 1.05 = 5% slower)
 *   --regression <factor>     Alias for --threshold
 */

import { execute as benchmarkExecute } from '../src/addon/extensions/capability-system/plugins/codebase/capabilities/benchmark.ts';
import { promises as fs } from 'fs';
import { join } from 'path';

// Parse args
const args = process.argv.slice(2);
let scenario = 'analyze_file';
let iterations = 50;
let recordBaseline = false;
let regressionFactor = 1.05; // default 5% tolerance (i.e., current may be up to +5% slower than baseline)

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--scenario' && args[i + 1]) {
    scenario = args[i + 1];
  } else if (a === '--iterations' && args[i + 1]) {
    iterations = parseInt(args[i + 1], 10);
  } else if (a === '--record-baseline') {
    recordBaseline = true;
  } else if (a === '--threshold' && args[i + 1]) {
    regressionFactor = parseFloat(args[i + 1]);
  } else if (a === '--regression' && args[i + 1]) {
    regressionFactor = parseFloat(args[i + 1]);
  }
}

// Minimal exec stub for safe_edit scenario (avoids external commands)
const execStub = async (_cmd: string, _args: string[], _options?: any): Promise<any> => {
  // Return success object so safe_edit validation passes quickly
  return { code: 0, stdout: '', stderr: '' };
};

const cwd = process.cwd();
const baselinePath = join(cwd, 'benchmarks', 'baseline.json');

try {
  const response = await benchmarkExecute({ scenario, iterations, warmup: 5 }, { cwd, exec: execStub });
  const report = response.result;

  console.log(`\n📊 Benchmark Results: ${report.scenario}`);
  console.log(`   p50: ${report.p50Ms.toFixed(2)}ms (target ≤100ms)`);
  console.log(`   p99: ${report.p99Ms.toFixed(2)}ms (target ≤200ms)`);
  console.log(`   Throughput: ${report.throughputOpsPerSec.toFixed(2)} ops/sec`);
  console.log(`   Memory: ${report.memoryPeakMB.toFixed(2)} MB`);

  // Determine if SLO passes
  const sloPass = report.passSLO;

  // Handle baseline record or regression detection
  let regressionFail = false;
  let baselineData: any = {};
  try {
    const data = await fs.readFile(baselinePath, 'utf-8');
    baselineData = JSON.parse(data);
  } catch {
    // No baseline yet
  }

  if (recordBaseline) {
    baselineData[scenario] = { p50: report.p50Ms, p99: report.p99Ms };
    await fs.mkdir(join(cwd, 'benchmarks'), { recursive: true });
    await fs.writeFile(baselinePath, JSON.stringify(baselineData, null, 2));
    console.log(`\n📦 Baseline recorded for ${scenario} in ${baselinePath}`);
  } else if (baselineData[scenario]) {
    const base = baselineData[scenario];
    if (report.p50Ms > base.p50 * regressionFactor) {
      console.log(`\n⚠️ Regression: p50 increased to ${report.p50Ms.toFixed(2)}ms (baseline ${base.p50.toFixed(2)}ms, factor ${regressionFactor})`);
      regressionFail = true;
    }
    if (report.p99Ms > base.p99 * regressionFactor) {
      console.log(`\n⚠️ Regression: p99 increased to ${report.p99Ms.toFixed(2)}ms (baseline ${base.p99.toFixed(2)}ms, factor ${regressionFactor})`);
      regressionFail = true;
    }
    if (!regressionFail) {
      console.log(`\n✅ No regression vs baseline (allowed factor ${regressionFactor}x)`);
    }
  } else {
    console.log('\nℹ️ No baseline found; skipping regression check.');
  }

  if (!sloPass) {
    console.log('\n❌ SLO violations detected:');
    for (const s of report.sLOResults) {
      if (!s.pass) {
        console.log(`   - ${s.metric}: ${s.actual.toFixed(2)} > target ${s.target}`);
      }
    }
  } else if (!regressionFail && !recordBaseline) {
    console.log('\n✅ All SLOs met');
  }

  const overallFail = !sloPass || regressionFail;
  process.exit(overallFail ? 1 : 0);
} catch (err: any) {
  console.error('Benchmark failed:', err.message);
  process.exit(1);
}
