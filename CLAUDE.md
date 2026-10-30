<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ivy-cleans

**Principles:** KISS, YAGNI, DRY. Pure logic in plain modules, framework glue thin. Extend what exists before adding a layer.

**Stack:** Next.js 16.2 (App Router, `src/proxy.ts` — Next 16 calls middleware `proxy`) · React 19.2 · TypeScript 5 (strict) · Tailwind CSS v4 + shadcn/ui (new-york, lucide) · Prisma 7 + `@prisma/adapter-pg` on Neon Postgres · better-auth · Anthropic SDK (city generator) · Resend (lead email) · Backblaze B2 (photos) · Vercel + Global Config (`@vercel/edge-config`) · Zod 4 · Vitest 4 · pnpm.

One Next.js app, two halves: the **public city sites** (a pixel-faithful clone of ivycleans.com, one tenant per city domain) and the **operator console** at `/admin` (leads CRM + the Claude pipeline that generates a new city site).

## Quick Commands

| Task | Command |
|---|---|
| Install deps | `pnpm install` (runs `prisma generate`) |
| Dev server | `pnpm dev` (port 3000) |
| Build + typecheck | `pnpm build` (`prisma generate && next build`) |
| Lint | `pnpm lint` |
| Tests | `pnpm test` (everything) · `pnpm test:unit` · `pnpm test:integration` (real Neon + Backblaze) |
| One test file | `pnpm vitest run tests/unit/auth/access.test.ts` |
| Cross-city duplication | `pnpm check:duplication` (exits 1 on findings) |
| Internal link graph | `pnpm check:links` (exits 1 on failure) |
| Push schema to DB | `pnpm prisma db push` (no migrations dir — never has been) |
| Create an operator | `SEED_PASSWORD=... node --env-file=.env scripts/ops/seed-user.mjs --email x@y.com --name 'Name' --role admin` |
| Generate a city, real model | `node scripts/ops/generate-city.mjs` (spends API money) |
| Prompt evals | `npx tsx evals/run.mjs [fixture] [--dry-run] [--no-rubric]` — run before merging any prompt change |
| Admin E2E (by hand) | `node scripts/dev/admin-e2e.mjs` (Playwright, stubbed model) |
| Provisioning creds check | `node scripts/ops/provision-probe.mjs` (buys nothing) |

## Project Structure

```
src/
├── proxy.ts                # host -> city rewrite + /admin redirect (UX only, not enforcement)
├── app/                    # ROUTES ONLY: pages, layouts, actions.ts, route handlers
│   ├── (sites)/[city]/     # public tenant tree: (front) = front page + book-now, (inner) = every inner page
│   │   └── actions.ts      # public form server actions -> src/server/leads/submit.ts
│   ├── admin/
│   │   ├── _components/    # console-wide UI: nav, identity chip, ui.tsx, submit button, photo drop zone, admin.css
│   │   ├── login/
│   │   └── (console)/      # dashboard, leads, sites, new, generate/[key], review/[key] — each: page.tsx + actions.ts + its own UI
│   ├── api/                # outside callers only: auth/[...all] (better-auth), blog/webhook (blogr.ai)
│   ├── photos/[...key]/    # serves city photos from Backblaze
│   └── robots.ts, sitemap.ts, globals.css (rem ladder)
├── site/                   # FRONTEND of the microsites (no database access)
│   ├── components/         # page sections by page: home/, area/, service/, blog/, book/, contact/, ...
│   ├── data/               # all user-visible copy + per-page data builders (suburb.ts, services/registry.ts, meta.ts, ...)
│   └── city-param.ts       # resolves the [city] segment, 404s an unknown key
├── server/                 # BACKEND (framework-free except auth/)
│   ├── pipeline/           # generator: stages/ (prompts, research, run), admin-logic/ (one file per console screen),
│   │                       #   schemas, model (ModelClient seam), facts, provision, photos, about
│   ├── content/            # city documents: store, drafts, slots, validate, quality, similarity, links, resolve-rewrite
│   ├── leads/              # lead capture + CRM core; store.ts is the only Prisma importer here
│   ├── blog/               # webhook receiver core; store.ts is the only Prisma importer here
│   ├── auth/               # access.ts (role matrix), auth.ts, auth-server.ts (enforcement), auth-rate-limit, admin-routes
│   └── infra/              # db.ts (Prisma client), b2.ts (Backblaze)
├── components/ui/          # shadcn primitives (components.json points here)
├── lib/utils.ts            # shadcn's cn()
└── generated/prisma        # Prisma 7 client output (gitignored, recreated by prisma generate)
content/                    # deployed base layer: <city>.json documents, _drafts/<key>.json sidecars, _cities.json, _domains.json
prisma/schema.prisma        # Lead, SiteSettings, User/Session/Account/Verification, BlogPost, ContentEntry
scripts/checks/             # check-duplication, check-links (exit 1 on failure)
scripts/ops/                # seed-user, generate-city, provision-probe
scripts/dev/                # admin-e2e, snapshot-pages, seed-demo-leads, extract-seed, download-assets
evals/                      # prompt evals over fixture cities
tests/unit/<area>/          # mirrors src: pipeline, content, leads, blog, auth, site, admin
tests/integration/          # touches real services: leads-store (Neon), about-logic (Backblaze)
docs/architecture.md        # this tree, the import rules, where new code goes
docs/ai-prompts.md          # every prompt word for word, for a non-engineer — keep it current
docs/handoffs/              # external reviews and handoff packages, kept as written
```

