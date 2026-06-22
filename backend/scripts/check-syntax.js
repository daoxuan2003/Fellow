const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..');
const ignoredDirectories = new Set(['node_modules', 'uploads']);

function collectJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : collectJavaScriptFiles(fullPath);
    }

    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

const files = collectJavaScriptFiles(backendRoot);
const failures = [];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    failures.push({ file, output: result.stderr || result.stdout });
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`\nSyntax error in ${path.relative(backendRoot, failure.file)}:`);
    console.error(failure.output.trim());
  }
  process.exit(1);
}

console.log(`Checked ${files.length} backend JavaScript files.`);
