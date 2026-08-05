# Front Page Fidelity Re-Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `/` to the probe-verified fidelity standard (per-section ~1px at 1440×900 and 390×844) established in rounds 3–5.

**Architecture:** One audit-and-fix pass over the existing front-page components using live DOM probes; no new files expected, styling-only modifications to front-page components (and, only with a nine-route byte-diff guard, shared files).

**Tech Stack:** Next.js 16.2.12, Tailwind 4, Playwright (via pnpm dlx) for captures/probes.

## Global Constraints

- STYLING ONLY — zero copy/data changes. `src/data/*` must not appear in the diff. If a probe reveals a CONTENT difference between live and clone (live may have drifted since the round-1 snapshot), report it in the task report for a user ruling — never auto-apply content.
- Known intentional deviations, skip and quantify: the injected Vavada spam paragraph before Reviews (live-only); static-snapshot reviews (layout/typography must match, review content/rotation may differ); live admin/cookie chrome in captures.
- px-vs-rem per AGENTS.md: values measured in px stay px unless the reference CSS (`post-2035.css`, `post-6.css`, `post-2338.css`, `post-2342.css` in docs/superpowers/reference/ivycleans-live/) says rem.
- Shared-file edits (`src/app/globals.css`, `src/components/Icons.tsx`, `src/components/CtaButton.tsx`, or anything imported by non-front routes) require BEFORE/AFTER byte-diffs of ALL NINE routes (`/`, `/home`, `/cleaning-services`, `/deep-cleaning-minneapolis`, `/minneapolis-move-out-cleaning-services`, `/blog`, the post page, `/contact`, `/faq`) proving only `/` changed. If a shared edit can't satisfy that, don't make it — report instead.
- FAQ accordion default state: verify against live RUNTIME behavior (post-JS probe), not static markup — round-5 lesson.
- Live host is very slow (60–120s/page): capture/probe live ONCE per width (`--wait-for-timeout 15000+`), budget ~4–6 live loads total, iterate on localhost; no single command over ~5 min.
- Gates: `pnpm lint` + `pnpm build` clean, all routes static.
- Commit with the given message + trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Probe-driven re-audit and fix of /

**Files:**
- Modify: any of `src/components/{TopBar,Header,Hero,FeaturedIn,Intro,ServiceTypes,CtaBand,CtaButton,Packages,ServiceArea,Values,BeforeAfter,Reviews,Faq,BlogPreview,Footer}.tsx`, `src/app/(front)/page.tsx`, `src/app/(front)/layout.tsx` — styling only, as the audit dictates (shared-file guard above applies to CtaButton/Icons/globals).

**Interfaces:**
- Consumes: the merged, review-clean front page from rounds 1–5; reference CSS files listed in Global Constraints.
- Produces: `/` matching live per-section within ~1px at both widths, with probe-table evidence.

- [ ] **Step 1: Baseline captures + probes.** `pnpm build && pnpm start` (kill stale :3000). Capture live `https://ivycleans.com/` and local `/` at 1440×900 and 390×844 (full page), AND run a geometry/computed-style probe on each (per top-level section: y-offset, height; per key text node: font-size, line-height, weight, color; per section: background, padding). Store in a `fidelity-r6/` session-scratchpad dir. Build the live-vs-local per-section table FIRST — it is the audit's worklist.

- [ ] **Step 2: Fix drift section by section.** For each row off by more than ~1px (excluding the quantified spam delta): locate the section's `elementor-element-XXXXXXX` id in `docs/superpowers/reference/ivycleans-live/ivycleans.html`, grep it in `post-2035.css` (or the template CSS for chrome), apply the exact value; where the captured CSS is silent, use the live probe's computed value (px). Document each fix with a provenance comment. Re-probe localhost after each batch; iterate until the table is clean at both widths.

- [ ] **Step 3: Content-difference triage.** Anything the probe surfaces as a CONTENT mismatch (text, images, section presence — e.g. live-site drift since the round-1 snapshot) goes into a "Content differences found (needs user ruling)" section of the report, untouched in code.

- [ ] **Step 4: Interactive checks.** Mobile menu opens/closes; header dropdown navigates; FAQ accordion matches live runtime default state and toggles one-at-a-time; reviews carousel arrows wrap; `curl -s localhost:3000 | grep -o 'href="tel:[^"]*"' | sort -u` → only `tel:6124240391`; social/mailto hrefs intact.

- [ ] **Step 5: Regression proof.** If NO shared file was touched: show `git diff --name-only` confined to front-page files. If a shared file WAS touched: nine-route before/after byte-diff (normalized for build hashes) proving only `/` changed — include the diff command outputs in the report.

- [ ] **Step 6: Gates + commit.** `pnpm lint && pnpm build` (clean, all routes static).

```bash
git add -A
git commit -m "fix: front page probe-verified fidelity re-audit"
```

Report must include: the before/after probe tables (both widths), each fix with file:line + provenance, the spam-delta quantification, content-difference triage (or "none found"), interactive results, regression proof, screenshot/probe paths.