Aliases: `@/*` → `./src/*`, `@content/*` → `./content/*` (both also mapped in `vitest.config.ts`). Cross-folder imports use the alias; same-folder imports use `./`.

**Import rules** (enforced by `no-restricted-imports` in `eslint.config.mjs`):
- `src/server/**` imports no `react`, `next/*`, `@/app/*`, `@/site/components/*` or `@/components/*`. Only `src/server/auth/` may use `next/*` and `react`. Reading `@/site/data/*` is allowed — it is plain data.
- `src/site/**` never imports `@/server/infra/*`, `@/generated/*` or `@prisma/*`; it reads through a `src/server` module.
- `src/app/` holds no business logic: it calls `src/server` and renders `src/site`.

---

# Frontend — the public city sites

## Routing (multi-tenant)

- `src/proxy.ts` maps the request host to a city key and rewrites to `/[city]/...`, so public URLs stay bare. Logic lives in `resolveRewrite()` (`src/server/content/resolve-rewrite.ts`), which reads the host map from Global Config merged over `content/_domains.json` — a new domain routes without a redeploy. `loadRouting()` must never throw: a throw there is every site down.
- Internal `/<cityKey>/...` paths are the draft preview. `content/_cities.json` is hand-maintained and must list every key, drafts included, or a draft loses its preview.
- `[city]/layout.tsx` prebuilds live cities only (`generateStaticParams`) with `dynamicParams = true`; it renders children untouched and must not add a byte.
- No link may leave the tenant: ivycleans.com links map onto the city's own site or become text. `pnpm check:links` asserts it.

## Styling conventions (ivycleans clone)

- `src/app/globals.css` defines a viewport-stepped `html { font-size }` ladder copied from the live site's Elementor kit. Tailwind's rem-based utilities scale with it — DO NOT use default utilities like `text-sm`/`p-4` for sizes that must match the live site. Use explicit arbitrary values (`text-[1.8rem]`, `py-[6rem]`) traced to the reference CSS.
- Source of truth for every size/color: `docs/superpowers/reference/ivycleans-live/post-<id>.css` (front page 2035, /home 8, /cleaning-services 30, kit 6). Find a section's `elementor-element-XXXXXXX` id in the matching reference HTML, then grep that id in the CSS.
- Site font is Poppins (via `next/font`); the kit's Raleway appears only where the reference CSS says so.
- Apostrophes in JSX copy must render U+2019: use `&rsquo;` or a literal ’ (straight `'` fails lint and mismatches the live copy).
- `cn()` from `src/lib/utils.ts` for class merging. Icons: lucide-react. Toasts: sonner.
- Tailwind v4 scans every non-ignored file: keep DOM dumps and probe output in gitignored dirs (`/fidelity-*/`), or their class strings bake dead utilities into the shared CSS.

## Copy and data

- All user-visible copy lives in `src/site/data/*.ts`, byte-verbatim from `docs/superpowers/reference/ivycleans-live/*content-dump*.txt` (typos included). Never paraphrase.
- Template copy carries tokens (`{city}`, `{suburb}`, `{ST}`) resolved by `src/server/content/interpolate.ts`. Generated copy comes from the city document's `sections` slots.
- Slot reads (`src/server/content/slots.ts`): `s()` / `sl()` throw on a missing slot (the request fails, not the build); `sOpt()` returns undefined. Area and service-local slots are always read with `sOpt` — Minneapolis has no generated area copy and falls back to template.
- Seven services in `src/site/data/services/registry.ts`; slugs are the client's, stored not derived. Six render through the shared template; move-out is bespoke.
- Area pages: `src/site/data/suburb.ts` keeps the template skeleton; hero / houseCleaning / benefits read `suburb.<slug>.intro|homes|local`.
- LocalBusiness JSON-LD and the map embed render only once a city has a real address.

