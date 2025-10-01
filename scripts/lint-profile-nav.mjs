// scripts/lint-profile-nav.mjs
// Simple lint to prevent direct router.push to /profile/${id}. Use pushProfile instead.
// Exits with code 1 if violations are found.

import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const includeExts = new Set(['.ts', '.tsx', '.js', '.jsx']);
const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', '.expo']);
const ignoreFiles = new Set(['utils/nav.ts']);

const patterns = [
  // router.push(`/profile/${...}`) or router.replace(`/profile/${...}`)
  { re: /router\.(push|replace)\([^\)]*`\/profile\/\$\{/ },
  // pathname: `/profile/${...}` inside an object push
  { re: /pathname\s*:\s*`\/profile\/\$\{/ },
  // router.push('/profile/' + id) or replace
  { re: /router\.(push|replace)\([^\)]*['"]\/profile\/['"]\s*\+/ },
  // pathname: '/profile/' + id
  { re: /pathname\s*:\s*['"]\/profile\/['"]\s*\+/ },
];

/**
 * Recursively walk directory and collect files with included extensions
 */
function walk(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoreDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (includeExts.has(ext)) {
        // convert to repo-relative path for nicer output
        const rel = path.relative(projectRoot, full).replace(/\\/g, '/');
        if (!ignoreFiles.has(rel)) acc.push({ full, rel });
      }
    }
  }
  return acc;
}

function scanFile(filePath, relPath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const hits = [];
  lines.forEach((line, idx) => {
    for (const { re } of patterns) {
      if (re.test(line)) {
        hits.push({ line: idx + 1, text: line.trim() });
        break;
      }
    }
  });
  if (hits.length > 0) {
    return { file: relPath, hits };
  }
  return null;
}

const files = walk(projectRoot, []);
const violations = [];
for (const f of files) {
  const v = scanFile(f.full, f.rel);
  if (v) violations.push(v);
}

if (violations.length > 0) {
  console.error('❌ Found direct profile navigation(s). Please use pushProfile from utils/nav.ts');
  for (const v of violations) {
    console.error(`\nFile: ${v.file}`);
    for (const h of v.hits) {
      console.error(`  Line ${h.line}: ${h.text}`);
    }
  }
  process.exit(1);
} else {
  console.log('✅ No direct profile navigations found.');
}
