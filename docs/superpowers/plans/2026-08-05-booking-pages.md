# Booking Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/book-now` (front chrome) and `/book` (inner chrome) cloned pixel-perfect, with submit intercepted to a "coming soon" panel.

**Architecture:** Both live pages carry the SAME 10-field Elementor form (identical ids/labels/options; only the size class differs: `md` on /book-now, `sm` on /book) — so one typed field list and one shared client `BookingForm` renderer serve both, with a `size` prop. Each page composes its own chrome-specific wrapper. Submit is intercepted after native validation; the form area swaps to `ComingSoonPanel`.

**Tech Stack:** Next.js 16.2.12 (App Router, static), React 19, Tailwind 4, TypeScript, pnpm.

## Global Constraints

- AGENTS.md binding: ladder-aware px-vs-rem (live-CSS rem stays rem; probe-measured px stays px); provenance comments citing `elementor-element-XXXXXXX` ids; U+2019 apostrophes in JSX; Tailwind breakpoints lg=1025/xl=1281/2xl=1441 (Elementor desktop threshold).
- Copy verbatim from `docs/superpowers/reference/ivycleans-live/` (`book-now.html`, `book.html`, and the two content dumps) — typos preserved: "What Type of Service Are Your Looking For?", "How Would Your Describe Your Home Right Now?", "Recurring Cleaning ( Standard + Additional Discounts)" (space after paren), "Very Diry" is the option VALUE while the visible label is "Very Dirty (It's a nightmare, please save me)" — labels are what render; values only matter if a future backend reads them, so store both.
- Page CSS: `post-2336.css` (/book-now), `post-189.css` (/book). Neither page has images beyond the chrome logos (already in public/images) — no new assets.
- **Submit behavior (user-ruled, deliberate deviation from live):** native HTML validation runs first (required attrs preserved); on valid submit, `preventDefault()` and replace the form area with the coming-soon panel. The page must NOT navigate or POST. Blog/contact display-only forms are NOT touched by this round.
- WP hidden plumbing inputs (post_id/form_id/referer_title/queried_id) are omitted with a comment, per the contact-form precedent.
- Multi-width fidelity from day one: 1920/1440/1024/768/390.
- No changes to `src/data/*` other than the NEW `src/data/book.ts`; no other prior-round files.
- Commit per task with the given message + trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Booking data module + shared form components

**Files:**
- Create: `src/data/book.ts`
- Create: `src/components/book/BookingForm.tsx` (client), `src/components/book/ComingSoonPanel.tsx`

