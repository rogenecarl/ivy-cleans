# /home and /cleaning-services Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pixel-perfect clones of ivycleans.com's `/home` and `/cleaning-services` pages to the existing Next.js rebuild.

**Architecture:** Route groups split the site into two chromes: `(front)` keeps the existing TopBar/Header/Footer around the merged homepage; `(inner)` wraps the two new pages with the live site's different inner header/footer. New per-page section components render from verbatim data files; byte-identical content (hero paragraphs, service cards, FAQs) is reused from round-1 data modules. A per-page screenshot fidelity pass closes the round.

**Tech Stack:** Next.js 16.2.12 (App Router, static prerender), React 19, Tailwind 4, TypeScript, pnpm.

## Global Constraints

- Round-1 conventions are binding: root font-size ladder in `globals.css` is authoritative; all sizes are explicit arbitrary rem values traced to the page's Elementor CSS (`post-8.css` for /home, `post-30.css` for /cleaning-services, both committed in `docs/superpowers/reference/ivycleans-live/`); Poppins is the site font; curly apostrophes render U+2019 (`&rsquo;` or literal ’ in JSX, never straight `'` — lint fails).
- All copy VERBATIM from the reference dumps (`home-content-dump.txt`, `cleaning-services-content-dump.txt`, same directory). Where copy is byte-identical to round-1 data, IMPORT the existing export instead of duplicating the string — verify byte-equality before reusing.
- **Inner pages use different chrome than the front page** (live header template post-2282/186): no phone TopBar; the inner footer has Services/Company columns, "© 2026 IvyCleans. All rights reserved.", a contact block with the CORRECT address "5821 Cedar Lake Road, West Unit 208, Minneapolis, MN 55416" (unlike the front page's "N 55416" typo — both are verbatim from their respective live templates), Links column incl. Privacy Policy, socials.
- **Inner-page CTAs differ from the front page:** booking links go to `/book` (or `/book/`) — copy hrefs exactly as they appear per dump line; phone CTAs on /home use `tel: +16124825001` (link text "Call Us Now!", phone 612-482-5001) — this is genuinely a different number than the front page's 612-424-0391 and both are correct verbatim.
- Next 16 specifics: no `priority` prop (`fetchPriority="high"` + `loading="eager"` where needed); no `dynamic`/`revalidate` exports; `pnpm build` does not lint — run `pnpm lint` separately.
- URLs must not change: route groups `(front)`/`(inner)` are invisible in URLs; `/` must render exactly as before the restructure.
- Commit after every task with the message given in the task.

---

### Task 1: New assets + AGENTS.md styling conventions

**Files:**
- Modify: `scripts/download-assets.sh`
- Modify: `AGENTS.md`

**Interfaces:**
- Produces: `public/images/service-icon1..5.png`, `Untitled-design.png`, `Untitled-design-1-2.png`, `Untitled-design-2.png`, `rn_image_picker_lib_temp_d129a169-21-1.jpg`, `rn_image_picker_lib_temp_7f5a4f2b-e3-1.jpg`; a "Styling conventions" section in AGENTS.md that later contributors follow.

- [ ] **Step 1: Append the round-2 images to `scripts/download-assets.sh`** — add these entries to the `IMAGES` array (paths verbatim):

```bash
  2023/06/service-icon1.png 2023/06/service-icon2.png 2023/06/service-icon3.png
  2023/06/service-icon4.png 2023/06/service-icon5.png
  2023/07/Untitled-design.png 2023/07/Untitled-design-1-2.png 2023/07/Untitled-design-2.png
  2023/07/rn_image_picker_lib_temp_d129a169-21-1.jpg
  2023/07/rn_image_picker_lib_temp_7f5a4f2b-e3-1.jpg
