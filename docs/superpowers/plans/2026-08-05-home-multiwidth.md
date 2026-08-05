# /home Multi-Width Re-Audit + Inner Chrome Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/home` matches live per-section within ~1px at 1920/1600/1440/1280/1024/768/390, and the shared inner chrome lands on live's exact heights.

**Architecture:** Chrome first (Task 1, shared by 8 routes, heavily guarded), then the /home page audit (Task 2) runs on corrected chrome. Same probe playbook as round 6: live resize-probing, localhost iteration, evidence tables.

**Tech Stack:** Next.js 16.2.12, Tailwind 4 (breakpoints already remapped lg=1025/xl=1281/2xl=1441), Playwright via pnpm dlx.

## Global Constraints

- STYLING ONLY — `src/data/*` frozen; content mismatches reported for user ruling, never coded.
- px-vs-rem per AGENTS.md: live-CSS rem stays rem (ladder); probe-measured px stays px. Reference CSS: `post-8.css` (/home page), `post-6.css` (kit), inner-chrome template markup in the reference HTML files (`home.html`, `cleaning-services.html`) — the chrome templates' own CSS (post-2282/post-186 if present in the reference dir; the round-6-committed post-2338/2342 are the FRONT chrome, not inner — do not confuse them).
- **Shared-chrome guard (Task 1):** before/after full-DOM probes of ALL 8 inner routes at 1440 and 390 — only the intended chrome deltas may appear, identical across routes; live-vs-local chrome probes on /home + one other inner route must land ON live's values (header/footer section heights within ~1px, not overshooting). `/` uses the front chrome — verify zero change there (it imports nothing from src/components/inner/).
- Known facts: /home FAQ is a static text block (round-2 user ruling, matches live); no reviews widget on /home; work carousel is 3/2/1-up (correct per width if live disagrees); /home doc-height error at 1024 measured at +2643.7px (round-6 table) — the missing tablet band is the presumed main cause; live desktop threshold is 1025 (proven).
- Live-load budget ~4–6 (resize-probe technique); no single command over ~5 min; artifacts in a `fidelity-r7/` session-scratchpad dir.
- Gates per task: `pnpm lint` + `pnpm build` clean, all routes static.
- Commit per task with given message + trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Inner chrome height fix (InnerHeader ~5.5px, InnerFooter ~18.5px)

**Files:**
- Modify: `src/components/inner/InnerHeader.tsx`, `src/components/inner/InnerFooter.tsx` (only these two)

**Interfaces:**
- Consumes: the live chrome values via probes of https://ivycleans.com/home/ (and one more inner page for cross-confirmation).
- Produces: inner chrome matching live's header/footer heights within ~1px at 1440 and 390; evidence tables for Task 2 to build on.

- [ ] **Step 1: Probe the live chrome.** One live load of /home (+ optional /cleaning-services confirm): computed header height, per-row breakdown (logo box, nav item line-height/padding, container paddings), footer per-block heights (contact block, links columns, socials row, bottom line) at 1440 and 390. Compare to ours; identify the ~5.5px and ~18.5px sources (likely a padding/line-height/border delta, not layout).
- [ ] **Step 2: Fix with provenance.** Apply the measured values (px stays px; template-CSS rem stays rem) with probe-provenance comments.
- [ ] **Step 3: Guard evidence.** Before/after full-DOM probes of all 8 inner routes at 1440+390: only the chrome deltas appear, identical across routes; `/` untouched (grep-prove no front component imports src/components/inner/, plus a `/` probe unchanged).
- [ ] **Step 4: Gates + commit.**

```bash
git add src/components/inner
git commit -m "fix: inner chrome heights match live within 1px"
```

Report to the workspace report file: source-of-delta diagnosis, fix values, guard tables.

---

### Task 2: /home multi-width audit — tablet band + containers

**Files:**
- Modify: any of `src/components/home/*.tsx`, `src/app/(inner)/home/page.tsx`, and (only if the audit proves a shared rule wrong, with an 8-route guard) `.tpl-inner .ec` in `src/app/globals.css`.

**Interfaces:**
- Consumes: corrected chrome from Task 1; round-6 techniques and the `fidelity-r6w` methodology.
- Produces: /home per-section ~1px at all seven widths.

- [ ] **Step 1: Baseline.** `pnpm build && pnpm start`; live resize-probe of /home at 1920/1600/1440/1280/1024/768/390 (one load, resize + re-measure; sanity-check one width against a fresh load) + the same probes locally. Build the per-section drift table FIRST.
- [ ] **Step 2: Containers.** Check every /home section container and the `.tpl-inner .ec` cap (119rem — verify against live probes at 1920/1600: is it rem-riding or was it validated only at 1440?) against post-8.css and the live computed widths. Restore rem where the CSS says rem. A `.tpl-inner .ec` change hits 8 routes: before/after probes of all 8 at 1440/390 (only intended deltas), plus live checks at 1920 on /home + one more route.
- [ ] **Step 3: Tablet band (768–1024).** Implement the missing band for /home components per live probes at 768 and 1024 (Elementor's tablet range ≤1024): column stacking, paddings, font-size steps. This is the +2643.7px fix — verify the 1024 doc-height error collapses to ~1px range.
- [ ] **Step 4: Iterate** until the seven-width table is clean; carousel visible-card counts checked per width against live; static FAQ block geometry included.
- [ ] **Step 5: Interactive + regression.** Menu, carousel wrap, links; other routes unchanged except intended shared deltas (tables).
- [ ] **Step 6: Gates + commit.**

```bash
git add -A
git commit -m "fix: /home multi-width fidelity — tablet band and container corrections"
```

Report: seven-width before/after tables, container findings, tablet-band values with provenance, carousel counts, regression tables, artifact paths.
