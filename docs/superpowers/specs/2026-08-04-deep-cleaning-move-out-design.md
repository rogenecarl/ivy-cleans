# /deep-cleaning-minneapolis and /minneapolis-move-out-cleaning-services — Pixel-Perfect Clone, Round 3

**Date:** 2026-08-04
**Status:** Approved
**Scope:** Two pages: `/deep-cleaning-minneapolis` and `/minneapolis-move-out-cleaning-services`. Remaining pages (blog, contact, /faq, /book, /privacy-policy, 24 area pages) stay for later rounds.

## Goal

Extend the clone with faithful reproductions of the live site's two service landing pages, at the same pixel-perfect standard as rounds 1–2. Both pages complete the header's "Cleaning Services" dropdown — after this round every nav link except Blog/Contact/FAQ resolves.

## Key facts from the live site

- Both pages use the SAME inner header/footer templates already cloned in round 2 (`post-2282`/`post-186`) — they join the existing `(inner)` route group with zero new chrome.
- Page CSS: `post-245.css` (deep-cleaning), `post-241.css` (move-out). Metadata (verbatim):
  - Deep: title "Deep Clean Minneapolis"; description begins "For a deep clean that revitalizes your Minneapolis home, trust Ivy Cleans…" (full string from the live meta tag).
  - Move-out: title "Minneapolis Move Out Cleaning Services - Ivy Cleans"; description begins "Looking for a reliable move-out cleaning service in Minneapolis? Look no further…" (full string from the live meta tag).
- Section inventories (H1/H2 level):
  - **Deep-cleaning:** hero "Deep Cleaning Minneapolis" → "What is Deep House Cleaning?" → "Benefits of Deep Cleaning Minneapolis" → "Deep Cleaning Services Minneapolis" → "Why Choose Ivy Cleans for Deep Cleaning Minneapolis?". Assets: deep-bg4.jpg (background), deep-icon1..4.png, deep-img1..2.jpg.
  - **Move-out:** hero "Minneapolis Move Out Cleaning Services" → "Move out cleaning Minneapolis" → "What services are included in a move-out cleaning?" → "Move out cleaning service in Minneapolis" → "How much does a move-out cleaning cost?". Assets: out-icon1..3.png, out-img1..3.jpg, plus reuse of service-icon1.png and service-icon3.png (already downloaded).
- Each page's HTML contains 3 "youtube" references with zero iframes — during plan preparation, determine whether these are footer social links only or an Elementor lazy video widget (as /home had). If a video widget exists, it goes into the plan as an embed component reconstructed from `data-settings` (round-2 precedent); if they're just social links, nothing extra.
- H3-level content, copy, and any accordion/toggle widgets are extracted during plan preparation into content dumps (same format as prior rounds).

## Architecture

- **Routes:** `src/app/(inner)/deep-cleaning-minneapolis/page.tsx` and `src/app/(inner)/minneapolis-move-out-cleaning-services/page.tsx`, static, each exporting verbatim `metadata` (title AND description — a round-2 lesson, in scope from the start).
- **Components:** per-page folders `src/components/deep-cleaning/` and `src/components/move-out/`, one component per section, server components unless the live page demonstrates interactivity.
- **Data:** `src/data/deep-cleaning.ts` and `src/data/move-out.ts`, verbatim from the content dumps (typos preserved). Reuse existing exports where byte-identical (verify first — round-2 discipline).
- **Reference files:** `deep-cleaning.html`, `move-out.html`, `post-245.css`, `post-241.css`, and both content dumps committed under `docs/superpowers/reference/ivycleans-live/`. New images appended to `scripts/download-assets.sh`.

## Styling conventions (binding)

AGENTS.md conventions apply unchanged: font-size ladder authoritative; explicit arbitrary rem values traced to the page's CSS; Poppins; U+2019 apostrophes; copy verbatim from dumps.

## Error handling

Static pages, local assets, explicit dimensions — no runtime failure modes. If a video embed exists, it is a lazy iframe with a title (round-2 pattern).

## Testing & verification

1. `pnpm lint` and `pnpm build` clean; all five routes (`/`, `/home`, `/cleaning-services`, plus the two new) prerendered static.
2. Verbatim content verified byte-exact against the dumps.
3. Fidelity pass per page: live vs. local at 1440px and 390px, section by section; interactive checks (nav dropdown links resolve, any page-specific widgets); front page and round-2 pages unchanged (curl diff on any shared-file touch).

## Out of scope

- Blog, Contact, /faq, /book, /privacy-policy, area pages
- Any redirect/SEO work beyond per-page title/description
