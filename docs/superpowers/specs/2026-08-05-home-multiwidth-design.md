# /home Multi-Width Fidelity Re-Audit — Round 7

**Date:** 2026-08-05
**Status:** Approved
**Scope:** `/home` geometry across the width spectrum, plus the shared inner-chrome height fix (InnerHeader/InnerFooter — affects all 8 inner routes, guarded). No copy/data changes anywhere; no other route work.

## Goal

Bring `/home` to the round-6 standard: per-section ~1px match against the live page at 1920/1600/1440/1280/1024/768/390. Close the three known gaps:

1. **Missing 768–1024 tablet band** on /home's components (+2643.7px doc-height error at 1024 — measured in round 6's cross-route probes; the same fix class round 6 applied to `/`).
2. **Suspected frozen-px containers** (round-2-era components; the reference CSS declares container widths in rem on the viewport ladder — verify against post-8.css and the live probes, restore rem where the CSS says rem).
3. **Shared inner-chrome heights**: InnerHeader ~5.5px and InnerFooter ~18.5px taller than live (ledgered since round 3). Fixed HERE because this round probes inner routes anyway.

## Ground rules

- Copy/data frozen: the /home content is byte-verified (round 2) and user-confirmed; `src/data/*` must not change. Content mismatches found by probes are reported for a user ruling, never coded.
- px-vs-rem per AGENTS.md: live-CSS rem values stay rem (ride the ladder); probe-measured px stays px. Elementor desktop threshold is 1025 (round-6 proven); the project's Tailwind breakpoints already match (lg=1025/xl=1281/2xl=1441).
- **Shared-chrome guard:** InnerHeader/InnerFooter changes affect 8 routes. Required evidence: before/after full-DOM probes of ALL 8 inner routes at 1440 and 390 (only the intended chrome deltas may appear, identical across routes), plus live-vs-local chrome probes on at least /home and one other inner route confirming the fix lands ON live's values, not past them.
- `/` must be byte/geometry-identical throughout (it uses the front chrome, not inner — verify no accidental coupling).
- Live-load budget: resize-probing one loaded live page across widths (round-6 technique) — ~4-6 loads total.
- Known intentional facts: /home's FAQ renders as a static text block (user ruling from round 2's addendum — matches live); /home has no reviews widget. The /home work carousel's 3/2/1-up window model shipped in round 2 — if live probes show different visible-card counts at some widths, correct it as styling.

## Testing & verification

1. `pnpm lint` + `pnpm build` clean; all routes static.
2. /home probe tables: every section within ~1px at all seven widths.
3. Chrome fix: before/after 8-route tables + live-vs-local chrome values.
4. Interactive re-checks on /home (menu, carousel, static FAQ present).
5. User visual acceptance at their window size before merge.

## Out of scope

- /book, /privacy-policy, blog tail, area pages
- Reviews carousel card-count model on `/` (separate ledgered item)
- Any copy/data change
