/**
 * Page weight guard.
 *
 * Islamabad runs 68 Mbps fixed and 8-12ms latency on Nayatel fiber, so the
 * budget is generous compared with the national picture — but customers also
 * browse on mobile data around the city, and page weight is the one thing that
 * silently rots as clients send more photos. Failing the build is the only
 * enforcement that survives a busy week.
 */

import { readdir, stat, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const LIMIT_KB = 400; // total per page, transferred
const HTML_LIMIT_KB = 80; // gzipped HTML alone

const kb = (bytes) => Math.round((bytes / 1024) * 10) / 10;

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const files = await walk(DIST);

if (files.length === 0) {
  console.error('✗ nothing in dist/ — did the build run?');
  process.exit(1);
}

let total = 0;
const byType = new Map();
let htmlGz = 0;

for (const f of files) {
  const { size } = await stat(f);
  total += size;
  const ext = extname(f) || 'other';
  byType.set(ext, (byType.get(ext) ?? 0) + size);

  if (ext === '.html') {
    htmlGz += gzipSync(await readFile(f)).length;
  }
}

console.log('\n  Page weight');
console.log('  ───────────────────────────────');
for (const [ext, size] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${ext.padEnd(8)} ${String(kb(size)).padStart(8)} KB`);
}
console.log('  ───────────────────────────────');
console.log(`  ${'total'.padEnd(8)} ${String(kb(total)).padStart(8)} KB   (limit ${LIMIT_KB})`);
console.log(`  ${'html gz'.padEnd(8)} ${String(kb(htmlGz)).padStart(8)} KB   (limit ${HTML_LIMIT_KB})\n`);

let failed = false;

if (kb(total) > LIMIT_KB) {
  console.error(`✗ over budget by ${kb(total) - LIMIT_KB} KB — compress the photos before shipping`);
  failed = true;
}

if (kb(htmlGz) > HTML_LIMIT_KB) {
  console.error(`✗ HTML alone is ${kb(htmlGz)} KB gzipped — something is being inlined that shouldn't be`);
  failed = true;
}

if (failed) process.exit(1);
console.log('✓ within budget\n');
