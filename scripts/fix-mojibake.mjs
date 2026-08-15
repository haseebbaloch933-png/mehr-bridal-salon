/**
 * One-off repair: undo latin1/utf8 double-encoding in a text file.
 *
 * Cause: editing a UTF-8 file with PowerShell 5.1's
 * `Get-Content -Raw` + `Set-Content -Encoding utf8`. Get-Content decodes as
 * ANSI, Set-Content re-encodes as UTF-8 and prepends a BOM. Every multi-byte
 * character comes back mangled, and the BOM makes a browser parse
 * `﻿:root` as one invalid selector — silently dropping the entire
 * token block.
 *
 * Use Node or the Edit tool for UTF-8 files on Windows, never Set-Content.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/fix-mojibake.mjs <file>');
  process.exit(1);
}

let buf = readFileSync(file);
if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
  buf = buf.subarray(3);
  console.log('stripped UTF-8 BOM');
}

let s = buf.toString('utf8');

// Targeted, not a blanket re-decode: a blanket Buffer.from(s,'latin1') round
// trip introduced U+FFFD here, meaning the original mangling was lossy for
// some characters. Replacing only known sequences cannot make things worse.
const MAP = {
  'â€”': '—', // em dash
  'â€“': '–', // en dash
  'â€™': '’', // right single quote
  'â€œ': '“', // left double quote
  'â€': '”', // right double quote
  'â€¦': '…', // ellipsis
  'Ã—': '×', // multiplication sign
};

let fixed = 0;
for (const [bad, good] of Object.entries(MAP)) {
  const n = s.split(bad).length - 1;
  if (n) {
    s = s.split(bad).join(good);
    fixed += n;
  }
}

writeFileSync(file, s, 'utf8');

const left = (s.match(/[À-ÿ][-ÿ]/g) || []).length;
console.log(`repaired ${fixed} sequences, ${left} suspicious byte pairs remain`);