```

- [ ] **Step 2: Run it**

Run: `./scripts/download-assets.sh && ls public/images | wc -l`
Expected: existing files skipped ("ok" for all), 10 new files → 52 total in `public/images`. If any 404s, find the exact URL in `docs/superpowers/reference/ivycleans-live/home.html` and correct it.

- [ ] **Step 3: Add a "Styling conventions" section to `AGENTS.md`** (append after the existing content):

```markdown
## Styling conventions (ivycleans clone)

- `src/app/globals.css` defines a viewport-stepped `html { font-size }` ladder copied from the live site's Elementor kit. Tailwind's rem-based utilities scale with it — DO NOT use default utilities like `text-sm`/`p-4` for sizes that must match the live site. Use explicit arbitrary values (`text-[1.8rem]`, `py-[6rem]`) traced to the reference CSS.
- Source of truth for every size/color: `docs/superpowers/reference/ivycleans-live/post-<id>.css` (front page 2035, /home 8, /cleaning-services 30, kit 6). Find a section's `elementor-element-XXXXXXX` id in the matching reference HTML, then grep that id in the CSS.
- Site font is Poppins (via `next/font`); the kit's Raleway appears only where the reference CSS says so.
- Apostrophes in JSX copy must render U+2019: use `&rsquo;` or a literal ’ (straight `'` fails lint and mismatches the live copy).
- All user-visible copy lives in `src/data/*.ts`, byte-verbatim from `docs/superpowers/reference/ivycleans-live/*content-dump*.txt` (typos included). Never paraphrase.
```

- [ ] **Step 4: Verify + commit**

Run: `pnpm lint && git add -A scripts/download-assets.sh AGENTS.md public/images && git commit -m "feat: round-2 assets and styling conventions doc"`

---

### Task 2: Route groups — split front chrome from inner chrome

**Files:**
- Create: `src/app/(front)/layout.tsx`
- Move: `src/app/page.tsx` → `src/app/(front)/page.tsx` (`git mv`)
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: existing `TopBar`, `Header`, `Footer` components.
- Produces: root layout WITHOUT chrome (html/body/fonts/globals only — check the current file: it may also carry classes/wrappers from the fidelity pass that must stay); `(front)/layout.tsx` rendering `<TopBar /><Header />{children}<Footer />`; `/` renders IDENTICALLY to before. Task 3 adds a sibling `(inner)` group.

- [ ] **Step 1: Create `src/app/(front)/layout.tsx`**

```tsx
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function FrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopBar />
      <Header />
      {children}
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Move the page and slim the root layout**

Run: `git mv src/app/page.tsx "src/app/(front)/page.tsx"`
Then edit `src/app/layout.tsx`: remove the `TopBar`/`Header`/`Footer` imports and JSX, leaving html/body (with their existing classes), font setup, metadata, and `{children}` untouched. Do not touch anything else the fidelity pass added there.

- [ ] **Step 3: Verify `/` is unchanged**

Run: `pnpm build` then `pnpm start &` and:
`curl -s http://localhost:3000 | grep -c "SET AN APPOINTMENT"` → same count as before the change (compare against a pre-change curl if unsure; the header CTA + hero + bands should make this ≥ 4), and `curl -s http://localhost:3000 | grep -c "Frequently Asked Questions"` → 1. Build output lists `/` as static.

- [ ] **Step 4: Commit**

```bash
git add -A src/app
git commit -m "refactor: front-page chrome moves into (front) route group"
```

---

### Task 3: Inner chrome — InnerHeader, InnerFooter, (inner) layout

**Files:**
- Create: `src/components/inner/InnerHeader.tsx`, `src/components/inner/InnerFooter.tsx`
- Create: `src/app/(inner)/layout.tsx`
- Modify: `src/data/site.ts`

