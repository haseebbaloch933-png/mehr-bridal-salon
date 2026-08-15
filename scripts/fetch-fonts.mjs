/**
 * Downloads and self-hosts the type system.
 *
 *   node scripts/fetch-fonts.mjs [client-id]
 *
 * Why self-host rather than link Google Fonts:
 *  - A <link> to fonts.googleapis.com is a DNS lookup, a TLS handshake and a
 *    redirect before a single glyph arrives. On the road in Islamabad that is
 *    the difference between text at 400ms and text at 1.4s.
 *  - It also leaks every visitor to a third party, which is a bad answer to
 *    give an owner who asks where their customers' data goes.
 *
 * The Nastaliq problem
 * --------------------
 * Noto Nastaliq Urdu is ~2 MB. Shipping it whole would blow the entire page
 * budget on eight words of decoration. So the Urdu face is subset to exactly
 * the characters this client actually uses, via the Google Fonts `text=`
 * parameter — which returns a font containing those glyphs and nothing else.
 * Typical result: 8-15 KB instead of 2 MB.
 *
 * Rerun this whenever the Urdu strings in a client file change, or the new
 * characters will silently fall back to Naskh.
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const CLIENT = process.argv[2] || 'meher-salon';
const OUT_DIR = join('public', 'fonts');
const CSS_OUT = join('src', 'styles', 'fonts.css');

// Chrome UA, or the API serves ttf instead of woff2 (roughly 2x the bytes).
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Urdu baked into components rather than the client file. Keep in sync. */
const UI_URDU = ['اپوائنٹمنٹ', 'پتہ'];

/*
 * Only weights the CSS actually uses. Every extra weight is ~26-37 KB, and at
 * a 400 KB page budget three unused faces is a tenth of the whole page spent
 * on nothing. Grep the skins before adding one.
 */
const FACE_SETS = {
  /* Warm-atelier skin: Fraunces + DM Sans. */
  salon: [
    {
      id: 'fraunces',
      family: 'Fraunces',
    /*
     * Display face: wordmark, headings, prices.
     *
     * Chosen over Cormorant Garamond, which is *the* wedding font — a bride
     * who has looked at three other salons has already seen it, and it reads
     * as a template. Fraunces has optical sizing and a softness that sits
     * better against skin and fabric. Requesting the static 500 weight rather
     * than the variable font: the full variable file carries SOFT and WONK
     * axes we barely touch, at several times the size.
     */
      query: 'Fraunces:opsz,wght@9..144,500',
      weights: ['500'],
    },
    {
      id: 'dmsans',
      family: 'DM Sans',
      /*
       * Body at 400, labels at 500, buttons at 600. Replaces Jost, which is
       * geometric Futura-adjacent and runs cold — wrong temperature for a
       * beauty brand.
       *
       * Variable, not three statics. Each static DM Sans weight is ~36 KB, so
       * 400/500/600 as separate files costs 108 KB; the variable file covering
       * the whole range is a fraction of that and lets the skin use any weight
       * in between without another download.
       */
      query: 'DM+Sans:wght@400..600',
      variable: '400 600',
    },
  ],

  /*
   * Organic skin: the pairing specified by the imported Claude Design system
   * (_ds/organic-…/styles.css). Caprasimo is a heavy display face used at 400
   * only — it has no other weight — and Figtree covers body through button
   * weights as one variable file.
   */
  'salon-organic': [
    { id: 'caprasimo', family: 'Caprasimo', query: 'Caprasimo:wght@400', weights: ['400'] },
    { id: 'figtree', family: 'Figtree', query: 'Figtree:wght@400..700', variable: '400 700' },
  ],
};

/*
 * Every skin's faces, always.
 *
 * fonts.css is a single file shared by all builds, so emitting only the
 * current skin's faces silently broke the others — the first run of this
 * script for the organic skin wiped Fraunces and DM Sans out from under the
 * warm-atelier skin. Declaring the union is free at runtime: a browser only
 * downloads a face when a rule actually references it, and the preload hints
 * (which are the part that costs a request) are chosen per skin in Site.astro.
 */
const LATIN = Object.values(FACE_SETS).flat();

const isArabicScript = (s) => /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(s);

/*
 * Pull the woff2 URL out of an @font-face block.
 *
 * The full-family endpoint returns a tidy .../abc.woff2. The `text=` subset
 * endpoint returns .../l/font?kit=...&skey=... with no extension at all, so
 * matching on a .woff2 suffix silently finds nothing — which is exactly how
 * the Nastaliq face went missing on the first run. Key off format('woff2')
 * instead, which both endpoints emit.
 */
