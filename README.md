# site-engine

One engine, five skins. Static sites for Islamabad local businesses, each driven
by a single JSON file.

Built for the 26 verified leads in PWD, Soan Gardens, Ghauri Town and Bhara Kahu
— salons, gyms, dental clinics, bakeries and tailors that have real customers
and no working website.

## Why it is built this way

| Decision | Reason |
| --- | --- |
| One JSON per client | The first site costs ~37 hours. Every one after is a content pass. That gap is the business. |
| WhatsApp is the checkout | 75% of Pakistani orders are cash on delivery; bank-account penetration is ~28%. A payment gateway would serve a small minority and cost the client a monthly fee. |
| No admin panel, no CMS, no login | Owners are typically 45+ and run everything from WhatsApp. An unused dashboard means a stale site by month two. |
| Static, no framework on the client | 26 clients on a framework is 26 dependency trees to patch. |
| 400 KB budget, enforced by the build | Islamabad has fiber (68 Mbps, 8–12 ms) so there is room for real craft — but photo bloat is what silently rots these sites. |
| Single-theme skins | A bridal atelier is dark and warm; a dental clinic is bright and clean. Committing to one look *is* the design. |

## Usage

```bash
npm install

# develop a client
CLIENT=meher-salon npm run dev

# build (validates content, then checks page weight)
CLIENT=meher-salon npm run build

# start a new client
node scripts/new-client.mjs iqra-salon salon
```

On Windows PowerShell, set the variable first:

```powershell
$env:CLIENT = "meher-salon"; npm run dev
```

## Layout

```
clients/<id>.json     all client content — the only file you edit per client
src/lib/schema.ts     the content contract + build-time validation
src/lib/whatsapp.ts   message composers (the checkout)
src/lib/format.ts     PKR grouping (1,25,000 not 125,000), phone normalisation
src/styles/base.css   the token contract every skin must fill
src/skins/<trade>.css one file per trade — this is what a new vertical costs
src/components/       eight sections, all optional, all token-driven
scripts/              weight guard, client scaffolder
```

## Adding a trade

1. Write `src/skins/<trade>.css` defining every token in `base.css`.
2. Add the trade to the `Skin` union in `schema.ts`.
3. Add the import line in `layouts/Site.astro`.

No component changes. If you need one, the schema is missing a field — add it
there instead.

## Status

- [x] Content schema with build-time validation
- [x] WhatsApp composer
- [x] Token contract
- [x] Salon skin
- [x] Eight section components
- [x] Weight guard
- [ ] Dental skin
- [ ] Gym skin
- [ ] Self-hosted subset fonts (Cormorant/Jost/Nastaliq) — falls back to system stack today
- [ ] Image pipeline (AVIF/WebP + srcset)
- [ ] Cloudflare Pages deploy script

## Fonts

Currently falling back to a system serif/sans stack, which looks good and costs
nothing. To self-host: drop woff2 files in `public/fonts/`, add `@font-face`
blocks, and **subset the Nastaliq face to the fixed Urdu strings only** — the
full Noto Nastaliq Urdu is roughly 2 MB and would blow the budget on its own.

Check it renders in Nastaliq, not Naskh. A Pakistani reader notices immediately.
