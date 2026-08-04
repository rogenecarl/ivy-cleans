# Deep-Cleaning and Move-Out Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pixel-perfect clones of ivycleans.com's `/deep-cleaning-minneapolis` and `/minneapolis-move-out-cleaning-services` pages.

**Architecture:** Both pages join the existing `(inner)` route group (round-2 chrome, zero new chrome work). One data module + one component folder per page, composed by a static page file with verbatim metadata. A joint fidelity pass closes the round.

**Tech Stack:** Next.js 16.2.12 (App Router, static), React 19, Tailwind 4, TypeScript, pnpm.

## Global Constraints

- AGENTS.md styling conventions binding: font-size ladder authoritative; explicit arbitrary rem values traced to `post-245.css` (deep) / `post-241.css` (move-out) in `docs/superpowers/reference/ivycleans-live/`; Poppins; curly apostrophes render U+2019 (`&rsquo;`/literal ’, never straight `'`).
- ALL copy verbatim from `deep-cleaning-content-dump.txt` / `move-out-content-dump.txt` (same directory), typos and casing included ("IVYCleans", "Ivycleans", "we understand" lowercase starts, "our expertise ensures" etc.). Reuse existing data exports only if byte-identical (verify first).
- **EXCLUDE the spam injection:** deep-cleaning dump lines 42–43 (a paragraph recommending "Vavada Casino" linking to beadspinnerstore.com, with Cyrillic text) is injected malware content on the live site — it must NOT appear in the clone. Everything else in the Benefits section stays.
- Inner-page CTA: link text exactly "Set an appointment 👈" (lowercase "an appointment" — different from the front page's all-caps button) → `/book`, styled per the live button (rust bg family; exact values from the page CSS).
- Next 16: no `priority` prop (`fetchPriority="high"` + `loading="eager"` for above-fold); no `dynamic`/`revalidate`; `pnpm lint` run separately from build.
- Metadata verbatim from each page's live meta tags: deep title "Deep Clean Minneapolis"; move-out title "Minneapolis Move Out Cleaning Services - Ivy Cleans"; descriptions copied byte-exact from `<meta name="description">` in the respective reference HTML (in scope NOW, not a fidelity-pass catch).
- Front page and round-1/2 pages must not change. Shared-file edits require a before/after `/` curl check.
- Commit after every task with the given message + trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Round-3 assets + shared check icon

**Files:**
- Modify: `scripts/download-assets.sh`
- Modify: `src/components/Icons.tsx`

**Interfaces:**
- Produces: 13 images in `public/images/`: `deep-bg4.jpg`, `deep-icon1.png`..`deep-icon4.png`, `deep-img1.jpg`, `deep-img2.jpg`, `out-icon1.png`..`out-icon3.png`, `out-img1.jpg`..`out-img3.jpg`. `CheckItemIcon` export in `Icons.tsx` (FontAwesome-style solid check, `aria-hidden`, `fill="currentColor"`, viewBox 0 0 512 512, the standard fa-check path) used by both pages' checklists.

- [ ] **Step 1: Append to the IMAGES array in `scripts/download-assets.sh`** (find each file's exact upload path by grepping its filename in `docs/superpowers/reference/ivycleans-live/deep-cleaning.html` / `move-out.html` — they live under 2023/06 or 2023/07):

```bash
  # round 3: deep-cleaning + move-out pages (verify each path against the reference HTML)
  <year>/<month>/deep-bg4.jpg <year>/<month>/deep-icon1.png <year>/<month>/deep-icon2.png
  <year>/<month>/deep-icon3.png <year>/<month>/deep-icon4.png <year>/<month>/deep-img1.jpg
  <year>/<month>/deep-img2.jpg <year>/<month>/out-icon1.png <year>/<month>/out-icon2.png
  <year>/<month>/out-icon3.png <year>/<month>/out-img1.jpg <year>/<month>/out-img2.jpg
  <year>/<month>/out-img3.jpg
```

(The `<year>/<month>` placeholders above are the ONLY part you resolve from the reference HTML — the filenames are exact.)

- [ ] **Step 2: Run `./scripts/download-assets.sh`** — expect 13 new "ok" lines; `ls public/images | wc -l` → 69 (was 56 after round 2: 52 + 4 fidelity bg images).

- [ ] **Step 3: Add `CheckItemIcon` to `src/components/Icons.tsx`** following the file's existing icon component pattern (aria-hidden svg, currentColor, size via props or className), using the standard Font Awesome 5 solid `check` path (`M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.206-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.4c-9.998 9.997-26.207 9.997-36.204 0z`).

- [ ] **Step 4: Verify + commit**

Run: `pnpm lint && pnpm exec tsc --noEmit`
```bash
git add -A scripts/download-assets.sh src/components/Icons.tsx public/images
git commit -m "feat: round-3 assets and shared checklist icon"
```

---

### Task 2: /deep-cleaning-minneapolis data + page

**Files:**
- Create: `src/data/deep-cleaning.ts`
- Create: `src/components/deep-cleaning/DeepHero.tsx`, `WhatIs.tsx`, `Benefits.tsx`, `DeepServices.tsx`, `WhyChoose.tsx`
- Create: `src/app/(inner)/deep-cleaning-minneapolis/page.tsx`

Copy source: `deep-cleaning-content-dump.txt` lines 32–95 (line refs below). REMEMBER: lines 42–43 (Vavada spam) are EXCLUDED.

**Interfaces:**
- Consumes: `CheckItemIcon` from `@/components/Icons` (Task 1); `innerSite` from `@/data/site` (only if needed for links).
- Produces: `src/data/deep-cleaning.ts` exporting:
  ```ts
  export const deepMeta = { title: "Deep Clean Minneapolis", description: "<verbatim from deep-cleaning.html meta>" };
  export const deepHero: { h1: string; paragraphs: string[] };        // lines 32-34
  export const whatIs: { h2: string; text: string; image: string };   // lines 36-38, image /images/deep-img1.jpg (770×555)
  export const benefits: { h2: string; intro: string[]; listIntro: string; items: string[]; outro: string };
      // h2 line 39; intro lines 40-41 (2 paragraphs; NOT lines 42-43); listIntro line 44; items lines 46-54 (5); outro line 56; bg image /images/deep-bg4.jpg
  export const deepServices: { h2: string; image: string; listIntro: string; items: string[]; note: string; contact: string };
      // h2 line 58; image /images/deep-img2.jpg (586×613); listIntro line 60; items lines 62-73 (6 — the bathroom item, line 66, contains an inline link: see component note); note (h3) line 74; contact line 75
  export type DeepQuality = { title: string; text: string; icon: string; width: number; height: number };
  export const whyChoose: { h2: string; paragraphs: string[]; listIntro: string; qualities: DeepQuality[]; closing: string; contact: string };
      // h2 line 77; paragraphs lines 78-79; listIntro line 80; qualities lines 81-92 (4: Attention to Detail 86×86 icon1, Safety 82×82 icon2, On-time 88×88 icon3, Results 88×88 icon4); closing (h3) line 93; contact line 94
  ```
  Page at `/deep-cleaning-minneapolis` exporting `metadata` from `deepMeta`.

- [ ] **Step 1: Create `src/data/deep-cleaning.ts`** per the interface — every string complete and verbatim from the cited lines. Extract the meta description byte-exact from `deep-cleaning.html`.

- [ ] **Step 2: Create the five section components** (all server): checklists render `items.map` with `CheckItemIcon` + text; the CTA "Set an appointment 👈" → `/book` appears after the hero (line 35), after the Benefits outro (line 57), after DeepServices contact (line 76), and after WhyChoose contact (line 95) — render it inside the owning section per the live layout (styled button, exact values from post-245.css during fidelity). **Special case (DeepServices.tsx):** the live bathroom checklist item (line 66) wraps part of its text in a link to `https://ivycleans.com/how-to-clean-a-bathroom/` (line 67 in the dump shows the anchor; inspect deep-cleaning.html around "Scrubbing and disinfecting" for the exact anchored substring) — reproduce the inline `<a>` with the exact href and anchored text.

- [ ] **Step 3: Create `src/app/(inner)/deep-cleaning-minneapolis/page.tsx`** composing DeepHero, WhatIs, Benefits, DeepServices, WhyChoose with:

```tsx
import type { Metadata } from "next";
import { deepMeta } from "@/data/deep-cleaning";

export const metadata: Metadata = { title: deepMeta.title, description: deepMeta.description };
```

- [ ] **Step 4: Verify** — `pnpm lint && pnpm exec tsc --noEmit && pnpm build` (clean; route static). With `pnpm start`: `curl -s http://localhost:3000/deep-cleaning-minneapolis | grep -c "What is Deep House Cleaning"` → ≥1; `grep -ci vavada` and `grep -ci beadspinner` → 0 both.

- [ ] **Step 5: Commit**

```bash
git add src/data/deep-cleaning.ts src/components/deep-cleaning "src/app/(inner)/deep-cleaning-minneapolis"
git commit -m "feat: /deep-cleaning-minneapolis page"
```

---

### Task 3: /minneapolis-move-out-cleaning-services data + page

**Files:**
- Create: `src/data/move-out.ts`
- Create: `src/components/move-out/MoveHero.tsx`, `WhyMoveOut.tsx`, `IncludedServices.tsx`, `WhyIvy.tsx`, `Cost.tsx`
- Create: `src/app/(inner)/minneapolis-move-out-cleaning-services/page.tsx`

Copy source: `move-out-content-dump.txt` lines 32–93.

**Interfaces:**
- Consumes: `CheckItemIcon` from `@/components/Icons`.
- Produces: `src/data/move-out.ts` exporting:
  ```ts
  export const moveOutMeta = { title: "Minneapolis Move Out Cleaning Services - Ivy Cleans", description: "<verbatim from move-out.html meta>" };
  export const moveHero: { h1: string; paragraphs: string[] };   // lines 32-38 (5 paragraphs; the CTA sits after paragraph 1 per lines 34-35 — the "Set an appointment 👈" text in line 35 is the button, the rest of line 35 is the next paragraph)
  export const whyMoveOut: { h2: string; image: string; paragraphs: string[] };   // h2 line 39; image /images/out-img1.jpg (703×486); paragraphs lines 41-44 (4)
  export const included: { h2: string; image: string; items: string[] };          // h2 line 47; image /images/out-img2.jpg (703×563); items lines 49-69 (11)
  export type MoveOutQuality = { title: string; text: string; icon: string; width: number; height: number; alt: string };
  export const whyIvy: { h2: string; intro: string; qualities: MoveOutQuality[] };
      // h2 line 70; intro line 71; qualities lines 72-86 (5): Attention to Detail (service-icon1.png 86×86, alt ""), Expertise (service-icon3.png 87×87, alt ""), Industry experience (out-icon1.png 87×87, alt ""), Effective communication (out-icon2.png 87×79, alt ""), High-quality results (out-icon3.png 88×88, alt VERBATIM from line 84: "In this image we explain what are the things you would like to ask your cleaning service provider")
  export const cost: { h2: string; image: string; paragraphs: string[] };         // h2 line 88; image /images/out-img3.jpg (692×901); paragraphs lines 89-92 (4)
  ```
  Page at `/minneapolis-move-out-cleaning-services` exporting `metadata` from `moveOutMeta`. CTAs "Set an appointment 👈" → `/book` after hero paragraph 1 (line 34) and at page end (line 93), per live positions.

- [ ] **Step 1: Create `src/data/move-out.ts`** per the interface, verbatim (incl. "IVYCleans", "client’s", lowercase sentence starts).

- [ ] **Step 2: Create the five section components** (all server), checklist via `CheckItemIcon`, images with dump dimensions.

- [ ] **Step 3: Create the page file** with the metadata export (same pattern as Task 2 Step 3, using `moveOutMeta`).

- [ ] **Step 4: Verify** — `pnpm lint && pnpm exec tsc --noEmit && pnpm build` (clean; route static). `curl -s http://localhost:3000/minneapolis-move-out-cleaning-services | grep -c "How much does a move-out cleaning cost"` → ≥1.

- [ ] **Step 5: Commit**

```bash
git add src/data/move-out.ts src/components/move-out "src/app/(inner)/minneapolis-move-out-cleaning-services"
git commit -m "feat: /minneapolis-move-out-cleaning-services page"
```

---

### Task 4: Pixel-fidelity pass for both pages

**Files:**
- Modify: round-3 components / `globals.css` as needed (styling only — no copy/data changes)

**Interfaces:**
- Consumes: complete pages from Tasks 1–3; `post-245.css`, `post-241.css`, reference HTML.
- Produces: both pages visually matching live at 1440px and 390px; all five routes verified.

- [ ] **Step 1: Capture** — `pnpm build && pnpm start` (kill stale :3000). Live + local, both pages, 1440×900 and 390×844 full-page via playwright. Live host slow: one capture per live page per width (`--wait-for-timeout 15000+`), reuse; keep commands under ~5 min. Screenshots in a `fidelity-r3/` dir in the session scratchpad.

- [ ] **Step 2: Compare and fix** — section by section at both widths, reading the images; exact values via elementor-element id → page CSS lookup. Note: the live pages include the Vavada spam paragraph on deep-cleaning — our build intentionally lacks it; skip that block when comparing (height offset expected). Iterate until no other visible differences.

- [ ] **Step 3: Interactive checks** — header dropdown navigates to both new pages; all "Set an appointment 👈" links → /book; the DeepServices inline bathroom link present exactly once; front page and round-2 pages unchanged (`curl` spot checks; byte-diff `/` if any shared file was touched).

- [ ] **Step 4: Final gates** — `pnpm lint && pnpm build`; five routes static (`/`, `/home`, `/cleaning-services`, both new).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: pixel-fidelity pass for deep-cleaning and move-out pages"
```
