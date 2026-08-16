# 002 — Stagger the package cards' group entrance

- **Status**: DONE — implemented and verified same session. Confirmed on a genuinely fresh page load: all 3 cards read `opacity:0 / translateY(10px)` before `#packages` enters view; after the real IntersectionObserver fires (not a manual class toggle), all 3 settle to `opacity:1 / transform:none`, card 3 visibly trailing card 1 by the specified stagger. Reduced-motion path verified by direct CSSOM/cascade inspection rather than live OS toggling (no tool available in this session to force `prefers-reduced-motion` on a real page) — confirmed the skin's unconditional `.cards .card` rule (sheet 0) loads before base.css's reduced-motion override (sheet 2), so at equal specificity (0,2,0) source order gives the override the win, and `transition: none` structurally neutralizes the nth-child `transition-delay` regardless of its own higher specificity, since a delay has no effect on a transition that doesn't run. Still worth a real OS-level reduced-motion pass before shipping to a client.
- **Commit**: 2ea88fa
- **Severity**: LOW
- **Category**: 7. Cohesion & tokens (everything-at-once group entrance where a 30-80ms stagger belongs)
- **Estimated scope**: 2 files, ~20 lines added (`src/skins/salon-organic.css`, `src/styles/base.css`)

## Problem

`#packages` (`src/components/Packages.astro:24`) is a single `.reveal`
target. The whole section — heading, sub-copy, and all three bridal package
cards including the featured Rs 1,25,000 "Complete Bridal" card — fades up
as one flat block. This is the page's central decision point (choosing a
package) and it currently arrives with no visual distinction between the
three options.

```astro
<!-- src/components/Packages.astro:24 — current -->
<section class="section reveal" id="packages">
```

```css
/* src/skins/salon-organic.css:348-352 — current */
.cards {
  display: grid;
  gap: 14px;
  margin-top: 26px;
}
```

```css
/* src/skins/salon-organic.css:354-onward — current, relevant excerpt */
.card {
  border: none;
  background: var(--surface);
  border-radius: var(--radius);
  padding: 24px 22px 20px;
  position: relative;
  box-shadow: var(--shadow-soft);
  transition: box-shadow var(--t) var(--ease);
}
```

The reveal mechanism is a single IntersectionObserver in
`src/layouts/Site.astro` that adds `.is-in` to whatever `.reveal` element
entered the viewport, then unobserves it — it never re-fires:

```js
// src/layouts/Site.astro:153-164 — current, unchanged by this plan
var io = new IntersectionObserver(
  function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  },
  { rootMargin: '0px 0px -8% 0px' }
);
for (var j = 0; j < els.length; j++) io.observe(els[j]);
```

And the base reveal styles it drives:

```css
/* src/styles/base.css:245-267 — current */
.reveal {
  opacity: 0;
  transform: translateY(14px);
  transition: opacity 0.38s cubic-bezier(0.2, 0.6, 0.3, 1),
    transform 0.38s cubic-bezier(0.2, 0.6, 0.3, 1);
}

.reveal.is-in {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

.no-js .reveal {
  opacity: 1;
  transform: none;
}
```

## Target

No JavaScript changes. The section keeps observing and toggling `.is-in`
exactly as it does today; this plan only adds CSS so the three `.card`
children inside `#packages` animate on a stagger once their ancestor
receives `.is-in`, instead of appearing already-visible the instant the
section's own fade completes.

```css
/* target — add to src/skins/salon-organic.css, near .cards (line ~352) */
.cards .card {
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 300ms cubic-bezier(0.2, 0.6, 0.3, 1),
    transform 300ms cubic-bezier(0.2, 0.6, 0.3, 1),
    box-shadow var(--t) var(--ease);
}

.section.reveal.is-in .cards .card {
  opacity: 1;
  transform: none;
}

.cards .card:nth-child(2) {
  transition-delay: 60ms;
}

.cards .card:nth-child(3) {
  transition-delay: 120ms;
}
```

```css
/* target — src/styles/base.css:261-267, EXTEND this existing block, do not
   add a new @media (prefers-reduced-motion: reduce) block elsewhere */
@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }

  .cards .card {
    opacity: 1;
    transform: none;
    transition: none;
    transition-delay: 0ms;
  }
}
```

**Exact values, and why:**

- **`cubic-bezier(0.2, 0.6, 0.3, 1)`**, not a new curve — this is
  `src/styles/base.css`'s own `.reveal` curve, copied literally (not
  referenced via a cross-file CSS variable, since `--ease` is defined
  per-skin in `salon-organic.css` and is not visible to `base.css`; the
  numeric value is duplicated intentionally so both files stay internally
  self-contained, which is this repo's existing pattern — `.reveal`'s curve
  in `base.css` is itself a literal, not a token reference).
- **`300ms`**, shorter than `.reveal`'s own `380ms` (written as `0.38s` in
  the source). The section-level reveal is the primary motion; the
  per-card stagger nested inside it is secondary and should read as an
  echo of that motion, not compete with it in duration.
- **Stagger of `60ms` / `120ms`** (card 2, card 3; card 1 has no delay) —
  within AUDIT.md §7's specified 30–80ms-per-step band. Three cards need
  two delay values, not three; the first card moves with the section.
- **`translateY(10px)`**, smaller than `.reveal`'s own `14px` — same
  reasoning as duration: a nested secondary motion should be quieter than
  its parent's, not equal to it.
- Card **`box-shadow` hover transition is preserved** in the target block
  (`box-shadow var(--t) var(--ease)` stays on the same `transition`
  declaration as the new opacity/transform lines) — this plan adds an
  entrance animation, it does not touch or remove the existing hover-lift
  behavior on `.card`.

## Repo conventions to follow

