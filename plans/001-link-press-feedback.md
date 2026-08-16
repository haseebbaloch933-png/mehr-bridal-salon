# 001 — Add press feedback to three button-styled links

- **Status**: DONE — implemented and verified same session (commit 2ea88fa base). CSSOM inspection confirmed all three `:active` rules and the reduced-motion override landed exactly as specced; the `:active` pseudo-class itself can't be triggered by synthetic pointer/mouse events in Chromium (confirmed empirically — this is a browser limitation, not a defect), so live-press feel-check is still owed on a real device or via DevTools' "Emulate a focused page" + manual click-hold.
- **Commit**: 2ea88fa
- **Severity**: HIGH
- **Category**: 3. Physicality & origin (pressable elements with no press feedback)
- **Estimated scope**: 1 file, ~6 lines added (`src/skins/salon-organic.css`)

## Problem

Three `<a>` elements are styled to look like buttons and each is the tap
target for a real conversion action, but none has an `:active` state. Each
only transitions a *hover* property, and hover never fires on the touch
devices this site is built for (390px design target, per
`src/styles/base.css:79`).

**1. `.card__cta`** — `src/components/Packages.astro:45-48`, the "Enquire on
WhatsApp" link on every bridal package card, including the featured
Rs 1,25,000 "Complete Bridal" card. This is the highest-intent action on the
page.

```astro
<!-- src/components/Packages.astro:45-48 — current -->
<a
  class="card__cta"
  rel="noopener"
  href={waLink(contact.whatsapp, packageMessage(business.name, p.name, pkr(p.price)))}
>
```

```css
/* src/skins/salon-organic.css:454-467 — current */
.card__cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-pill);
  padding: 13px;
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--fg);
  transition: background var(--t) var(--ease), border-color var(--t) var(--ease);
}

.card__cta:hover {
  background: color-mix(in srgb, var(--fg) 7%, transparent);
}
```

**2. `.menu__row`** — `src/components/PriceMenu.astro:44`, every row of the
price list; each row is a full-width link to WhatsApp with the priced item
pre-filled. The section's own copy states this is the page's core job: *"Tap
any item to book it on WhatsApp."*

```astro
<!-- src/components/PriceMenu.astro:44 — current -->
<a
  class="menu__row"
  rel="noopener"
  href={waLink(contact.whatsapp, menuItemMessage(business.name, item.name, pkr(item.price)))}
>
```

```css
/* src/skins/salon-organic.css:499-505 — current */
.menu__row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 14px 0;
  border-bottom: 1px solid var(--rule);
  transition: color var(--t) var(--ease);
}
```

**3. `.maplink`** — `src/components/FindUs.astro:51`, the "Open in Google
Maps" link. Lowest stakes of the three, but the identical defect: no
transition property of any kind exists on this rule today.

```astro
<!-- src/components/FindUs.astro:51 — current -->
<a class="maplink" href={mapsHref(mapQuery)} rel="noopener" target="_blank">
```

```css
/* src/skins/salon-organic.css:767-778 — current */
.maplink {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-top: 16px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-pill);
  padding: 14px;
  font-family: var(--font-display);
  font-size: 14px;
  background: var(--bg);
}
```

## Target

One shared `:active` rule covers all three selectors — same defect, same
fix, applied once:

```css
/* target — appended to src/skins/salon-organic.css */
.card__cta:active,
.menu__row:active,
.maplink:active {
  transform: scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .card__cta:active,
  .menu__row:active,
  .maplink:active {
    transition: none;
  }
}
```

Plus one line added to each of the three existing `transition` declarations
(do not replace the declaration, extend it):

```css
/* src/skins/salon-organic.css:466 — target */
.card__cta {
  /* ...unchanged... */
  transition: background var(--t) var(--ease), border-color var(--t) var(--ease),
    transform 160ms var(--ease);
}

/* src/skins/salon-organic.css:505 — target */
.menu__row {
  /* ...unchanged... */
  transition: color var(--t) var(--ease), transform 160ms var(--ease);
}

/* src/skins/salon-organic.css:767 — target (this selector currently has NO
   transition property — this step ADDS one, it does not extend one) */
.maplink {
  /* ...unchanged... */
  transition: transform 160ms var(--ease);
}
```

**Exact values, and why each one is not the repo's default:**

- **`scale(0.98)`**, not AUDIT.md's worked example of `0.97`. AUDIT.md's
  sanctioned range is explicitly `0.95–0.98`; `0.98` is chosen at the quiet
  end of that range because these are outline/pill links on a warm cream
  ground, in a skin whose own file header documents a "restrained glow"
  direction — `0.97` reads slightly more assertive than the rest of this
  skin's interactions.
- **`160ms`**, the literal duration from AUDIT.md's press-feedback recipe
  (`transform: scale(0.97)` on `:active` with `transition: transform 160ms
  ease-out`), not a freehand pick from the 100–160ms budget range. AUDIT.md
  §3 gives one exact worked value for this exact recipe — use it verbatim
  rather than approximating.