**Interfaces:**
- Produces:
  ```ts
  // src/data/book.ts
  export const bookNowMeta = { title: "Book Now - Ivy Cleans" };        // live /book-now has NO meta description — omit the field
  export const bookMeta = { title: "Book - Ivy Cleans", description: "A Couple of Questions For Your FREE Quote!" };  // verbatim from book.html
  export const bookHeader = { overline: "REQUEST OUR SERVICES", h2: "Book Now" };  // /book only (book-content-dump); /book-now renders the form with no page heading
  export type BookField =
    | { kind: "select"; label: string; id: string; name: string; required: boolean; options: { value: string; label: string }[] }
    | { kind: "number" | "text" | "email" | "tel"; label: string; id: string; name: string; required: boolean; placeholder: string };
  export const bookFields: BookField[];   // the 10 fields IN LIVE ORDER, verbatim (ids/names/labels/placeholders/required all from the reference HTML forms — both pages are identical here):
    // 1 select  "What Type of Service Are Your Looking For?"  id form-field-email  name form_fields[email]  required
    //    options: Standard Cleaning|Standard Cleaning (Basic Cleaning Package); Recurring Cleaning|Recurring Cleaning ( Standard + Additional Discounts); Deep Cleaning|Deep Cleaning ( Most Popular Option); Moving Cleaning|Move-In/Move-Out Cleaning (Most Comprehensive, Total Clean)
    // 2 select  "How Would Your Describe Your Home Right Now?"  id form-field-field_22aa910  required
    //    options: Slightly Dirty|Slightly Dirty (Nothing crazy); Pretty Dirty|Pretty Dirty (It’s been awhile since we cleaned, it’s pretty dirty); Very Diry|Very Dirty (It’s a nightmare, please save me)
    // 3 number  "How Many Bedrooms?"   id form-field-field_c4cfac1  placeholder "ex. 3"  required
    // 4 number  "How Many Bathrooms?"  id form-field-field_caacb3a  placeholder "ex. 2"  required
    // 5 select  "How Soon Are You Looking To Have This Cleaned?"  id form-field-message  required
    //    options: first is a blank/space placeholder option (value " ", selected) then ASAP (It’s an emergency); Sometime this week; Sometime next week; No Rush; Not Sure (Just price shopping right now)
    // 6 text    "What's the Address of the Property?"  id form-field-field_1872bc3  placeholder from the HTML (verify: the dump shows a "Message" placeholder on one field — confirm which field carries it)
    // 7 text    "Full Name"     id form-field-name          placeholder "Full Name"          required
    // 8 email   "Email Address" id form-field-field_ca2243e placeholder "example@gmail.com"  required
    // 9 tel     "Phone Number"  id form-field-field_deeaf01 placeholder "777-777-7777"       required
    // 10 select "How Would You Prefer To Be Contacted?"  id form-field-field_1abcd81  required
    //    options: Call Me; Text Me; Email Me; It’s all the same to me
  export const bookSubmitLabel = "Claim";   // verbatim button text on BOTH pages
  export const comingSoon = {               // OUR copy (user-approved), not live's
    heading: "Online booking is coming soon!",
    body: "In the meantime, call us at 612-424-0391 or email Support@ivycleans.com.",
    phone: "612-424-0391", phoneHref: "tel:6124240391",
    email: "Support@ivycleans.com", emailHref: "mailto:Support@ivycleans.com",
  };
  ```
  `BookingForm({ size }: { size: "md" | "sm" })` — client component: renders `bookFields` (labels + inputs with live ids/names/placeholders/required), the "Claim" submit button, `<form>` WITHOUT action/method; `onSubmit` calls `preventDefault()` then sets state to show `<ComingSoonPanel />` in place of the fields. `ComingSoonPanel` — renders `comingSoon` with tel:/mailto: links, site tokens (rust/brand/herogreen per the pages' CSS).

- [ ] **Step 1: Create `src/data/book.ts`** — resolve the two open details from the reference HTML (the address field's placeholder; confirm the blank first option on field 5) and transcribe everything verbatim.
- [ ] **Step 2: Create `ComingSoonPanel.tsx`** (server-renderable markup) and `BookingForm.tsx` (`"use client"` first line; `useState` for submitted; `onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}`; keep required attrs so native validation gates submission; size prop switches the size-dependent classes).
- [ ] **Step 3: Verify** — `pnpm lint && pnpm exec tsc --noEmit` clean (components unused so far is fine).
- [ ] **Step 4: Commit**

```bash
git add src/data/book.ts src/components/book
git commit -m "feat: booking form data and shared coming-soon form components"
```

---

### Task 2: The two booking pages

**Files:**
- Create: `src/app/(front)/book-now/page.tsx`, `src/app/(inner)/book/page.tsx`
- Create (if the pages need section wrappers beyond the form): `src/components/book/BookNowSection.tsx`, `src/components/book/BookSection.tsx`

**Interfaces:**
- Consumes: `bookNowMeta`, `bookMeta`, `bookHeader`, `bookFields`, `bookSubmitLabel` from `@/data/book`; `BookingForm`.
- Produces: `/book-now` (front chrome via the `(front)` group — verify the live page indeed uses templates 2338/2342 = front chrome) and `/book` (inner chrome), both static.

- [ ] **Step 1: `/book-now`** — page renders the form section only (no page heading per book-now-content-dump), `<BookingForm size="md" />`, metadata `{ title: bookNowMeta.title }` (no description — live has none). Section styling from `post-2336.css`.
- [ ] **Step 2: `/book`** — overline H3 + H2 from `bookHeader`, then `<BookingForm size="sm" />`, metadata title + description from `bookMeta`. Section styling from `post-189.css`.
- [ ] **Step 3: Verify** — `pnpm lint && pnpm exec tsc --noEmit && pnpm build` (clean; both routes static → 14 routes). With `pnpm start`: `curl -s http://localhost:3000/book | grep -c "REQUEST OUR SERVICES"` → ≥1; `curl -s http://localhost:3000/book-now | grep -c "What Type of Service Are Your Looking For"` → ≥1; both pages: `grep -c 'method="post"'` → 0.
- [ ] **Step 4: Commit**

```bash
git add "src/app/(front)/book-now" "src/app/(inner)/book" src/components/book
git commit -m "feat: /book-now and /book pages"
```

---

### Task 3: Fidelity pass + interaction verification

**Files:**
- Modify: round-9 files as needed (styling only)

- [ ] **Step 1: Capture + probe** both pages, live vs local, at 1920/1440/1024/768/390 (live host slow: one load per live page, resize-probe; artifacts in a `fidelity-r9/` scratchpad dir). Build the per-section drift table first.
- [ ] **Step 2: Fix drift** with values from `post-2336.css`/`post-189.css` (elementor id → rule) or probe measurements, with provenance comments. Iterate until each page's sections are within ~1px at all five widths. NOTE: our form area diverges from live once submitted — compare the UNSUBMITTED state only.
- [ ] **Step 3: Interaction checks** — (a) every CTA route lands correctly: front-page + /home CTAs → /book-now or /book as the live hrefs dictate (grep the built HTML for each page's booking hrefs and curl each target for 200); (b) submitting an EMPTY form triggers native validation (no panel); (c) filling all required fields and submitting shows the coming-soon panel, the URL does NOT change, and no network POST occurs (check with a headless-browser navigation listener or by asserting the URL is unchanged after submit); (d) the panel's tel:/mailto: links carry the right hrefs.
- [ ] **Step 4: Regression** — prior routes unchanged (diff scope: only round-9 files; if any shared file was touched, byte-diff the other routes).
- [ ] **Step 5: Gates + commit** — `pnpm lint && pnpm build`, 14 routes static.

```bash
git add -A
git commit -m "fix: booking pages fidelity pass and interaction verification"
```

Report: five-width tables per page, fixes with file:line + provenance, the four interaction check results, regression proof, artifact paths.
