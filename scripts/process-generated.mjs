/**
 * One-off: turn the raw OpenArt generations into proper source images at the
 * existing placeholder filenames.
 *
 * Astro's own asset pipeline (astro:assets → sharp) re-encodes to AVIF/WebP
 * at build time regardless of the source, so this only needs to (a) center-
 * crop to the aspect ratio each slot actually uses and (b) cap the source
 * dimensions to a bit above the largest width the site ever requests, so a
 * multi-MB generation doesn't sit in the repo doing nothing useful.
 */
import sharp from 'sharp';
import { statSync } from 'node:fs';

const DIR = 'clients/meher-salon/images';

// [source, output, targetAspect(w/h), maxOutputWidth]
const JOBS = [
  ['hero-gen-raw.png', 'hero-01.jpg', 3 / 4, 1000], // hero: widths [470,940]
  ['barat-gen.png', 'barat-01.jpg', 3 / 4, 500], // gallery: widths [220,440]
  ['mehndi-gen.png', 'mehndi-01.jpg', 3 / 4, 500],
  ['walima-gen.png', 'walima-01.jpg', 3 / 4, 500],
];

for (const [src, out, aspect, maxW] of JOBS) {
  const inPath = `${DIR}/${src}`;
  const outPath = `${DIR}/${out}`;
  const img = sharp(inPath);
  const meta = await img.metadata();

  // Center-crop to the target aspect ratio, whichever axis is excess.
  const srcAspect = meta.width / meta.height;
  let cropW = meta.width;
  let cropH = meta.height;
  if (srcAspect > aspect) {
    cropW = Math.round(meta.height * aspect);
  } else {
    cropH = Math.round(meta.width / aspect);
  }
  const left = Math.round((meta.width - cropW) / 2);
  const top = Math.round((meta.height - cropH) / 2);

  const outW = Math.min(maxW, cropW);

  await sharp(inPath)
    .extract({ left, top, width: cropW, height: cropH })
    .resize({ width: outW })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(outPath);

  const outMeta = await sharp(outPath).metadata();
  const kb = (statSync(outPath).size / 1024).toFixed(0);
  console.log(`${out.padEnd(16)} ${outMeta.width}x${outMeta.height}  ${kb} KB`);
}
