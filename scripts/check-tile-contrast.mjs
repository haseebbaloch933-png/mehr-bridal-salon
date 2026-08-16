/**
 * One-off verification: does the white caption text on each gallery tile
 * clear 4.5:1 against the ACTUAL photo behind it, once the .tile::after
 * scrim (linear-gradient transparent -> rgba(32,30,29,.6), covering the
 * bottom 45% of the tile) is composited in?
 *
 * Real photographs vary in brightness where a caption sits — unlike the old
 * abstract gradient placeholders, which were authored to always be dark at
 * the bottom. This checks the built output directly with sharp rather than
 * fighting the browser pane, since the tool timed out mid-render there.
 */
import sharp from 'sharp';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist/_astro';
const SLOTS = ['barat-01', 'mehndi-01', 'walima-01', 'engagement-01'];

const relLum = (r, g, b) => {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (l1, l2) => {
  const [a, b] = [l1, l2].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
};

const files = readdirSync(DIST);
let anyFail = false;

for (const slot of SLOTS) {
  // Largest AVIF variant for this source = the 2x asset a phone actually
  // requests. Falls back to jpeg if a source had no avif (shouldn't happen).
  const candidates = files.filter((f) => f.startsWith(slot + '.') && /\.(avif|jpeg)$/.test(f));
  let best = null;
  let bestW = 0;
  for (const f of candidates) {
    const meta = await sharp(join(DIST, f)).metadata();
    if (meta.width > bestW) {
      bestW = meta.width;
      best = f;
    }
  }
  if (!best) {
    console.log(`${slot}: no built variant found`);
    continue;
  }

  const path = join(DIST, best);
  const { data, info } = await sharp(path).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;

  // Tile is aspect-ratio 3/4, padding:12px, caption sits in the bottom-left.
  // Sample a band matching where the caption text actually renders.
  const bandH = Math.round(H * 0.05);
  const bandY = H - bandH - Math.round(H * 0.03);
  const bandX = Math.round(W * 0.03);
  const bandW = Math.min(Math.round(W * 0.35), W - bandX * 2);

  let R = 0,
    G = 0,
    B = 0,
    n = 0;
  for (let y = bandY; y < bandY + bandH; y++) {
    for (let x = bandX; x < bandX + bandW; x++) {
      const i = (y * W + x) * 4;
      R += data[i];
      G += data[i + 1];
      B += data[i + 2];
      n++;
    }
  }
  R /= n;
  G /= n;
  B /= n;

  // Scrim: transparent -> rgba(32,30,29,.6) linear from 55% to 100% of tile height.
  const scrimStartY = H * 0.55;
  const frac = Math.max(0, Math.min(1, (bandY - scrimStartY) / (H - scrimStartY)));
  const alpha = 0.6 * frac;
  const cR = R * (1 - alpha) + 32 * alpha;
  const cG = G * (1 - alpha) + 30 * alpha;
  const cB = B * (1 - alpha) + 29 * alpha;

  const bgLum = relLum(cR, cG, cB);
  const whiteLum = relLum(255, 255, 255);
  const ratio = Math.round(contrast(whiteLum, bgLum) * 100) / 100;
  const verdict = ratio >= 4.5 ? 'PASS' : ratio >= 3 ? 'LARGE-ONLY' : 'FAIL';
  if (verdict !== 'PASS') anyFail = true;

  console.log(
    `${slot.padEnd(14)} ${best.padEnd(28)} ${W}x${H}  raw(${Math.round(R)},${Math.round(
      G
    )},${Math.round(B)})  scrimA=${alpha.toFixed(2)}  ->  contrast ${ratio}  ${verdict}`
  );
}

if (anyFail) {
  console.error(
    '\n✗ at least one caption fails 4.5:1 against its photo — pick a darker crop, add a stronger scrim for that tile, or swap the photo\n'
  );
  process.exit(1);
}
console.log('\n✓ every caption clears 4.5:1 against its photo\n');
