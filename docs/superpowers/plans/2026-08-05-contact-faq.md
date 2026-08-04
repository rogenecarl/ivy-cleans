# Contact and FAQ Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pixel-perfect clones of ivycleans.com's `/contact` and `/faq` pages — completing the header nav.

**Architecture:** Both pages join the `(inner)` route group (verified: chrome templates 47/186). Contact = header block + display-only Elementor-style form + maps iframe + Location/Hours blocks. FAQ = 15-item client accordion. No new image assets (Logo only on both pages).

**Tech Stack:** Next.js 16.2.12 (App Router, static), React 19, Tailwind 4, TypeScript, pnpm.

## Global Constraints

- AGENTS.md conventions binding: font-size ladder; explicit arbitrary rem values traced to `post-34.css` (contact) / `post-36.css` (faq); px-measured values stay px unless the reference CSS says rem; Poppins; U+2019 apostrophes in JSX.
- Copy verbatim from `contact-content-dump.txt` / `faq-content-dump.txt` in `docs/superpowers/reference/ivycleans-live/` (line refs below are grep-verified against these committed files). Address variants are per-block verbatim: the contact Location block reads "5821 Cedar Lake Road Suite 208 Minneapolis, MN 55416" (dump line 55) — different from the footer's "West Unit 208"; both are correct in their own places. Hours lines (dump line 57) are three separate lines in the raw HTML — extract the line breaks from `contact.html`, not the dump's concatenation.
- Contact form is DISPLAY-ONLY: exact live fields/labels/placeholders/required attrs (inventory below, verified against contact.html); `<form>` WITHOUT method/action (live has method="post" — omit it so the static clone can't POST anywhere), no handlers, no hidden WordPress fields (post_id/form_id/referer_title/queried_id are WP plumbing, not visible UI — omit; document this in a comment). Server component.
- Maps iframe verbatim: `src="https://maps.google.com/maps?q=ivy%20cleans&t=m&z=16&output=embed&iwloc=near"`, `title="ivy cleans"`, `aria-label="ivy cleans"`, `loading="lazy"` (all from contact.html).
- FAQ: 15 Q&A pairs extracted verbatim from faq.html's `elementor-tab-title`/`elementor-tab-content` markup into `src/data/faq-page.ts` — separate from the front page's `faqs.ts`; do NOT reuse or cross-import even if some pairs look similar (byte-verify independence).
- Metadata verbatim: contact title "Contact - Ivy Cleans" + full description from its meta tag; faq title "FAQ - Ivy Cleans" + its description.
- No prior-round file changes. Shared-file edits forbidden; if one seems needed, stop and report.
- Next 16: no `priority`; no `dynamic`/`revalidate`; lint separately.
- Commit per task with given message + trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: /contact data + page

**Files:**
- Create: `src/data/contact.ts`
- Create: `src/components/contact/ContactHeader.tsx`, `ContactFormDisplay.tsx`, `ContactInfo.tsx`, `ContactMap.tsx`
- Create: `src/app/(inner)/contact/page.tsx`

**Interfaces:**
- Produces:
  ```ts
  // src/data/contact.ts
  export const contactMeta = { title: "Contact - Ivy Cleans", description: "<verbatim from contact.html meta>" };
  export const contactHeader = {
    overline: "GET IN TOUCH WITH OUR TEAM",          // dump line 30
    h2a: "Contact Us",                                // line 31
    h2b: "We would love to hear from you!",           // line 32
    intro: "Give us a call, we try to answer all enquiries within 24 hours on business days.",  // line 33
  };
  export type ContactField =
    | { kind: "text" | "email"; label: string; id: string; placeholder: string; required: boolean }
    | { kind: "select"; label: string; id: string; options: string[]; required: boolean }
    | { kind: "textarea"; label: string; id: string; placeholder: string; rows: number; required: boolean };
  export const contactFields: ContactField[]; // dump lines 38-51 exactly:
    // Name / text / id "form-field-name" / "Your Name" / not required
    // Email / email / id "form-field-email" / "Email" / REQUIRED
    // Phone Number / text / id "form-field-field_66433ea" / "(777) 777-7777" / not required
    // "Are You Looking For Help With A Cleaning Project?" / select / id "form-field-message" / options ["-","Yes","No"] / REQUIRED
    // "How Can We Help?" / textarea / id "form-field-field_45db7dd" / "Give us some more details on how we can help." / rows 4 / not required
  export const contactSubmitLabel = "Send";           // line 52
  export const contactMap = { src: "https://maps.google.com/maps?q=ivy%20cleans&t=m&z=16&output=embed&iwloc=near", title: "ivy cleans" };
  export const contactInfo = {
    locationHeading: "Location",                      // line 54
    address: "5821 Cedar Lake Road Suite 208 Minneapolis, MN 55416",   // line 55 verbatim (Suite, not West Unit)
    hoursHeading: "Hours",                            // line 56
    hours: string[],                                  // three lines from contact.html (dump line 57 concatenates them — split per the raw <p>/<br> markup: Mon-Fri / Sat / Sun with their exact times and en-dashes)
    location2Heading: "Location",                     // line 58 (the live page repeats the heading for the phone/email block)
    phone: "612-424-0391", email: "Support@ivycleans.com",  // line 59 — extract exact rendering/split from contact.html
  };
  ```
- Components: `ContactHeader` (overline/h2s/intro), `ContactFormDisplay` (fields.map → label + input/select/textarea with live ids/placeholders/required; `<form aria-label="New Form">` with no method/action; Send button type="submit" with no handler; comment documenting omitted WP hidden fields), `ContactMap` (iframe verbatim + lazy), `ContactInfo` (Location/Hours/Location blocks). Page composes per the live order: header+form section, then map, then info blocks (verify arrangement — side-by-side vs stacked — from post-34.css column widths and the raw HTML section structure).

- [ ] **Step 1: Create `src/data/contact.ts`** per the interface (extract hours line breaks + phone/email split + meta description from contact.html).
- [ ] **Step 2: Create the four components + page** (all server), styling first-pass from post-34.css (grep the section's elementor-element ids from contact.html).
- [ ] **Step 3: Verify** — `pnpm lint && pnpm exec tsc --noEmit && pnpm build` (clean, `/contact` static). With `pnpm start`: `curl -s http://localhost:3000/contact | grep -c "We would love to hear from you"` → ≥1; `grep -c "maps.google.com/maps?q=ivy"` → ≥1; `grep -c 'method="post"'` → 0; `grep -c "form-field-email"` → ≥1.
- [ ] **Step 4: Commit**

```bash
git add src/data/contact.ts src/components/contact "src/app/(inner)/contact"
git commit -m "feat: /contact page with display-only form, map, and info blocks"
```

---

### Task 2: /faq data + page

**Files:**
- Create: `src/data/faq-page.ts`
- Create: `src/components/faq-page/FaqAccordion.tsx`
- Create: `src/app/(inner)/faq/page.tsx`

**Interfaces:**
- Produces:
  ```ts
  // src/data/faq-page.ts
  export const faqPageMeta = { title: "FAQ - Ivy Cleans", description: "<verbatim from faq.html meta>" };
  export const faqPageHeader = { overline: "QUESTIONS", h2: "Frequently Asked Questions" };  // faq dump lines ~30-31
  export type FaqPageItem = { q: string; a: string };
  export const faqPageItems: FaqPageItem[];  // 15 pairs, verbatim from faq.html's elementor-tab-title/elementor-tab-content markup (script the extraction; cross-check the dump). Do not import from faqs.ts.
  ```
- `FaqAccordion` — client component ("use client" first line): one item open at a time, first open by default IF the live page does that (check faq.html's accordion markup for the active/default state — Elementor accordions mark the first item; reproduce what the live markup shows), aria-expanded on buttons, +/− or the live indicator style per post-36.css. Page composes header + accordion, metadata from faqPageMeta.

- [ ] **Step 1: Create `src/data/faq-page.ts`** — scripted extraction of the 15 pairs, byte-verified.
- [ ] **Step 2: Create `FaqAccordion.tsx` + page** (accordion client, page server).
- [ ] **Step 3: Verify** — `pnpm lint && pnpm exec tsc --noEmit && pnpm build` (clean, `/faq` static). `curl -s http://localhost:3000/faq | grep -c "Frequently Asked Questions"` → ≥1; count the 15 questions render (`grep -o 'aria-expanded' | wc -l` → 15 in SSR output).
- [ ] **Step 4: Commit**

```bash
git add src/data/faq-page.ts src/components/faq-page "src/app/(inner)/faq"
git commit -m "feat: /faq page with 15-item accordion"
```

---

### Task 3: Pixel-fidelity pass for both pages

**Files:**
- Modify: round-5 components as needed (styling only — no copy/data changes)

- [ ] **Step 1: Capture** — `pnpm build && pnpm start`; live + local for /contact and /faq at 1440×900 + 390×844 (live host slow: one capture per live page per width, `--wait-for-timeout 15000+`, commands under ~5 min; `fidelity-r5/` scratchpad dir). Live DOM probes (computed styles/geometry) encouraged where post-34/36.css is silent — budget live loads.
- [ ] **Step 2: Compare & fix** — section by section at both widths; exact values via elementor id → page CSS; iterate until no visible differences.
- [ ] **Step 3: Interactive checks** — nav Contact + FAQ links resolve (header nav now fully local); accordion opens one at a time and matches the live default-open state; form fields focusable, select shows -/Yes/No, no submission wired; prior pages unchanged (no shared files were touched — verify diff scope; if any shared file was touched in this round, byte-diff `/`).
- [ ] **Step 4: Gates** — `pnpm lint && pnpm build`; nine routes static.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: pixel-fidelity pass for contact and faq pages"
```