---

# Backend — console, pipeline, data

## Operator console & RBAC

The operator console lives at `/admin` (`src/app/admin/`) and requires a session.

| Section | admin | manager |
|---|---|---|
| Dashboard `/admin/dashboard` | ✓ | ✓ |
| Leads `/admin/leads` | ✓ | ✓ |
| Sites `/admin/sites` (Settings per city) | ✓ | ✗ |
| Pipeline `/admin/new`, `/generate`, `/review` | ✓ | ✗ |

- `src/server/auth/access.ts` is the ONLY place the role matrix lives — add a console section there, not in the nav and not in the proxy. Default-deny: a section missing from `SECTIONS` is closed to managers.
- `src/server/auth/auth-server.ts` is the enforcement point. Every server action under `(console)/` must start with `requireAdmin()` or `requireSession()`: a layout guard does not run for an action POST. The proxy's cookie check is UX only.
- An unknown role on a session is treated as signed out, never as manager. `?next=` goes through `safeNext()`.
- Operator accounts come from `scripts/ops/seed-user.mjs` only. better-auth exposes `/api/auth/sign-up/email` by default whenever `emailAndPassword` is enabled — `disableSignUp: true` in `src/server/auth/auth.ts` is what actually refuses it. Removing that line reopens anonymous account creation (as `manager`, since `role.input` is `false`) even though nothing else in the UI links to a signup page. Adding a signup flow is a decision, not a convenience.
- On a mapped customer domain `/admin` falls through and 404s; the console only answers on the operator's own host.

## City generation pipeline

Flow: `/admin/new` (city, facts, ops, About Us inputs) → `createDraftFromFields` → stages run one request at a time → `/admin/review/[key]` (per-stage regenerate, suburbs editor, quality findings) → `finalizeDraft` → `publishCity` (optional domain provisioning) → live.

| Stage | Model | Writes |
|---|---|---|
| `research` | Sonnet (`MODELS.research`), 3 web-search passes (metro, area list, one per area) + a structuring pass | `ResearchOutput`: areas with subdivisions, housing, conditions (`copySafe`), neighbours; ZIPs; keywords |
| `front` | Opus (`MODELS.writing`) | `services.heroParagraphs`, `serviceIntro`, five cards |
| `suburb` | Opus, **one call per area** | `suburb.<slug>.intro|homes|local` |
| `service` | Opus | `service.<slug>.local` for `SERVICE_LOCAL_SLUGS` |

- Stages and their slots live in `src/server/content/slots.ts` (not `stages.ts`, to avoid an import cycle); prompts in `src/server/pipeline/stages/prompts.ts`, stage execution in `stages/run.ts`. The union of `stageSlots(research)` must equal the required slots — pinned by a test.
- Drafts are sidecars (`draft` + `progress` entries, see Content storage). Every stage is resumable; `regenerateStage` deletes exactly that stage's slots and clears downstream stages.
- The model is reached only through the `ModelClient` seam (`src/server/pipeline/model.ts`). `STUB_MODEL=1` swaps in fixtures — tests and E2E use it; never set it in production.
- `src/server/pipeline/facts.ts` derives phone and state in code; fuzzy matching was rejected on purpose. Operator notes go in via `notesBlock()` as data, never as instructions.
- `reservedSlugs()` / `normalizeResearchSlugs()` drop colliding and reserved slugs — extend, don't replace. New cities use a bare `<area>` slug; Minneapolis keeps its stored slugs (indexed URLs).
- At publish: `src/server/content/quality.ts` (entity counts, operator facts used, `BANNED_PHRASES`) and `src/server/content/similarity.ts` (verbatim runs ≥60 chars across cities, shingle similarity between cities and between sibling areas).
- Prompt changes: update `docs/ai-prompts.md` in the same change and run `evals/run.mjs` before merging.

## Content storage

