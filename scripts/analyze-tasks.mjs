#!/usr/bin/env node
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('coverage-per-file.json', 'utf-8'));

// Filter to files with actual coverage (exclude NaN and 0% for now? include all)
const withCoverage = data.filter(f => f.Statements.total > 0);

// Categories
const critical = []; // coverage < 20%
const high = [];     // 20% <= coverage < 50%
const medium = [];   // 50% <= coverage < 80%
const good = [];     // coverage >= 80%

for (const file of withCoverage) {
  const cov = file.Statements.percent;
  if (cov < 20) critical.push(file);
  else if (cov < 50) high.push(file);
  else if (cov < 80) medium.push(file);
  else good.push(file);
}

console.log(`Total actionable files (with coverage data): ${withCoverage.length}`);
console.log(`Critical (<20%): ${critical.length}`);
console.log(`High (20-50%): ${high.length}`);
console.log(`Medium (50-80%): ${medium.length}`);
console.log(`Good (>=80%): ${good.length}`);
console.log('');

function printList(title, list) {
  console.log(`\n=== ${title} (${list.length}) ===`);
  for (const f of list.slice(0, 20)) { // show top 20 worst
    console.log(`${f.file.padEnd(60)} Stmts: ${String(f.Statements.percent).padStart(3)}%, Branch: ${String(f.Branches.percent).padStart(3)}%, Funcs: ${String(f.Functions.percent).padStart(3)}%, Lines: ${String(f.Lines.percent).padStart(3)}%`);
  }
  if (list.length > 20) console.log(`... and ${list.length - 20} more`);
}

printList('CRITICAL (coverage <20%)', critical);
printList('HIGH (20-50%)', high);
printList('MEDIUM (50-80%)', medium);

// Also output task suggestions
console.log('\n=== SUGGESTED TASKS (prioritized) ===');
let taskCount = 1;
for (const f of [...critical, ...high, ...medium]) {
  console.log(`${taskCount}. [T] ${f.file}: Increase statement coverage from ${f.Statements.percent}% to ≥80% (current branches ${f.Branches.percent}%, functions ${f.Functions.percent}%)`);
  taskCount++;
}
if (critical.length === 0 && high.length === 0 && medium.length === 0) {
  console.log('No files need coverage improvement (all ≥80%).');
}

// Save tasks to file
fs.writeFileSync('coverage-tasks.json', JSON.stringify({ critical, high, medium, good }, null, 2));
console.log('\nTask list saved to coverage-tasks.json');
