# Animation plans

Written by `improve-animations`, sourced from a prior `find-animation-opportunities`
sweep of the `meher-salon` client (`salon-organic` skin). Both plans stamped
at commit `2ea88fa`.

| # | Title | Severity | Category | Status |
| --- | --- | --- | --- | --- |
| [001](001-link-press-feedback.md) | Add press feedback to three button-styled links | HIGH | Physicality & origin | DONE |
| [002](002-package-card-stagger.md) | Stagger the package cards' group entrance | LOW | Cohesion & tokens | DONE |

Both implemented and verified in the same session the plans were written.
Real-device / OS-level `prefers-reduced-motion` and physical touch-press
checks are still owed — this session verified via CSSOM inspection, cascade
analysis, and a simulated (not physical) IntersectionObserver trigger, since
`:active` cannot be forced by synthetic events and OS-level media-feature
emulation wasn't available as a tool here.

## Execution order

**001 first.** It's the higher-severity finding (a real feedback gap on the
page's highest-intent conversion actions), it's the smaller and simpler
change, and it's fully independent of 002.

**002 second.** No dependency on 001, but touches `.card`'s `transition`
property in the same file — doing 001 first means 002's diff is applied
against a clean baseline rather than a file mid-edit.

## Dependencies

None between the two plans. Both are scoped to `src/skins/salon-organic.css`
plus, for 002 only, the shared `@media (prefers-reduced-motion: reduce)`
block in `src/styles/base.css`. Neither plan touches `salon.css`,
`salon-noir.css`, or any `.astro` component markup.

## Not planned (see the source audit for reasoning)

Four candidates were swept and explicitly rejected before these two plans
were written — not omitted, considered and declined:

- Hero photo entrance animation — conflicts with the page's LCP/performance
  budget.
- Price-menu row stagger — would delay legibility of the page's core
  promise (instant price lookup).
- Review-card stagger — same trick as plan 002, applied to a second group
  would dilute rather than add.
- Sticky bottom bar hide-on-scroll — not a motion gap; the bar isn't
  currently a toggled element, and hiding it fights the page's conversion
  purpose.
