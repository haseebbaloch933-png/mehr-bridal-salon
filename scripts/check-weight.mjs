/**
 * Page weight guard.
 *
 * Islamabad has fiber (68 Mbps, 8-12 ms) so the budget is generous compared
 * with the national picture — but page weight is the one thing that silently
 * rots as clients send more photos, and failing the build is the only
 * enforcement that survives a busy week.
 *
 * MEASURING TRANSFER, NOT DISK
 * ----------------------------
 * A naive sum of dist/ is wrong and actively harmful: responsive images emit
 * AVIF + WebP + JPEG at several widths each, but a browser downloads exactly
 * ONE of those per image. Summing them all triple-counts and fails the build
 * for doing the right thing.
 *
 * So per source image we count the best format at its largest width — the
 * honest worst case for a modern phone. Text assets are counted gzipped,
 * because that is how the server sends them.
 */

import { readdir, stat, readFile } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const LIMIT_KB = 400; // realistic transfer for one visit
const HTML_LIMIT_KB = 80; // gzipped HTML alone

const IMAGE_EXT = new Set(['.avif', '.webp', '.jpeg', '.jpg', '.png', '.gif', '.svg']);
const TEXT_EXT = new Set(['.html', '.css', '.js', '.json', '.xml', '.txt', '.svg']);
/* Format preference must match what a current mobile browser picks. */
const FORMAT_RANK = { '.avif': 0, '.webp': 1, '.jpeg': 2, '.jpg': 2, '.png': 3, '.gif': 4 };

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

/*
 * Astro names variants `<source>.<contentHash>_<variantHash>.<ext>`. Everything
 * before the first dot identifies the original photo.
 */
const imageGroups = new Map(); // source name -> ext -> largest bytes
const fontFiles = new Map(); // filename -> bytes on disk
let textBytes = 0;
let htmlGz = 0;
const textDetail = new Map();
let htmlSource = '';

for (const f of files) {
  const ext = extname(f).toLowerCase();
  const { size } = await stat(f);

  if (ext === '.woff2' || ext === '.woff' || ext === '.ttf') {
    fontFiles.set(basename(f), size);
    continue;
  }

  if (IMAGE_EXT.has(ext) && ext !== '.svg') {
    const source = basename(f).split('.')[0];
    if (!imageGroups.has(source)) imageGroups.set(source, new Map());
    const byExt = imageGroups.get(source);
    // Largest width of this format = the 2x variant the phone actually picks.
    byExt.set(ext, Math.max(byExt.get(ext) ?? 0, size));
    continue;
  }

  if (TEXT_EXT.has(ext)) {
    const raw = await readFile(f);
    const gz = gzipSync(raw).length;
    textBytes += gz;
    textDetail.set(ext, (textDetail.get(ext) ?? 0) + gz);
    if (ext === '.html') {
      htmlGz += gz;
      htmlSource += raw.toString('utf8');
    }
    continue;
  }

  textBytes += size;
}

/*
 * Fonts a visitor actually downloads.
 *
 * fonts.css declares every skin's faces so that switching skins cannot wipe
 * another one's @font-face rules, and public/ copies all of them into dist.
 * A browser only fetches a face when a rule references its family, so summing
 * the directory overstates the page by whatever the unused skins weigh —
 * the same disk-versus-transfer mistake the image counting used to make.
 *
 * So: read the family of each @font-face and its file, then keep only the
 * families this build's CSS actually names.
 */
/* Quotes and whitespace are optional: fonts.css is bundled and minified
 * (`font-family:Fraunces`) while the skin is inlined raw (`"Caprasimo"`). */
const faces = [
  ...htmlSource.matchAll(
    /@font-face\s*\{[^}]*?font-family:\s*"?([^";}]+?)"?\s*;[^}]*?url\(\s*"?\/fonts\/([^")\s]+?)"?\s*\)[^}]*\}/g
  ),
].map((m) => ({ family: m[1].trim(), file: m[2] }));

/* Strip @font-face blocks — else every declared family trivially matches its
 * own declaration — and CSS comments, else a face merely discussed in a
 * rationale comment counts as used. */
const usage = htmlSource
  .replace(/@font-face\s*\{[^}]*\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '');

let fontBytes = 0;
const fontRows = [];
const counted = new Set();
for (const { family, file } of faces) {
  if (counted.has(file)) continue;
  if (!usage.includes(family)) continue;
  const size = fontFiles.get(file);
  if (size === undefined) continue;
  counted.add(file);
  fontBytes += size;
  fontRows.push([file, size]);
}

const unusedFonts = [...fontFiles.keys()].filter((f) => !counted.has(f));

/* Best format per image = the one a modern browser would take. */
let imageBytes = 0;
const imageRows = [];
for (const [source, byExt] of imageGroups) {
  const best = [...byExt.entries()].sort(
    (a, b) => (FORMAT_RANK[a[0]] ?? 9) - (FORMAT_RANK[b[0]] ?? 9)
  )[0];
  if (!best) continue;
  imageBytes += best[1];
  imageRows.push([source, best[0], best[1]]);
}

const total = textBytes + fontBytes + imageBytes;

console.log('\n  Transferred weight — one visit, modern phone');
console.log('  ─────────────────────────────────────────────');
for (const [ext, size] of [...textDetail.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${(ext + ' (gz)').padEnd(14)} ${String(kb(size)).padStart(8)} KB`);
}
console.log(
  `  ${'fonts'.padEnd(14)} ${String(kb(fontBytes)).padStart(8)} KB   (${fontRows.length} referenced)`
);
for (const [file, size] of fontRows.sort((a, b) => b[1] - a[1])) {
  console.log(`    ${file.padEnd(28)} ${String(kb(size)).padStart(6)} KB`);
}
if (unusedFonts.length) {
  console.log(`    ${`(${unusedFonts.length} other skins' faces on disk, not fetched)`.padEnd(28)}`);
}
console.log(
  `  ${'images'.padEnd(14)} ${String(kb(imageBytes)).padStart(8)} KB   (${imageRows.length} photos, best format @2x)`
);
for (const [name, ext, size] of imageRows.sort((a, b) => b[2] - a[2]).slice(0, 6)) {
  console.log(`    ${(name + ext).padEnd(28)} ${String(kb(size)).padStart(6)} KB`);
}
console.log('  ─────────────────────────────────────────────');
console.log(`  ${'TOTAL'.padEnd(14)} ${String(kb(total)).padStart(8)} KB   (limit ${LIMIT_KB})`);
console.log(`  ${'html gz'.padEnd(14)} ${String(kb(htmlGz)).padStart(8)} KB   (limit ${HTML_LIMIT_KB})\n`);

let failed = false;

if (kb(total) > LIMIT_KB) {
  console.error(
    `✗ over budget by ${Math.round(kb(total) - LIMIT_KB)} KB — the photos are the usual cause`
  );
  failed = true;
}

if (kb(htmlGz) > HTML_LIMIT_KB) {
  console.error(`✗ HTML alone is ${kb(htmlGz)} KB gzipped — something is being inlined that shouldn't be`);
  failed = true;
}

if (failed) process.exit(1);
console.log('✓ within budget\n');
