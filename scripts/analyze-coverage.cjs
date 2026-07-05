const cov = require("../coverage/coverage-final.json");
let totalStatements = 0, totalBranches = 0, totalFunctions = 0, totalLines = 0;
let coveredStatements = 0, coveredBranches = 0, coveredFunctions = 0, coveredLines = 0;
const fileStats = [];

for (const [file, data] of Object.entries(cov)) {
  if (file.includes("node_modules") || file.includes(".d.ts")) continue;
  const s = data.s || {};
  const b = data.b || {};
  const f = data.f || {};
  const totalS = Object.keys(s).length;
  const totalB = Object.keys(b).length;
  const totalF = Object.keys(f).length;
  const hitS = Object.values(s).filter(v => v > 0).length;
  const hitB = Object.values(b).filter(arr => arr && arr.some(v => v > 0)).length;
  const hitF = Object.values(f).filter(v => v > 0).length;
  const totalL = Object.keys(data.statementMap || {}).length;
  const hitL = Object.values(data.statementMap || {}).filter((_, idx) => s[idx] > 0).length;

  totalStatements += totalS;
  totalBranches += totalB;
  totalFunctions += totalF;
  totalLines += totalL;
  coveredStatements += hitS;
  coveredBranches += hitB;
  coveredFunctions += hitF;
  coveredLines += hitL;

  if (totalB >= 10) {
    const branchPct = totalB ? (hitB / totalB * 100).toFixed(2) : 0;
    fileStats.push({
      file: file,
      shortName: file.split("/").slice(-2).join("/"),
      branchPct: branchPct,
      uncovered: totalB - hitB,
      totalBranches: totalB
    });
  }
}

console.log("=== OVERALL COVERAGE ===");
console.log("Statements:", coveredStatements + "/" + totalStatements, "(" + (coveredStatements/totalStatements*100).toFixed(2) + "%)");
console.log("Branches:", coveredBranches + "/" + totalBranches, "(" + (coveredBranches/totalBranches*100).toFixed(2) + "%)");
console.log("Functions:", coveredFunctions + "/" + totalFunctions, "(" + (coveredFunctions/totalFunctions*100).toFixed(2) + "%)");
console.log("Lines:", coveredLines + "/" + totalLines, "(" + (coveredLines/totalLines*100).toFixed(2) + "%)");
console.log("\n=== FILES WITH MOST UNCOVERED BRANCHES ===");
fileStats.sort((a,b) => b.uncovered - a.uncovered).slice(0, 20).forEach(f => {
  console.log(f.shortName.padEnd(50) + " branches:" + f.totalBranches + " uncovered:" + f.uncovered + " pct:" + f.branchPct + "%");
});
