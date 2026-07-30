# Ivy Cleans Homepage — Pixel-Perfect Next.js Rebuild

**Date:** 2026-07-30
**Status:** Approved
**Scope:** Homepage only. Other pages (Cleaning Services, Deep Cleaning, Move Out Cleaning, Contact, FAQ, Blog, Book Now) come in later rounds.

## Goal

Rebuild the homepage of https://ivycleans.com/ (WordPress + Elementor Pro) as a pixel-perfect clone in this Next.js 16 + Tailwind 4 project. This is Ivy Cleans' own site, so all content, images, branding, and contact details are reused verbatim.

## Approach

Clean rebuild from extracted values — not a copy of Elementor's rendered HTML/CSS. Real images and text are downloaded from the live site; exact colors, fonts, and spacing come from the site's Elementor CSS (`post-2035.css` for the homepage, `post-6.css` for the global kit). Components are hand-built with Tailwind and verified against live-site screenshots.

## Design tokens

Defined in Tailwind 4 `@theme` in `src/app/globals.css`:

| Token | Value | Use |
|---|---|---|
| rust | `#BF360C` | Primary accent — headings, buttons |
| green | `#40907A` | Brand green — secondary accent |
| peach | `#FEF3F0` | Tinted section backgrounds |
| black/white | `#000000` / `#FFFFFF` | Text and base backgrounds |

Font: **Raleway** (the homepage overrides the theme's Roboto globally), self-hosted via `next/font/google`. Weights matched to the live site during the fidelity pass.

## Architecture

- Single static route `src/app/page.tsx` (App Router, SSG — no dynamic data).
- One component per homepage section in `src/components/`, composed in order by `page.tsx`:

| Component | Section on live site |
|---|---|
| `TopBar` | "Prefer to call? We're available now." + phone/email bar |
| `Header` | Logo + nav (Home, Cleaning Services, Deep Cleaning Minneapolis, Minneapolis Move Out Cleaning Services, Blog, Contact, FAQ) + mobile hamburger |
| `Hero` | H1 "Cleaning Services Minneapolis" + CTA |
| `FeaturedIn` | "FEATURED IN:" logo strip |
| `Intro` | "Your Happiness is our Priority" |
| `ServiceTypes` | "Professional Cleaning Services Minneapolis, MN" — Dusting, Vacuuming, Bathroom Cleaning, Window Cleaning, Upholstery Cleaning |
| `CtaBand` | "Ready For a Sparkling Clean House?…" + 612-424-0391 — rendered 3× on the page |
| `Packages` | 10 package cards: Standard, Deep, Move In/Out, Condo, AirBnB, Rental, Renovation & Post Construction, Eco Friendly Green, Commercial & Office, Maid Service |
| `ServiceArea` | "House Cleaning Services Near Me" + "Areas We Serve" |
| `Values` | "Our Values & Guarantee" |
| `BeforeAfter` | "Our Cleaning Work In Action" before/after gallery |
| `Reviews` | "What Our Satisfied Clients Are Saying" — Google reviews |
| `Faq` | FAQ accordion |
| `BlogPreview` | "Latest From The Ivy Cleans Blog" — 3 post cards |
| `Footer` | Contact, Quick Links, Get In Touch, socials |

## Content & data

- All section text, package definitions, review snapshots, FAQ items, and blog-card data live in typed files under `src/data/`. Components render from data; copy edits happen in one place.
- **Reviews:** static snapshot of the current Google reviews (author, avatar, rating, text, link to Google profile), styled to match the widget. Live Google Places integration is explicitly out of scope; the data shape should make swapping to live data easy later.
- **Blog cards:** static — title, image, excerpt, link to the live post URLs for now.

## Assets

Real images downloaded from ivycleans.com into `public/`, served via `next/image` with proper dimensions. Includes logo, hero imagery, featured-in logos, section photos, before/after pairs, and reviewer avatars.

## Links

- Nav and internal CTAs keep the same paths as the live site (`/cleaning-services`, `/deep-cleaning-minneapolis`, `/minneapolis-move-out-cleaning-services`, `/blog`, `/contact`, `/faq`, `/book-now`). These 404 until those pages are built in later rounds — accepted.
- "SET AN APPOINTMENT" CTAs → `/book-now`.
- Phone CTAs → `tel:612-424-0391`; email → `mailto:` link matching the live site.
- Social links point to the real external profiles (Facebook, Instagram, TikTok, Twitter/X, Pinterest, YouTube, Google Maps).

## Interactivity

Client components only where required:

- `Header` mobile hamburger menu
- `Faq` accordion (one item open at a time, matching live behavior)
- `BeforeAfter` gallery — match whatever the live widget does (slider vs. static grid), determined during implementation
- `Reviews` carousel if the live widget scrolls/paginates

Everything else is server-rendered static markup.

## Error handling

No dynamic data or forms on the homepage, so no runtime failure modes beyond broken assets. All images are local (no remote loaders), and `next/image` dimensions are set explicitly to avoid layout shift.

## Testing & verification

1. `pnpm build` passes with no type or lint errors.
2. Fidelity pass: screenshot the live site and the local build at 1440px (desktop) and 390px (mobile) widths, compare section by section, and fix drift until visually matching.
3. Interactive checks: mobile menu opens/closes, FAQ accordion expands/collapses, all `tel:`/`mailto:`/social links have correct targets.

## Out of scope

- All non-homepage pages (including `/book-now` and the blog)
- Live Google Reviews API integration
- CMS/content management — content is code for now
- SEO parity work (meta/schema markup) beyond a sensible title/description