**Interfaces:**
- Consumes: `site` from `@/data/site`; social icon SVGs in `public/icons/`.
- Produces: `innerSite` export in `src/data/site.ts`:
  ```ts
  export const innerSite = {
    phone: "612-482-5001",
    phoneHref: "tel: +16124825001", // verbatim from live href, including the space
    email: "support@ivycleans.com",
    address: "5821 Cedar Lake Road, West Unit 208, Minneapolis, MN 55416",
    bookUrl: "/book",
    copyright: "© 2026 IvyCleans. All rights reserved.",
    servicesLinks: [
      { label: "Book Now", href: "/book" },
      { label: "Cleaning Services", href: "/cleaning-services" },
    ],
    companyLinks: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Contact Us", href: "/contact" },
      { label: "FAQ", href: "/faq" },
    ],
    footerLinks: [
      { label: "Home", href: "/home" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/faq" },
      { label: "Privacy Policy", href: "/privacy-policy" },
    ],
  } as const;
  ```
  `<InnerHeader />` (client — mobile menu) and `<InnerFooter />` (server) with no props; `(inner)/layout.tsx` wrapping children with them. Task 4/6 pages render inside this group.

- [ ] **Step 1: Add `innerSite` to `src/data/site.ts`** exactly as above (verify each href/label against `cleaning-services-content-dump.txt` lines 81–137 before committing; `site.socials` is reused for the social row).

