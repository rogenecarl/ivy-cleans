# /blog Listing + One Post — Pixel-Perfect Clone, Round 4

**Date:** 2026-08-04
**Status:** Approved
**Scope:** Two pages: the `/blog` listing (page 1 only) and ONE full post page: `/do-i-need-to-be-home-during-a-deep-cleaning-service`. Listing pages 2–5, all other posts, Contact, FAQ, /book, /privacy-policy, and area pages remain for later rounds. (User's explicit instruction: one post is enough — not all posts across the five paginated pages.)

## User rulings (recorded)

1. **Spam card EXCLUDED:** the live listing's first card is the injected "Vavada Casino" spam post (with its own live page at /vavada-casino/). It does not enter the clone in any form. Our listing shows the 8 legitimate cards; the resulting one-card height difference vs. live is expected and documented in the fidelity pass (same convention as the round-1/round-3 spam-paragraph exclusions).
2. **The one post:** "Do I Need to Be Home During a Deep Cleaning Service" — chosen because the front page's blog section already links to it, so an existing internal link starts resolving.

## Key facts from the live site

- `/blog` listing: title "Blog - Ivy Cleans", page CSS `post-32.css`, same inner header/footer templates as rounds 2–3 (joins the `(inner)` route group, zero new chrome). Page 1 shows 9 `<article>` cards (8 after spam exclusion) with thumbnail, category/author meta where present, linked title, excerpt, "Read More »", date, and comment count ("1 Comment"/"No Comments"), plus a numbered pagination bar (pages 1–5).
- The post page is fetched during plan preparation (HTML + its Elementor page CSS + content dump committed to the reference dir, standard format). Its verbatim metadata, body, author/date meta, and surrounding template elements (incl. any comment area) come from that fetch. The comment form, if present, renders visually but has no backend — a static clone.

## Architecture

- **Routes:** `src/app/(inner)/blog/page.tsx` and `src/app/(inner)/do-i-need-to-be-home-during-a-deep-cleaning-service/page.tsx`, both static with verbatim per-page `metadata` (title AND description, extracted from each live page's meta tags).
- **Components:** `src/components/blog/` — listing card grid + pagination components; post-page section components (article body, meta header, comment area) as the live template dictates. Server components throughout unless the live pages demonstrate interactivity.
- **Data:** `src/data/blog.ts` — 8 listing-card entries (title, local-slug href, thumbnail, excerpt, category/author where shown, date, comment-count string — all verbatim) and the post's article content (verbatim, structured to preserve the live heading/paragraph/list order).
- **Link conventions:** listing cards use local site-relative slugs (matching the live site's own relative structure); the built post resolves, the other seven 404 until built. Pagination links use the live hrefs (`/blog/page/2/`…`/blog/page/5/`), dead until later rounds.
- **Round-1 data touch (explicit):** `src/data/posts.ts` switches its three absolute `https://ivycleans.com/...` post URLs to the same local slugs. This is the only prior-round file modified; the front page is re-verified by byte-diff (only those three href values may change in its HTML output).

## Assets

Card thumbnails for the 8 listing entries and the post's featured/body images downloaded via `scripts/download-assets.sh` (exact upload paths from the reference HTML).

## Styling conventions (binding)

AGENTS.md conventions unchanged: font-size ladder; explicit arbitrary rem values traced to `post-32.css` / the post's page CSS; Poppins; U+2019 apostrophes; copy byte-verbatim from dumps (typos included).

## Error handling

Static pages, local assets. The comment form (if the live template has one) is display-only: no action/handler, no client component unless the live markup requires visible interactivity.

## Testing & verification

1. `pnpm lint` + `pnpm build` clean; all seven routes static.
2. Verbatim content verified byte-exact against the dumps; "vavada" absent from `src/` (rendered content) — comments explaining exclusions are permitted.
3. Fidelity pass: both new pages, live vs. local, 1440px and 390px; the listing's one-card height delta quantified; front page byte-diff shows only the three `posts.ts` href changes; rounds 2–3 pages unchanged.

## Out of scope

- Listing pages 2–5, all other post pages (including /vavada-casino/ — never to be built)
- Comment submission, search, categories/tag archive pages
- Contact, FAQ, /book, /privacy-policy, area pages