- City documents, drafts, progress logs and both indexes go through `src/server/content/entries.ts`, the only place that knows where they live. City documents are validated by `src/server/content/validate.ts` and read through `src/server/content/store.ts`.
- **The Vercel filesystem is read-only**, so on Vercel (`VERCEL=1`) entries are rows in the `ContentEntry` table, layered over the deployed `content/` files: a row wins, `deleted` hides a file, no row means the file answers. Locally and in tests they are the files. `CONTENT_STORE=db|file` overrides.
- Once a city has a row, committing its `content/<key>.json` no longer changes production. Public reads fall back to the deployed file when Neon is down; writers throw instead, so a failed read is never mistaken for "no document".
- The database has no per-process cache: another server may have changed the city. The proxy cannot read the database, so a new city's preview path and any domain reach it through Global Config (`EDGE_CONFIG`, `GLOBAL_CONFIG_ID`, `VERCEL_TOKEN`).

## Database (Prisma 7 + Neon)

- Client in `src/server/infra/db.ts`: `@prisma/adapter-pg` over a real `pg` Pool, cached on `globalThis`, shared by the leads store, the blog store and better-auth. Keep the Pool's `connectionTimeoutMillis` — without it pg-pool never times out a hung connect.
- Generator `provider = "prisma-client"`, output `src/generated/prisma`; config in `prisma.config.ts`. `DATABASE_URL` (Neon pooled, host contains `-pooler`) lives in `.env`, because the Prisma CLI reads only `.env`.
- Only `src/server/leads/store.ts`, `src/server/blog/store.ts` and `src/server/content/db-store.ts` import Prisma; everything else takes injected ports.
- Neon can stall on IPv6: `DB_DISABLE_HAPPY_EYEBALLS=1` sets both `setDefaultAutoSelectFamily(false)` and `ipv4first`. When Neon is unreachable the DB suites time out — re-run before blaming code.

## Leads, blog, photos, domains

- **Leads** (`src/server/leads/`): `submit.ts` creates the lead BEFORE attempting the email — a failed notification never loses a customer. City attribution from host; honeypot + spam checks; `IP_HASH_SALT` must be non-blank. Five statuses: new / contacted / quoted / booked / lost.
- **Blog** (`src/server/blog/`, `/api/blog/webhook`): blogr.ai posts with bearer `BLOGR_WEBHOOK_TOKEN`; HTML sanitized, city resolved from the delivery's domain, near-duplicates rejected.
- **Photos** (`src/server/pipeline/photo-*.ts`, `src/server/infra/b2.ts`): uploaded to Backblaze B2 (`B2_*`), served at `/photos/<city>/<file>` with immutable caching. `sharp` must stay on the version Next ships (`^0.34.5` on Next 16.2) and be imported lazily — a second libvips 500s every admin page on Vercel. Vercel refuses bodies over ~4.5 MB, so the drop zone shrinks photos client-side.
- **Domains** (`src/server/pipeline/provision.ts`): Porkbun (registrar + DNS) → Vercel (host) → Global Config (host → city map). Three seams with stubs; opt-in at publish. Not yet run against live accounts. Read DNS targets from Vercel's API, never hardcode them.

## Environment

`.env` (Prisma reads only this): `DATABASE_URL`, `DB_DISABLE_HAPPY_EYEBALLS`, `BLOGR_WEBHOOK_TOKEN`, `B2_ENDPOINT`, `B2_ACCESS_KEY_ID`, `B2_SECRET_ACCESS_KEY`, `B2_BUCKET_NAME`. Template: `example.env`.

`.env.local`: `ANTHROPIC_API_KEY`, `STUB_MODEL`, `RESEND_API_KEY`, `LEADS_FROM_EMAIL`, `LEADS_DASHBOARD_ORIGIN`, `IP_HASH_SALT`, `STUB_EMAIL`, `BETTER_AUTH_SECRET` (keep stable — changing it signs everyone out), `BETTER_AUTH_URL`. Template: `.env.local.example`.

Provisioning: `PORKBUN_API_KEY`, `PORKBUN_SECRET_KEY`, `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`, `GLOBAL_CONFIG_ID`, `EDGE_CONFIG`.

Env fallbacks: `??` fires only on undefined, and env templates ship blank lines (`''`). Treat blank as unset.

---

## Agent Constraints

### Critical (pipeline — no test catches these)