- **`var(--ease)`**, not AUDIT.md's generic `ease-out` keyword or its
  `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` token. This repo already
  defines and uses `--ease: cubic-bezier(0.2, 0.6, 0.3, 1)` — the same curve
  that drives `.reveal`, `.card`, `.card__cta`'s own hover, `.menu__row`'s
  own hover, and `.field input:focus`. Introducing a second, unrelated curve
  for a three-line fix is itself a Category 7 (Cohesion & tokens) violation
  ("five hand-typed cubic-beziers that almost match is a consolidation
  finding") — reuse the token that already exists.
- **Reduced-motion**: not omitted, and not a full removal either. AUDIT.md
  §6 is explicit that reduced motion means "fewer and gentler... not zero."
  A 2% press-scale is feedback-class motion (it confirms a tap registered),
  not the disorienting spatial motion the guideline targets — so the fix
  keeps the scale change but drops its transition to instant
  (`transition: none`) under `prefers-reduced-motion: reduce`, rather than
  either animating it in full or removing the feedback outright. This is a
  deliberate, documented deviation from this exact codebase's existing
  precedent at `src/styles/base.css:189-191` (`.btn:active { transform:
  translateY(1px) }`, no reduced-motion carve-out at all) — that precedent
  under-serves AUDIT.md §6 and should not be copied forward into new code,
  even though it was the closest existing exemplar.

## Repo conventions to follow

- Skin-level motion tokens live at the top of `src/skins/salon-organic.css`
  (`:root { --t: 200ms; --ease: cubic-bezier(0.2, 0.6, 0.3, 1); ... }`). Reuse
  `--ease`; do not add a new curve token for this plan.
- Existing exemplar of the *pattern* being extended:
  `src/styles/base.css:189-191` —
  ```css
  .btn:active {
    transform: translateY(1px);
  }
  ```
  This plan's `:active` rule follows the same shape (a bare `:active`
  selector setting `transform`), just with `scale()` instead of
  `translateY()` and its own transition rather than `.btn`'s.
- `transition` properties in this file are always comma-separated lists on
  one declaration, not stacked separate `transition-*` rules — match that
  when extending `.card__cta` and `.menu__row`.

## Steps

1. Open `src/skins/salon-organic.css`. Locate `.card__cta` at line 454–467.
   Change its `transition` line (466) from
   `transition: background var(--t) var(--ease), border-color var(--t) var(--ease);`
   to
   `transition: background var(--t) var(--ease), border-color var(--t) var(--ease), transform 160ms var(--ease);`
2. Locate `.menu__row` at line 499–505. Change its `transition` line (505)
   from `transition: color var(--t) var(--ease);` to
   `transition: color var(--t) var(--ease), transform 160ms var(--ease);`
3. Locate `.maplink` at line 767–778. It has no `transition` property today.
   Add one: `transition: transform 160ms var(--ease);` as a new line inside
   the rule (placement inside the block does not matter; group it near the
   other layout properties for readability).
4. After the `.maplink` block (or any single location — this is a new,
   self-contained rule, not an extension of an existing one), add:
   ```css
   .card__cta:active,
   .menu__row:active,
   .maplink:active {
     transform: scale(0.98);
   }

   @media (prefers-reduced-motion: reduce) {
     .card__cta:active,
     .menu__row:active,
     .maplink:active {
       transition: none;
     }
   }
   ```

## Boundaries

- Do NOT touch `src/skins/salon.css` or `src/skins/salon-noir.css` — this
  finding and its fix are specific to the file cited (`salon-organic.css`);
  the other two skins were not audited by this plan and may have different
  (or no) defects in the same selectors.
- Do NOT touch `src/styles/base.css` — `.btn:active` is out of scope for
  this plan; it already has press feedback and is not part of this finding,
  even though it's cited above as a conventions exemplar.
- Do NOT change markup/structure in the three `.astro` component files —
  this is a CSS-only fix; the component files are cited above for context
  only, no edit is required in any of them.
- Do NOT add a new easing token. Reuse `--ease`.
- If the current code at any cited line does not match what's shown above
  (drift since commit `2ea88fa`), STOP and report the mismatch instead of
  improvising a fix.

## Verification

- **Mechanical**: `CLIENT=meher-salon npm run build` from the `site-engine`
  root. Expect a clean build and the existing weight-budget check
  (`scripts/check-weight.mjs`, runs automatically as part of `npm run
  build`) to still pass — this change adds a few dozen bytes of CSS, nothing
  that should move the page anywhere near its 400 KB budget.
- **Feel check**: run `CLIENT=meher-salon npm run dev`, open the site on a
  touch-emulated viewport (or a real phone) at the `meher-salon` client, and:
  - Tap and hold the "Enquire on WhatsApp" button on the featured "Complete
    Bridal" package card. Confirm it visibly compresses (~2%) while held and
    releases on lift — before the browser navigates away.
  - Tap and hold any row in the price list (`#prices`). Confirm the same
    compress-on-press feedback, and that it does not conflict with or delay
    the existing hover color transition on `.menu__price`.
  - Tap and hold "Open in Google Maps" at the bottom of the page. Confirm it
    now has press feedback where it previously had none at all.
  - In Chrome DevTools, set the Animations panel playback to 10% and repeat
    one press on `.card__cta`; confirm the scale eases in and out smoothly
    with no jump or flash at either end.
  - Toggle `prefers-reduced-motion: reduce` in the Rendering panel and press
    each of the three elements again: confirm the scale change still happens
    (feedback is not silently removed) but registers instantly rather than
    easing.
- **Done when**: all three elements visibly compress on `:active`, the
  build passes, and the reduced-motion check shows instant (not animated,
  not absent) feedback.
