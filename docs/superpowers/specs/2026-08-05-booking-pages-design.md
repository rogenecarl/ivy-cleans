# Booking Pages with "Coming Soon" Submit — Round 9

**Date:** 2026-08-05
**Status:** Approved
**Scope:** Two pages: `/book-now` (front chrome) and `/book` (inner chrome), pixel-matched to live, with form submission intercepted to a "coming soon" panel (user-directed behavioral deviation). Remaining after this round: /privacy-policy, blog tail, area pages.

## User rulings (recorded)

1. Build BOTH live booking pages — every SET AN APPOINTMENT / Book CTA site-wide lands on a real page.
2. Submit behavior: native HTML validation runs, then submit is intercepted and the form area shows a styled panel: "Online booking is coming soon! In the meantime, call us at 612-424-0391 or email Support@ivycleans.com." (tel:/mailto: links, site tokens). This deliberately deviates from the live site (whose form actually submits) and from the project's display-only form convention — sanctioned for booking pages only; blog/contact forms unchanged.

## Key facts from the live site (fetched, grep-verified)

- `/book-now`: title "Book Now - Ivy Cleans"; FRONT chrome (templates 2338/2342); page CSS `post-2336.css`; one native Elementor form, 10 inputs. No spam found.
- `/book`: title "Book - Ivy Cleans"; INNER chrome (templates 47/186); page CSS `post-189.css`; overline H3 "REQUEST OUR SERVICES" + H2 "Book Now"; one native form, 10 inputs. No spam found.
- Full form-field inventories (kinds, names, ids, labels, placeholders, required, select options) are extracted from the raw HTML during plan preparation and cited in the plan (retro rule). Meta descriptions verbatim from each page's meta tag.

## Architecture

- **Routes:** `src/app/(front)/book-now/page.tsx` and `src/app/(inner)/book/page.tsx`, static, verbatim metadata.
- **Components:** `src/components/book/` — per-page section components plus a shared `BookingForm` client component ("use client") that renders a page's field list from typed data, keeps native validation, intercepts submit, and swaps in the `ComingSoonPanel` (also in the folder; server-renderable markup, toggled client-side). If the two pages' forms differ materially, two thin wrappers over the shared renderer.
- **Data:** `src/data/book.ts` — both pages' verbatim copy, both field inventories (typed like `contactFields`), and the coming-soon message copy (ours, U+2019 apostrophes).
- **Reference files:** `book-now.html`, `book.html`, `post-2336.css`, `post-189.css`, content dumps → `docs/superpowers/reference/ivycleans-live/`. Any page images added to the download script (full-upload-path identity; basename collisions get distinct names per the round-8 lesson).

## Styling conventions (binding)

AGENTS.md unchanged: ladder-aware rem/px discipline; provenance comments; multi-width fidelity FROM DAY ONE (1920/1440/1024/768/390) per the round-6 lesson — not just 1440/390.

## Testing & verification

1. `pnpm lint` + `pnpm build` clean; 14 routes static.
2. Verbatim copy + field inventories byte-checked against the reference HTML.
3. Fidelity pass: both pages at the five widths; CTA click-throughs from every page land on the right booking page; filling the form and submitting shows the panel (and does NOT navigate/POST); leaving required fields empty triggers native validation exactly like a real form.
4. Prior routes unchanged (diff-scope proof; byte-diff if any shared file is touched).

## Out of scope

- Real booking backend, email delivery, third-party widgets
- Changing blog/contact display-only forms
- /privacy-policy, blog pages 2–5, area pages
