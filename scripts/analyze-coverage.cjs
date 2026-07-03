const fs = require('fs');
const path = require('path');

function parseHtmlFile(content) {
  // Extract file path from title
  const filePathMatch = content.match(/Code coverage report for (src\/.*?\.ts)/);
  if (!filePathMatch) return null;
  let filePath = filePathMatch[1].replace(/^src\//, '');

  // Extract metrics: find each metric block
  const metrics = {};
  const regex = /<div class='fl[^>]*>.*?<span class="quiet">(Statements|Branches|Functions|Lines)<\/span>.*?<span class='fraction'>(\d+)\/(\d+)<\/span>.*?<\/div>/gis;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const metric = match[1];
    const covered = parseInt(match[2], 10);
    const total = parseInt(match[3], 10);
    metrics[metric] = {
      covered,
      total,
      percent: Math.round((covered / total) * 100)
    };
  }

  // Check we got all four
  if (Object.keys(metrics).length !== 4) {
    return null;
  }

  return { file: filePath, ...metrics };
}

function walk(dir, results) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, results);
    } else if (entry.name.endsWith('.html') && entry.name !== 'index.html') {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const result = parseHtmlFile(content);
        if (result) results.push(result);
      } catch (e) {
        // ignore
      }
    }
  }
}

const coverageDir = 'coverage/src';
const results = [];
walk(coverageDir, results);

results.sort((a, b) => a.Statements.percent - b.Statements.percent);

console.log('File'.padEnd(50), 'Stmts', 'Branch', 'Funcs', 'Lines');
console.log('─'.repeat(50 + 5*10));
for (const r of results) {
  console.log(
    `${r.file.padEnd(50)}  ` +
    `${String(r.Statements.percent).padStart(3)}%  ` +
    `${String(r.Branches.percent).padStart(3)}%  ` +
    `${String(r.Functions.percent).padStart(3)}%  ` +
    `${String(r.Lines.percent).padStart(3)}%`
  );
}

console.log(`\nTotal files: ${results.length}`);
if (results.length > 0) {
  const avgStmts = Math.round(results.reduce((sum, r) => sum + r.Statements.percent, 0) / results.length);
  console.log(`Average statement coverage: ${avgStmts}%`);
}

fs.writeFileSync('coverage-per-file.json', JSON.stringify(results, null, 2));
console.log('\nDetailed data saved to coverage-per-file.json');