- No `.min()` / `.max()` / `.length()` in `src/server/pipeline/schemas.ts`: the Anthropic structured-output API rejects them. `MarketOpsSchema` is the sole exemption (operator input, never model output).
- `isWritableArea()` has one definition (`src/server/content/slots.ts`) and several call sites (suburb loop, `stageComplete`, `stageSlots`, `buildSuburbPrompt`, `scoreSuburbs`). If they disagree, a city can never finalize.
- One model call per request. Twelve areas in one server action is minutes; a serverless function is killed long before. The admin drives the suburb stage one area per request; DNS/TLS checks are polled the same way.
- A prompt section with an empty body invites invention. Omit the whole section (header included) when its content is empty.

### Critical (security)

- Every console server action starts with `requireAdmin()` / `requireSession()`.
- Keep `disableSignUp: true`. Never weaken `safeNext()`.
- Leads hold customer PII. Never log lead contents; never send them anywhere but the operator email.
- `pnpm test` runs `tests/integration/leads-store.test.ts` against whatever `DATABASE_URL` points at — today the **production** Neon. Every write/delete there is scoped to `cityKey` starting with `ztest-`; keep that prefix on any new DB test.

### Critical (git)

- `main` is production (Vercel deploys it). Never commit to `main` and never merge into it yourself; the owner merges `dev` → `main`.
- `dev` is the integration branch. Every change starts on its own branch cut from `dev` and is merged back into `dev` when its tests, lint and build pass:
  - Branch name: `<type>/<short-kebab-topic>`, type = the commit area (`feat`, `fix`, `admin`, `content`, `blog`, `about`, `test`, `docs`, `refactor`, `chore`). Examples: `feat/validated-research`, `fix/publish-domain-check`.
  - `git switch -c feat/<topic> dev` → commit → `git switch dev && git merge --no-ff feat/<topic>` → push `dev` → delete the branch.
- NEVER commit unless explicitly asked. NEVER add Co-Authored-By or any AI attribution to commits.
- Commit messages: `area: description`, lowercase (`feat`, `fix`, `content`, `admin`, `blog`, `about`, `test`).
- Never commit: `.env*` (except the two templates), `docs/superpowers/`, `docs/ivy-cleans-handoff-1/`, `trip-scheduler/`, `peaktransport/` (sibling projects with their own history), `.superpowers/`, `.claude/`, `/fidelity-*/`.

## Code Style

- TypeScript strict; no `any`. Zod for all external input (forms, webhook payloads, model output).
- Server actions stay thin: call a pure `*Logic` function (e.g. `src/server/pipeline/admin-logic/`) that tests can drive without Next.
- Comments: short and rare. One line on why — a constraint, invariant or workaround. No multi-paragraph essays, no review-item or ticket citations, no change narration ("now uses…", "refactored to…").

## Testing

- `pnpm test` is Vitest, `environment: node`, files serialized (`fileParallelism: false`) because pipeline suites write the real `content/` dir and restore the shared indexes. `tests/setup-env.ts` loads `.env.local` then `.env`. `STUB_EMAIL=1` is forced so no test reaches Resend.
- Before claiming done: `pnpm test`, `pnpm lint`, and `pnpm build` for anything that touches routes or types. Pipeline/prompt changes also: `pnpm check:duplication`, `pnpm check:links`, evals.
- UI changes: verify in a real browser (Playwright click-through + screenshots), not only tests. Only one `next dev` per directory — reuse a running one on :3000, otherwise start on another port and kill it by pid.

## Key Files for Common Tasks

| Task | Where |
|---|---|
| New console section | `src/server/auth/access.ts` `SECTIONS` + route folder under `src/app/admin/(console)/` with `page.tsx` + `actions.ts` (guard first in every action) + logic in `src/server/pipeline/admin-logic/` |
| New public page | route under `src/app/(sites)/[city]/(inner)/`, copy in `src/site/data/`, sizes from the reference CSS, link it into `src/site/data/link-graph.ts` |
| New generated slot | `src/server/content/slots.ts` (stage slots), prompt in `src/server/pipeline/stages/`, schema in `src/server/pipeline/schemas.ts`, read with `sOpt` in `src/site/data/*`, update `docs/ai-prompts.md` |
| New research field | `src/server/pipeline/schemas.ts` + `src/server/content/types.ts` + `src/server/content/validate.ts`; merge it in `updateSuburbsLogic` so the suburbs editor doesn't wipe it |
| New DB model | `prisma/schema.prisma` → `pnpm prisma db push` → a store module that is the only Prisma importer for it |
| New service | `src/site/data/services/registry.ts` (+ `SERVICE_LOCAL_SLUGS` if it gets a local paragraph; a test pins the two) |
