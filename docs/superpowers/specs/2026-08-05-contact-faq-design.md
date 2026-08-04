# /contact and /faq — Pixel-Perfect Clone, Round 5

**Date:** 2026-08-05
**Status:** Approved
**Scope:** Two pages: `/contact` and `/faq`. Remaining after this round: /book, /privacy-policy, blog pages 2–5 + other posts, 24 area pages, and the ledgered inner header/footer height follow-up.

## Goal

Clone the live site's Contact and FAQ pages at the established pixel-perfect standard. After this round, every header nav link resolves locally.

## Key facts from the live site (grep-verified against fetched HTML)

- Both pages use the standard inner chrome (header template 47, footer template 186) — they join the `(inner)` route group with zero chrome work. No spam injections found on either page.
- **/contact** — title "Contact - Ivy Cleans"; description begins "Give us a call, we try to answer all enquiries within 24 hours on business days."; page CSS `post-34.css`. Structure: overline H3 "GET IN TOUCH WITH OUR TEAM" + H2 "Contact Us" + H2 "We would love to hear from you!"; a contact form (1 form, 7 inputs + 1 textarea — exact field inventory extracted from the raw HTML during planning); "Location" and "Hours" info blocks (one "Location" heading appears twice — exact arrangement from the HTML); one Google Maps iframe.
- **/faq** — title "FAQ - Ivy Cleans"; description begins "Do you accept online bookings?"; page CSS `post-36.css`. Structure: overline H3 "QUESTIONS" + H2 "Frequently Asked Questions" + a 15-item Elementor accordion (content is a superset of / differs from the front page's 10-item set — extracted fresh and verbatim, stored separately).

## Architecture

- **Routes:** `src/app/(inner)/contact/page.tsx`, `src/app/(inner)/faq/page.tsx`, both static, verbatim `metadata` (title + description).
- **Contact components** (`src/components/contact/`): header block, `ContactFormDisplay` (display-only: exact live fields, labels, placeholders, required/aria attributes; `<form>` without action, no handlers, server component — blog comment-form precedent), Location/Hours blocks, `MapEmbed`-style iframe (verbatim src/attrs, `loading="lazy"`, `title`). Data: `src/data/contact.ts` (all copy + form field definitions + iframe src).
- **FAQ components** (`src/components/faq-page/`): page-scoped client accordion (one item open at a time, matching the existing `Faq` component's interaction pattern; styling from `post-36.css`). Data: `src/data/faq-page.ts` — 15 Q&As verbatim from the accordion markup (`elementor-tab-title`/`elementor-tab-content`), independent of the front page's `faqs.ts`.
- **Plan discipline (retro rule, binding):** briefs cite grep-verified reference lines; full element inventories extracted up front (form fields with all attributes, iframe src, accordion items) — no live-page claims without a reference-file citation. Values measured in px stay px unless the reference CSS says rem (font-size-ladder trap).

## Reference files

Commit before planning: `contact.html`, `faq.html`, `post-34.css`, `post-36.css`, and both content dumps to `docs/superpowers/reference/ivycleans-live/`. Any page images added to `scripts/download-assets.sh`.

## Error handling

Static pages, local assets, lazy iframe with title. The contact form is display-only; native submission neutralization follows whatever the live markup dictates (form has no action → stays without action).

## Testing & verification

1. `pnpm lint` + `pnpm build` clean; all nine routes static.
2. Copy verified byte-exact against the dumps/raw HTML (15 accordion pairs, form labels, info blocks).
3. Fidelity pass: both pages, live vs. local, 1440px and 390px, live DOM probes where captured CSS is silent; interactive checks (accordion one-at-a-time, nav links resolve); prior pages unchanged (byte-diff on any shared-file touch).

## Out of scope

- Form submission backend, email delivery, CAPTCHA
- /book, /privacy-policy, blog pages 2–5, area pages
