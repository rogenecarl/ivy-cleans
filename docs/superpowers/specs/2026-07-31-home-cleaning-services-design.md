# /home and /cleaning-services — Pixel-Perfect Clone, Round 2

**Date:** 2026-07-31
**Status:** Approved
**Scope:** Two pages: `/home` and `/cleaning-services`. Everything else (blog, contact, FAQ page, area pages, /book-now) remains for later rounds.

## Goal

Extend the Next.js clone of ivycleans.com with faithful reproductions of the live site's `/home/` and `/cleaning-services/` pages, at the same pixel-perfect standard as the merged homepage round. Both nav links currently 404; after this round they render real pages.

## Key facts from the live site

- **`/home/` is NOT a duplicate of the front page.** It is a distinct SEO landing page: title "Cleaning Service in Minneapolis, MN | Ivy Cleans", Elementor page CSS `post-8.css`. Decision: clone it as-is (its own verbatim content), no redirect.
- **`/cleaning-services/`** is a package-comparison page: title "Cleaning Services - Ivy Cleans", Elementor page CSS `post-30.css`. Core content is three per-room checklists (Living Rooms / Bedrooms / Hallways; Bathrooms; Kitchens), each item marked included/excluded across three tiers (Basic / Deep / Moving), with `*` / `**` footnote markers on some items. Almost no imagery.
- Both pages share the site header/footer templates already cloned (root layout covers them).

## Section inventory (from live HTML)

**/home:** hero (H1 "Cleaning Services Minneapolis") → "Professional Cleaning Services Minneapolis, MN" with the five service cards (Dusting, Vacuuming, Bathroom Cleaning, Window Cleaning, Upholstery Cleaning — same images as the front page) → "Cleaning Services Near Me In Minneapolis, MN" → "House Cleaning Services Minneapolis" with five icon features (Attention to Detail; Eco-Friendly Cleaning Products; Highly-Trained and Professional Staff; Customizable Cleaning Plans; Affordable Pricing — `service-icon1..5.png`) → "Our Principles And Assurance" → "Locations" → "Our Cleaning Work In Action" → "Frequently Asked Questions" (its own FAQ set) → closing CTAs ("Do you have any Questions?", "Trust Us For Your House Cleaning Needs & Give Us A Call!"). Additional imagery: `Untitled-design[-1|-2].png`, two `rn_image_picker_lib_temp_*.jpg` photos.

**/cleaning-services:** intro ("Choose a cleaning package", overline "CLEANING PLANS", "Packages" with Basic/Deep/Moving headers) → three room checklist tables (items × tiers) → footnote legend for `*` / `**`.

Exact copy, item lists, and tier inclusion marks are extracted verbatim from the reference HTML during implementation — same discipline as round 1 (typos preserved; any injected spam excluded if found).

## Architecture

- **Routes:** `src/app/home/page.tsx` and `src/app/cleaning-services/page.tsx`, static (no request-time inputs), each with its own verbatim `metadata` title/description from the live pages. Root layout supplies TopBar/Header/Footer unchanged.
- **New components** live in per-page folders: `src/components/home/` and `src/components/cleaning-services/`. One component per section, composed by the page file — mirroring the homepage structure.
- **Reuse, parameterized where content differs:**
  - `Faq` gains an optional `items?: Faq[]` prop (defaults to the existing homepage set) so /home can pass its own questions.
  - CTA components (`CtaBand`, `CtaCompact`, `CtaButton`) reused as-is where the live pages show them.
  - The five service cards on /home reuse the existing images; whether the card component itself is shared with the homepage's `ServiceTypes` or duplicated per-page is decided by what the live styling demands (fidelity wins over DRY).
- **Data:** `src/data/home.ts` and `src/data/cleaning-services.ts`, verbatim copy. The checklist matrix is typed data, e.g. `{ room: string; items: { label: string; basic: boolean; deep: boolean; moving: boolean }[] }`, with footnote markers kept inside the label strings and a legend entry rendered as on the live page.

## Reference files

Commit to `docs/superpowers/reference/ivycleans-live/`: `home.html`, `cleaning-services.html` (already downloaded), their page CSS (`post-8.css`, `post-30.css`), and generated `home-content-dump.txt` / `cleaning-services-content-dump.txt` in the same document-order format as round 1. New image assets (`service-icon1..5.png`, `Untitled-design*.png`, `rn_image_picker_*.jpg`) are added to `scripts/download-assets.sh` and `public/images/`.

## Styling conventions (binding)

- The round-1 conventions carry over: root font-size ladder in `globals.css` is authoritative; sizes use explicit arbitrary rem values traced to the page's Elementor CSS; Poppins is the site font (Raleway only where the live CSS says so); curly apostrophes render U+2019.
- **This round also documents the convention:** add a "Styling conventions" section to `AGENTS.md` covering the font-size ladder, the arbitrary-rem discipline, and the reference-file workflow, so future contributors (and future rounds) don't mix scales.

## Error handling

Static pages, local assets, explicit image dimensions — no runtime failure modes. `/home` and `/` remain separate routes; no redirects.

## Testing & verification

1. `pnpm lint` and `pnpm build` clean; both new routes prerendered static.
2. Verbatim content verified against the reference dumps (byte-exact, same as round 1).
3. Fidelity pass per page: live vs. local screenshots at 1440px and 390px, section-by-section, fix drift until matching; interactive checks (nav links to the new pages, FAQ accordion on /home).

## Out of scope

- All other pages (blog, contact, /faq, /book-now, 24 area pages)
- Redirect handling for trailing-slash or www variants
- SEO parity beyond per-page title/description
