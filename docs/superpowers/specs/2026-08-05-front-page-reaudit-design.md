# Front Page (/) Fidelity Re-Audit — Round 6

**Date:** 2026-08-05
**Status:** Approved
**Scope:** The front page `/` only, including its own chrome (TopBar, front Header, front Footer). Inner-chrome height deltas remain a separate ledgered item; no other routes change.

## Goal

Round 1's fidelity pass was screenshot-based. Rounds 3–5 established a stricter standard: live DOM probes (Playwright computed styles/geometry) with per-section ~1px height/position matching at 1440×900 and 390×844. Re-audit every front-page section with that technique and fix all drift found.

## Audit surface

All front-page sections, top to bottom: TopBar, Header (desktop nav + dropdown + mobile menu), Hero, FeaturedIn, Intro, ServiceTypes (5 cards), CtaBand ×3, CtaCompact ×2 (inside Packages and BeforeAfter), Packages (10 cards), ServiceArea (24 links), Values, BeforeAfter, Reviews widget (header + carousel + cards), Faq accordion (10 items — verify default-open state against live RUNTIME behavior, not markup; round-5 lesson), BlogPreview (3 cards), Footer. Typography, spacing, colors, backgrounds, borders, breakpoints per section.

## Known intentional deviations (skip, don't "fix")

- The injected Vavada spam paragraph before Reviews exists only on live — quantify its height delta and exclude that block from comparison.
- Reviews are a static snapshot of the live Google widget — layout/colors/typography must match; live review rotation/content drift is acceptable.
- Any live admin bars/cookie chrome in captures is ignored.

## Method & constraints

- Fresh live captures + DOM probes of https://ivycleans.com/ (few, budgeted — the host is slow); localhost-only iteration; probe tables (live vs local per section) recorded in the task report as evidence.
- STYLING ONLY: zero copy/data changes — all `/` copy is already byte-verified. If a probe suggests a content difference, it is investigated and reported, never silently "fixed" (content changes would need a user ruling).
- px-vs-rem per the ladder lesson: values measured in px stay px unless the reference CSS (post-2035.css, post-6.css, post-2338/2342 templates) says rem.
- Shared-file edits (`globals.css`, `Icons.tsx`, `CtaButton.tsx`, anything imported by other routes) require before/after byte-diffs of ALL nine routes showing only `/` changed.
- The live site may have changed since round 1's reference snapshot (WordPress edits, plugin updates). The audit compares against the CURRENT live page; if live has drifted from the committed reference HTML in ways that affect copy (not just styling), that is reported for a user ruling, not auto-applied.

## Testing & verification

1. `pnpm lint` + `pnpm build` clean; all routes static.
2. Probe tables: every section within ~1px at both widths (spam delta excluded and quantified).
3. Interactive: mobile menu, FAQ accordion (matching live runtime default), reviews carousel arrows, tel/mailto/social links.
4. Regression: nine-route byte-diff if any shared file touched; otherwise diff-scope proof that only front-page files changed.

## Out of scope

- Inner header/footer height deltas (separate ledgered item)
- Form-inertness decision (separate ledgered item)
- Any copy/data changes; any other routes
