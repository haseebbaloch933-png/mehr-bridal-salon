// @ts-check
import { defineConfig } from 'astro/config';

// Which client to build. `CLIENT=meher-salon npm run build`
const client = process.env.CLIENT || 'meher-salon';

export default defineConfig({
  // Every client is a static site on Cloudflare Pages. No server, no runtime cost.
  output: 'static',

  // Set per client at build time so canonical URLs and Schema.org are right.
  site: process.env.SITE_URL || 'https://haseebbaloch933-png.github.io',
  base: process.env.BASE_PATH || '/mehr-bridal-salon',

  server: {
    // Astro ignores the PORT env var by default and always binds 4321, so a
    // launcher that assigns a free port via autoPort has no way to steer it.
    // Reading PORT here is what makes that assignment actually take effect.
    port: process.env.PORT ? Number(process.env.PORT) : 4321,
    // Default is loopback-only, so a phone on the same Wi-Fi can't reach the
    // dev server even with the right IP — needed for real-device checks.
    // Trade-off: this also opens the port to anyone else on that network.
    host: true,
  },

  build: {
    // One CSS file inlined into the HTML rather than a separate request.
    // At our page sizes the extra round trip costs more than the bytes.
    inlineStylesheets: 'always',
  },

  image: {
    // sharp handles AVIF/WebP generation at build time.
    service: { entrypoint: 'astro/assets/services/sharp' },
  },

  vite: {
    define: {
      __CLIENT_ID__: JSON.stringify(client),
    },
    build: {
      // Small pages: one bundle beats many.
      cssCodeSplit: false,
    },
  },

  // No prefetch, no view transitions, no client router. Every KB has to earn itself.
  prefetch: false,
});
