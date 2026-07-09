const fs = require('fs');
const cov = JSON.parse(fs.readFileSync('coverage/coverage-final.json', 'utf8'));

function getStats(file) {
  for (const [full, data] of Object.entries(cov)) {
    if (full.includes(file)) {
      const branchMap = data.branchMap || {};
      let total = 0, covered = 0;
      for (const [bid, branch] of Object.entries(branchMap)) {
        const locs = branch.locations || (branch.line ? [{ line: branch.line }] : []);
        total += locs.length;
        const hits = data.b && data.b[bid];
        if (Array.isArray(hits)) {
          for (let i = 0; i < locs.length; i++) {
            if (hits[i] && hits[i] > 0) covered++;
          }
        } else if (typeof hits === 'number') {
          if (hits > 0) covered += locs.length;
        }
      }
      return { total, covered, uncovered: total - covered, pct: total ? (covered / total * 100).toFixed(1) : '0' };
    }
  }
  return null;
}

const targets = [
  'autonomous-engine/extension.ts',
  'capability-system/extension.ts',
  'autonomous-engine/quality-gate.ts',
  'capability-system/plugin-loader.ts',
  'system-audit.ts'
];
console.table(targets.map(f => ({ file: f, ...getStats(f) })));