function grabWoff2(css) {
  return css.match(/url\((https:[^)]+)\)\s*format\(['"]woff2['"]\)/)?.[1] ?? null;
}

/** Walks any JSON shape and collects every string containing Arabic script. */
function collectUrdu(node, found = new Set()) {
  if (typeof node === 'string') {
    if (isArabicScript(node)) found.add(node);
  } else if (Array.isArray(node)) {
    node.forEach((n) => collectUrdu(n, found));
  } else if (node && typeof node === 'object') {
    Object.values(node).forEach((n) => collectUrdu(n, found));
  }
  return found;
}

async function getCss(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return buf.length;
}

const kb = (n) => Math.round((n / 1024) * 10) / 10;

await mkdir(OUT_DIR, { recursive: true });

const faces = [];
let totalBytes = 0;

/* ---- Latin faces ------------------------------------------------- */

for (const font of LATIN) {
  // latin subset only. These businesses serve Pakistan; latin-ext, Cyrillic and
  // Vietnamese are pure waste here.
  const css = await getCss(
    `https://fonts.googleapis.com/css2?family=${font.query}&display=swap&subset=latin`
  );

  // Google returns one @font-face block per (weight, unicode-range). Take the
  // latin block for each weight — identified by the U+0000-00FF range.
  const blocks = css.split('@font-face').slice(1);

  /* Variable: one file covers the whole weight range. */
  if (font.variable) {
    const block = blocks.find((b) => b.includes('U+0000-00FF'));
    const url = block && grabWoff2(block);
    if (!url) {
      console.warn(`  ! no latin block for ${font.family} (variable)`);
      continue;
    }
    const file = `${font.id}-var.woff2`;
    const size = await download(url, join(OUT_DIR, file));
    totalBytes += size;
    console.log(`  ${font.family} ${font.variable} (var)`.padEnd(34) + `${kb(size)} KB`);
    faces.push({ family: font.family, weight: font.variable, file, display: 'swap' });
    continue;
  }

  for (const weight of font.weights) {
    const block = blocks.find(
      (b) => b.includes(`font-weight: ${weight}`) && b.includes('U+0000-00FF')
    );
    if (!block) {
      console.warn(`  ! no latin block for ${font.family} ${weight}`);
      continue;
    }
    const url = grabWoff2(block);
    if (!url) continue;

    const file = `${font.id}-${weight}.woff2`;
    const size = await download(url, join(OUT_DIR, file));
    totalBytes += size;
    console.log(`  ${font.family} ${weight}`.padEnd(34) + `${kb(size)} KB`);

    faces.push({ family: font.family, weight, file, display: 'swap' });
  }
}

/* ---- Nastaliq, subset to this client's actual glyphs -------------- */

const clientJson = JSON.parse(await readFile(join('clients', `${CLIENT}.json`), 'utf8'));
const strings = [...collectUrdu(clientJson), ...UI_URDU];
const chars = [...new Set(strings.join('').split(''))].sort().join('');

if (chars.length === 0) {
  console.log('\n  No Urdu in this client — skipping Nastaliq.\n');
} else {
  const url =
    `https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu` +
    `&text=${encodeURIComponent(chars)}&display=swap`;

  const css = await getCss(url);
  const woff2 = grabWoff2(css);
  const range = css.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim();

  if (!woff2) {
    console.warn('  ! Google returned no woff2 for Nastaliq');
    console.warn(css.slice(0, 400));
  } else {
    const file = 'nastaliq-400.woff2';
    const size = await download(woff2, join(OUT_DIR, file));
    totalBytes += size;
    console.log(`  Noto Nastaliq Urdu (${chars.length} chars)`.padEnd(34) + `${kb(size)} KB`);
    faces.push({
      family: 'Noto Nastaliq Urdu',
      weight: '400',
      file,
      display: 'swap',
      // Carrying the range through means the browser will not even fetch this
      // face for a page with no Urdu on it.
      range,
    });
  }
}

/* ---- emit fonts.css ---------------------------------------------- */

const header = `/*
 * GENERATED by scripts/fetch-fonts.mjs — do not edit by hand.
 *
 * Self-hosted, latin-subset for the Latin faces, and the Nastaliq face subset
 * to exactly the ${chars.length} Urdu characters this client uses. Rerun the
 * script whenever the Urdu strings change or new characters will fall back to
 * Naskh, which a Pakistani reader spots immediately.
 *
 * font-display: swap — text must be readable before the face arrives. A
 * flash of fallback beats a blank hero.
 */\n\n`;

const body = faces
  .map(
    (f) => `@font-face {
  font-family: "${f.family}";
  font-style: normal;
  font-weight: ${f.weight};
  font-display: ${f.display};
  src: url("/fonts/${f.file}") format("woff2");${f.range ? `\n  unicode-range: ${f.range};` : ''}
}`
  )
  .join('\n\n');

await writeFile(CSS_OUT, header + body + '\n', 'utf8');

console.log(`\n  ${faces.length} faces, ${kb(totalBytes)} KB total`);
console.log(`  wrote ${CSS_OUT}\n`);
