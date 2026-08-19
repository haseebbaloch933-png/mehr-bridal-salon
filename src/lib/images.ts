/**
 * Client photo resolution.
 *
 * Client images live in `clients/<id>/images/` and are referenced from the
 * client JSON by bare filename ("barat-01.jpg"). They are deliberately NOT in
 * `public/`: files under public are copied through untouched, so a 4 MB photo
 * straight off a phone would ship at 4 MB. Importing them through Astro's
 * asset pipeline instead means sharp resizes and re-encodes each one to AVIF
 * and WebP at build time.
 *
 * That distinction is the single biggest lever on page weight, and it is the
 * one that silently rots: every client sends photos from a phone camera.
 */

import type { ImageMetadata } from 'astro';

/*
 * Eager glob so lookups are synchronous during render. Astro needs the literal
 * pattern here — it cannot be built from a variable — so every client's images
 * are enumerated and the unused ones are tree-shaken out of the build.
 *
 * Tree-shaken by reference, not by directory: this glob still matches every
 * client's images/ folder on disk, but only entries actually read through
 * `files[key]` below make it into a given build's output. A root-relative
 * literal path is required here — routing this through a Vite `resolve.alias`
 * to pre-scope it to one client was tried and reverted, because it stopped
 * Astro's asset pipeline recognising the import as a local image: Picture
 * silently fell back to serving the untouched source file instead of
 * sharp-generated AVIF/WebP variants. See check-weight.mjs for how build
 * output is still kept honest per-client despite the shared glob.
 */
const files = import.meta.glob<{ default: ImageMetadata }>(
  '/clients/**/images/*.{jpg,jpeg,png,webp,avif}',
  { eager: true }
);

/**
 * Resolves a bare filename from a client JSON to its imported asset.
 * Returns undefined when the client has not sent that photo yet, which is the
 * normal state while a site is being built ahead of the content arriving.
 */
export function clientImage(clientId: string, filename?: string): ImageMetadata | undefined {
  if (!filename) return undefined;
  const key = `/clients/${clientId}/images/${filename}`;
  return files[key]?.default;
}

/** True when at least one real photo exists for this client. */
export function hasImages(clientId: string): boolean {
  const prefix = `/clients/${clientId}/images/`;
  return Object.keys(files).some((k) => k.startsWith(prefix));
}