- [ ] **Step 2: Create `src/components/inner/InnerHeader.tsx`** — same nav items as the existing `Header` (reuse `site.nav` with the same Cleaning-Services dropdown split), but styled per the inner template: logo left (`/images/Logo.png`), nav right, no TopBar above. Client component with the same hamburger pattern as `Header.tsx` (copy its state logic; swap classes to match `post-2282`/header styling — exact values pulled during the fidelity task; start from the existing Header's classes). Mark the file with `"use client"` first line.

- [ ] **Step 3: Create `src/components/inner/InnerFooter.tsx`** (server) rendering, in order (source: cleaning-services-content-dump lines 81–138):
  1. Top block: logo; "Services" column from `innerSite.servicesLinks`; "Company" column from `innerSite.companyLinks`; copyright line `innerSite.copyright`.
  2. Second block: logo; contact rows with phone/envelope/map-pin icons (reuse `PhoneIcon`/`EnvelopeIcon`/`MapMarkerIcon` from `@/components/Icons`) showing `innerSite.phone` (tel link), `innerSite.email` (mailto), `innerSite.address`; "Links" column from `innerSite.footerLinks`; "Get In Touch" social row reusing `site.socials` + `/icons/*.svg` (same img+invert pattern as the front `Footer.tsx` — copy that markup pattern).
  3. Bottom line: "Ivy Cleans".
  Dark background per the live page; exact colors/spacing from `post-186`/`post-30` CSS during fidelity.

- [ ] **Step 4: Create `src/app/(inner)/layout.tsx`**

```tsx
import InnerHeader from "@/components/inner/InnerHeader";
import InnerFooter from "@/components/inner/InnerFooter";

export default function InnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <InnerHeader />
      {children}
      <InnerFooter />
    </>
  );
}
```

- [ ] **Step 5: Verify**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: clean. (No page uses the group yet — the build won't render it until Task 4.)

- [ ] **Step 6: Commit**

```bash
git add src/data/site.ts src/components/inner src/app/\(inner\)
git commit -m "feat: inner-page chrome (header, footer, route group layout)"
```

---

### Task 4: /home data + page

**Files:**
- Create: `src/data/home.ts`
- Create: `src/components/home/HomeHero.tsx`, `HomeServices.tsx`, `NearMe.tsx`, `Features.tsx`, `HouseCleaning.tsx`, `Principles.tsx`, `Locations.tsx`, `WorkCarousel.tsx`, `HomeCta.tsx`
- Create: `src/app/(inner)/home/page.tsx`

All copy verbatim from `docs/superpowers/reference/ivycleans-live/home-content-dump.txt` (line refs below). REUSE round-1 exports where byte-identical — verify with a diff before reusing; if not identical, define the string in `home.ts` instead.

**Interfaces:**
- Consumes: `heroParagraphs`, `serviceIntro`, `services` from `@/data/services` (byte-identical on /home per dump lines 33–37, 41–45, 46–60); `faqs` from `@/data/faqs` (identical Q&A set, lines 130–149); `Faq` component (Task 5 parameterizes it); `innerSite`; `areas` from `@/data/areas` (same 24 locations, lines 92–117).
- Produces: `src/data/home.ts` exporting:
  ```ts
  export const homeMeta = { title: "Cleaning Service in Minneapolis, MN | Ivy Cleans" };
  export const nearMe: string[];            // lines 63-64 (2 paragraphs)
  export type Feature = { title: string; text: string; icon: string; width: number; height: number };
  export const features: Feature[];         // lines 65-79: five entries, icons /images/service-icon1..5.png with dump dimensions (86×86, 87×87, 87×87, 87×87, 85×87)
  export const featuresOutro: string;       // line 80
  export const houseCleaning: string[];     // lines 82-84 (3 paragraphs) — line 87's paragraph with the two service links is rendered in-component with <Link> elements
  export const principles: string[];        // lines 89-90 (2 paragraphs)
  export const zipParagraph: string;        // line 118
  export const landmarksParagraph: string;  // line 119
  export const workImages: string[];        // lines 121-125: the five /images/... carousel files
  ```
  Page at `/home`, static, exporting `metadata` from `homeMeta`.

- [ ] **Step 1: Create `src/data/home.ts`** per the interface above — every string complete and verbatim from the cited dump lines.

- [ ] **Step 2: Create the section components** (all server except `WorkCarousel`):
  - `HomeHero.tsx` — H1 "Cleaning Services Minneapolis" + the five `heroParagraphs` + CTA row: link "Book A Cleaning 👉" → `/book` styled as the rust button (reuse the CtaButton classes but with this label/href — write it inline, do not modify CtaButton), and "Call Us Now!" phone link → `innerSite.phoneHref` (dump lines 32–40).
  - `HomeServices.tsx` — H2 "Professional Cleaning Services Minneapolis, MN", the five `serviceIntro` paragraphs, then the five `services` cards (same image/title/text card layout as the front page's `ServiceTypes` — copy its card markup; shared styling drift is resolved in the fidelity task).
  - `NearMe.tsx` — "Call Us Now!" link + H2 "Cleaning Services Near Me In Minneapolis, MN" + `nearMe` paragraphs (lines 61–64).
  - `Features.tsx` — five `features` icon cards + `featuresOutro` (lines 65–80).
  - `HouseCleaning.tsx` — H2 "House Cleaning Services Minneapolis" + `houseCleaning` paragraphs + the line-87 sentence rendered with `<Link href="/deep-cleaning-minneapolis">Deep Cleaning in Minneapolis</Link>` and `<Link href="/minneapolis-move-out-cleaning-services">Move-out cleaning Minneapolis</Link>` inside the verbatim sentence "In addition to our main services, We also offer … and … , if you’re interested."
  - `Principles.tsx` — H2 "Our Principles And Assurance" + `principles` (lines 88–90).
  - `Locations.tsx` — H2 "Locations": two paragraphs of comma-separated area links (lines 92–117; reuse `areas` for hrefs — first 12 areas then next 12, names joined with ", " and trailing comma exactly as the dump shows) + `zipParagraph` + `landmarksParagraph`.
  - `WorkCarousel.tsx` — client component: H2 "Our Cleaning Work In Action", chevron prev/next over `workImages` (one image shown at a time, wrap-around, same useState pattern as `Reviews.tsx`).
  - `HomeCta.tsx` — H3 "Do you have any Questions?" heading block and H3 "Trust Us For Your House Cleaning Needs &amp; Give Us A Call!" + "Call Us Now!" phone link (lines 129, 150–151) — placed per the live layout around the FAQ.

- [ ] **Step 3: Create `src/app/(inner)/home/page.tsx`** composing, in dump order: `HomeHero, HomeServices, NearMe, Features, HouseCleaning, Principles, Locations, WorkCarousel, [FAQ section — placeholder comment until Task 5 wires it], HomeCta` and exporting:

```tsx
import type { Metadata } from "next";
import { homeMeta } from "@/data/home";

export const metadata: Metadata = { title: homeMeta.title };
```

- [ ] **Step 4: Verify**

Run: `pnpm lint && pnpm exec tsc --noEmit && pnpm build`
Expected: clean; build lists `/home` as static. Then `curl -s http://localhost:3000/home | grep -c "Our Principles And Assurance"` → ≥1 (with `pnpm start` running).

- [ ] **Step 5: Commit**

```bash
git add src/data/home.ts src/components/home "src/app/(inner)/home"
git commit -m "feat: /home page sections and data"
```

---

### Task 5: Parameterize Faq and wire it into /home

**Files:**
- Modify: `src/components/Faq.tsx`
- Modify: `src/app/(inner)/home/page.tsx`

**Interfaces:**
- Consumes: existing `Faq` client component and `faqs` data.
- Produces: `Faq({ items = faqs, subtitle = true }: { items?: FaqItem[]; subtitle?: boolean })` where `FaqItem` is the data type exported as `Faq` from `@/data/faqs` (import it aliased: `import { faqs, type Faq as FaqItem } from "@/data/faqs"` — the component function is also named `Faq`, so the alias avoids the clash) — defaults preserve the front page exactly (verify against the current file's actual props/markup before editing; keep its styling untouched). `/home` renders `<Faq />` with the default items (the sets are identical) but the /home section header differs — the "If you need further assistance…" subtitle appears only on the front page, hence `subtitle` (check the live /home FAQ section in `home.html` for whether the subtitle exists there; if it does, drop the `subtitle` prop entirely and pass nothing).

- [ ] **Step 1: Edit `src/components/Faq.tsx`** — add the optional props with defaults that render the component byte-identically to its current output when no props are passed.

- [ ] **Step 2: Replace the FAQ placeholder in `/home`'s page** with the `Faq` usage determined in Step 1, positioned between `WorkCarousel` and `HomeCta` per the dump order.

- [ ] **Step 3: Verify** — `pnpm lint && pnpm build`; `curl -s http://localhost:3000 | grep -c "Frequently Asked Questions"` → 1 AND `curl -s http://localhost:3000/home | grep -c "Frequently Asked Questions"` → 1.

- [ ] **Step 4: Commit**

```bash
git add src/components/Faq.tsx "src/app/(inner)/home/page.tsx"
git commit -m "feat: parameterized FAQ shared by front page and /home"
```

---

### Task 6: /cleaning-services data + page

**Files:**
- Create: `src/data/cleaning-services.ts`
- Create: `src/components/cleaning-services/PlansHeader.tsx`, `PackagesBar.tsx`, `RoomChecklist.tsx`
- Create: `src/app/(inner)/cleaning-services/page.tsx`

**Interfaces:**
- Consumes: `innerSite.bookUrl`.
- Produces: `src/data/cleaning-services.ts` exporting:
  ```ts
  export const csMeta = { title: "Cleaning Services - Ivy Cleans" };
  export const tiers = ["Basic", "Deep", "Moving"] as const;
  export type ChecklistItem = { label: string; basic: boolean; deep: boolean; moving: boolean };
  export type Room = { name: string; items: ChecklistItem[] };
  export const rooms: Room[]; // 3 rooms, labels verbatim incl. "*"/"**" markers (dump lines 42-80)
  ```
  Page at `/cleaning-services`, static.

- [ ] **Step 1: Extract the per-cell tier marks.** The dump lists item labels but not which tiers include each item — that lives in the HTML as inline SVGs (check-circle = included; the "excluded" marker is whatever SVG/element appears in the same cell position — inspect `cleaning-services.html` around the first item to identify it). Write a scratch script (scratchpad, not committed) that walks each room table in `docs/superpowers/reference/ivycleans-live/cleaning-services.html` and prints `room | item | basic | deep | moving`. Sanity-expect: Living Rooms 9 items, Bathrooms 9, Kitchens 9 (dump lines 46–54, 59–67, 72–80); Basic excludes deep-only items like "Clean Baseboards" — trust the extraction, not intuition.

- [ ] **Step 2: Create `src/data/cleaning-services.ts`** from the extraction — labels verbatim (incl. `**`/`*` suffixes and casing like "Vacuum / Clean Inside furniture").

- [ ] **Step 3: Create the components:**
  - `PlansHeader.tsx` (server) — overline H3 "CLEANING PLANS", H2 "Choose a cleaning package" (dump lines 32–33).
  - `PackagesBar.tsx` (server) — H2 "Packages" row: three tier columns "Basic"/"Deep"/"Moving" each with a "Book Now" link → `innerSite.bookUrl`, and the "Most Popular" badge (H4, dump line 34) on the Deep column as the live page shows (verify badge placement in `cleaning-services.html`).
  - `RoomChecklist.tsx` (server) — props `{ room: Room }`: room-name header row + tier header cells, then one row per item: label + three cells rendering an included/excluded mark. Recreate the marks as inline SVGs copied from the live HTML (the check-circle path is in the reference file; use `aria-hidden` on the SVGs and set each cell's accessible text via `aria-label={included ? "Included" : "Not included"}`).
  - Page composes `PlansHeader, PackagesBar,` then `rooms.map(r => <RoomChecklist key={r.name} room={r} />)`, with `export const metadata: Metadata = { title: csMeta.title }`.

- [ ] **Step 4: Verify**

Run: `pnpm lint && pnpm exec tsc --noEmit && pnpm build` (clean; `/cleaning-services` static), then with `pnpm start`: `curl -s http://localhost:3000/cleaning-services | grep -c "Choose a cleaning package"` → ≥1 and `grep -c "Dust Ceiling Fans"` → ≥1.

- [ ] **Step 5: Commit**

```bash
git add src/data/cleaning-services.ts src/components/cleaning-services "src/app/(inner)/cleaning-services"
git commit -m "feat: /cleaning-services page with package checklist tables"
```

---

### Task 7: Pixel-fidelity pass for both pages

**Files:**
- Modify: any round-2 component/`globals.css` as needed (styling only — no copy/data changes)

**Interfaces:**
- Consumes: complete pages from Tasks 1–6; reference CSS `post-8.css`, `post-30.css`, inner-template styles inside `home.html`/`cleaning-services.html`.
- Produces: both pages visually matching the live site at 1440px and 390px.

- [ ] **Step 1: Capture screenshots** — `pnpm build && pnpm start`, then for EACH of `https://ivycleans.com/home/`, `https://ivycleans.com/cleaning-services/`, `http://localhost:3000/home`, `http://localhost:3000/cleaning-services` at 1440×900 and 390×844 full-page via `pnpm dlx playwright screenshot` (live host is slow: generous `--wait-for-timeout`, capture live pages once and reuse; keep every command under ~5 min).

- [ ] **Step 2: Compare section by section** at both widths, top to bottom, reading the images. For each visible difference, pull the exact value: find the section's `elementor-element-XXXXXXX` id in the page's reference HTML, grep it in the page's `post-*.css`, apply. Iterate local-only re-captures until no visible differences remain. The front page (`/`) must not change — do not edit shared components' front-page rendering paths without re-checking `/`.

- [ ] **Step 3: Interactive checks** — inner header mobile menu opens/closes; /home FAQ opens one at a time; /home work carousel chevrons cycle with wrap-around; `curl -s http://localhost:3000/home | grep -o 'href="tel:[^"]*"' | sort -u` shows the inner phone href; nav from `/` to `/home` and `/cleaning-services` works; front page unchanged (`curl -s http://localhost:3000 | grep -c "SET AN APPOINTMENT"` same as Task 2's count).

- [ ] **Step 4: Final gates** — `pnpm lint && pnpm build` clean; `/`, `/home`, `/cleaning-services` all static.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: pixel-fidelity pass for /home and /cleaning-services"
```