- The reveal system is driven entirely by one class toggle
  (`.is-in`) added by one shared observer — this plan must not add a second
  observer, a second class name, or any inline `<script>`. All new behavior
  is a CSS descendant-selector rule keyed off the existing `.is-in` class
  the parent section already receives.
- Reduced-motion handling for `.reveal`-family motion lives in exactly one
  place: `src/styles/base.css:261-267`. Extend that block; do not create a
  second `@media (prefers-reduced-motion: reduce)` block in
  `salon-organic.css` for this. (Plan 001, by contrast, *does* add its own
  reduced-motion block inside `salon-organic.css` — that's correct there
  because press-feedback is a skin-specific interaction with no shared
  cross-file home; group-entrance motion already has one, in `base.css`,
  and this plan must use it.)
- Exemplar of the exact "nested secondary motion, shorter and smaller than
  its parent" pattern: none exists yet in this codebase — this plan
  introduces it. Treat `.reveal`'s own values (`base.css:245-253`) as the
  parent reference point cited above, not as a pattern to imitate exactly.

## Steps

1. Open `src/skins/salon-organic.css`. Locate `.cards` at line 348–352. Do
   not modify `.cards` itself. Immediately after it (or after `.card` and
   its related rules — placement within the `/* ---- packages
   ---------------------------------------------------------------- */`
   section is fine as long as it stays grouped with the other `.card`
   rules), add:
   ```css
   .cards .card {
     opacity: 0;
     transform: translateY(10px);
     transition: opacity 300ms cubic-bezier(0.2, 0.6, 0.3, 1),
       transform 300ms cubic-bezier(0.2, 0.6, 0.3, 1),
       box-shadow var(--t) var(--ease);
   }

   .section.reveal.is-in .cards .card {
     opacity: 1;
     transform: none;
   }

   .cards .card:nth-child(2) {
     transition-delay: 60ms;
   }

   .cards .card:nth-child(3) {
     transition-delay: 120ms;
   }
   ```
   This *replaces* the existing standalone `.card { transition: box-shadow
   var(--t) var(--ease); }` declaration's `transition` line with the
   three-property version above — do not leave both a `.card` rule and a
   `.cards .card` rule each declaring `transition`, or the cascade order
   between them (both are single-class specificity via the second selector)
   becomes a coin flip. Fold the box-shadow transition into the new rule and
   delete the `transition` line from the original bare `.card` block.
2. Open `src/styles/base.css`. Locate the `@media (prefers-reduced-motion:
   reduce)` block at lines 261–267. Add the `.cards .card` rule inside the
   *same* block, after the existing `.reveal` rule:
   ```css
   @media (prefers-reduced-motion: reduce) {
     .reveal {
       opacity: 1;
       transform: none;
       transition: none;
     }

     .cards .card {
       opacity: 1;
       transform: none;
       transition: none;
       transition-delay: 0ms;
     }
   }
   ```

## Boundaries

- Do NOT modify `src/layouts/Site.astro` or its `IntersectionObserver`
  script — this plan is CSS-only; the existing `.is-in` toggle already
  provides everything needed.
- Do NOT touch `src/skins/salon.css` or `src/skins/salon-noir.css` — same
  scope boundary as plan 001; this finding is specific to
  `salon-organic.css`.
- Do NOT apply this stagger pattern to any other `.reveal` section
  (`#work` gallery tiles, `#reviews` cards, `#prices` menu rows) — those
  were explicitly evaluated and rejected in the source audit (gallery has no
  interactive affordance to stagger meaningfully; review cards would dilute
  this exact treatment by repetition; price-menu rows must stay
  immediately legible per the section's own stated purpose). This plan
  covers `#packages` only.
- Do NOT change the `IntersectionObserver`'s `rootMargin` or unobserve
  behavior.
- If the current code at any cited line does not match what's shown above
  (drift since commit `2ea88fa`), STOP and report the mismatch instead of
  improvising a fix.

## Verification

- **Mechanical**: `CLIENT=meher-salon npm run build` from the `site-engine`
  root. Expect a clean build; the weight-budget check
  (`scripts/check-weight.mjs`) should still pass — this adds a small amount
  of CSS only.
- **Feel check**: run `CLIENT=meher-salon npm run dev`, load the
  `meher-salon` client, and:
  - Reload the page and scroll down to `#packages` at a normal pace.
    Confirm the three cards no longer appear as one flat block — the first
    card settles, then the second slightly after it, then the third — while
    the section's own fade-up is still clearly the dominant motion (the
    cards should read as an echo, not a separate, competing animation).
  - Confirm the featured "Complete Bridal" card (`.card--featured`) is
    still visually identifiable mid-animation and after — this plan must
    not interfere with the existing featured-card styling (border color,
    ribbon, background) in any way.
  - Scroll back up above `#packages` and back down again. Because the
    observer calls `io.unobserve` on first trigger, confirm the cards do
    **not** re-animate on a second scroll-into-view (this matches existing
    `.reveal` behavior across the rest of the page and must not regress).
  - In Chrome DevTools Animations panel, set playback to 10% and repeat the
    scroll-into-view. Confirm the stagger order is visually obvious at that
    speed (card 1, then a clear gap, then card 2, then card 3) — if the
    delays look imperceptible even at 10% speed, the `60ms`/`120ms` values
    were not applied correctly.
  - Toggle `prefers-reduced-motion: reduce` in the Rendering panel, reload,
    and scroll to `#packages` again: confirm all three cards are visible
    immediately with the section, with no fade, no offset, and no stagger
    delay.
- **Done when**: the three cards visibly stagger on first scroll-into-view
  only, the featured card's existing styling is untouched, reduced-motion
  shows all cards instantly with the section, and the build passes.
