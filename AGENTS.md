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
| Tests | `pnpm test` (`vitest run`) |
| One test file | `pnpm vitest run tests/access.test.ts` |
| Cross-city duplication | `pnpm check:duplication` (exits 1 on findings) |
| Internal link graph | `pnpm check:links` (exits 1 on failure) |
| Push schema to DB | `pnpm prisma db push` (no migrations dir — never has been) |
| Create an operator | `SEED_PASSWORD=... node --env-file=.env scripts/seed-user.mjs --email x@y.com --name 'Name' --role admin` |
| Generate a city, real model | `node scripts/generate-city.mjs` (spends API money) |
| Prompt evals | `npx tsx evals/run.mjs [fixture] [--dry-run] [--no-rubric]` — run before merging any prompt change |
| Admin E2E (by hand) | `node scripts/admin-e2e.mjs` (Playwright, stubbed model) |
| Provisioning creds check | `node scripts/provision-probe.mjs` (buys nothing) |

## Project Structure

```
src/
├── proxy.ts              # host -> city rewrite + /admin redirect (UX only, not enforcement)
├── app/
│   ├── (sites)/[city]/   # public tenant tree: (front) = front page + book-now, (inner) = every inner page
│   │   └── lead-actions.ts   # public form server actions -> src/leads/submit.ts
│   ├── admin/            # console: login/, (console)/{dashboard,leads,sites,new,generate,review}
│   ├── api/auth/[...all] # better-auth handler
│   ├── api/blog/webhook  # blogr.ai delivery, one endpoint for every city
│   ├── photos/[...key]   # serves city photos from Backblaze
│   └── robots.ts, sitemap.ts, globals.css (rem ladder)
├── components/           # page sections by page (home/, suburb/, service/, blog/, ...) + ui/ (shadcn)
├── data/                 # all user-visible copy + per-page data builders (suburb.ts, services/registry.ts, meta.ts, ...)
├── content/              # city documents: store, drafts, slots, validate, quality, similarity, links, resolve-rewrite
├── pipeline/             # generator: stages, schemas, model (ModelClient seam), facts, admin-logic, provision, photos, about
├── leads/                # lead capture + CRM core; store.ts is the only Prisma importer here
├── blog/                 # webhook receiver core; store.ts is the only Prisma importer here
├── lib/                  # access.ts (role matrix), auth.ts, auth-server.ts (enforcement), db.ts (Prisma), b2.ts, utils.ts
└── generated/prisma      # Prisma 7 client output (gitignored, recreated by prisma generate)
content/                  # <city>.json documents, _drafts/<key>.json sidecars, _cities.json, _domains.json
prisma/schema.prisma      # Lead, SiteSettings, User/Session/Account/Verification, BlogPost
scripts/                  # seed-user, generate-city, check-duplication, check-links, admin-e2e, provision-probe, ...
evals/                    # prompt evals over fixture cities
tests/                    # Vitest suites, flat; fixtures/ and __snapshots__/
docs/ai-prompts.md        # every prompt word for word, for a non-engineer — keep it current
```

Path alias `@/*` → `./src/*` (also mapped in `vitest.config.ts`).

---

# Frontend — the public city sites

## Routing (multi-tenant)

- `src/proxy.ts` maps the request host to a city key and rewrites to `/[city]/...`, so public URLs stay bare. Logic lives in `resolveRewrite()` (`src/content/resolve-rewrite.ts`), which reads the host map from Global Config merged over `content/_domains.json` — a new domain routes without a redeploy. `loadRouting()` must never throw: a throw there is every site down.
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

- All user-visible copy lives in `src/data/*.ts`, byte-verbatim from `docs/superpowers/reference/ivycleans-live/*content-dump*.txt` (typos included). Never paraphrase.
- Template copy carries tokens (`{city}`, `{suburb}`, `{ST}`) resolved by `src/content/interpolate.ts`. Generated copy comes from the city document's `sections` slots.
- Slot reads (`src/content/slots.ts`): `s()` / `sl()` throw on a missing slot (the request fails, not the build); `sOpt()` returns undefined. Area and service-local slots are always read with `sOpt` — Minneapolis has no generated area copy and falls back to template.
- Seven services in `src/data/services/registry.ts`; slugs are the client's, stored not derived. Six render through the shared template; move-out is bespoke.
- Area pages: `src/data/suburb.ts` keeps the template skeleton; hero / houseCleaning / benefits read `suburb.<slug>.intro|homes|local`.
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

- `src/lib/access.ts` is the ONLY place the role matrix lives — add a console section there, not in the nav and not in the proxy. Default-deny: a section missing from `SECTIONS` is closed to managers.
- `src/lib/auth-server.ts` is the enforcement point. Every server action under `(console)/` must start with `requireAdmin()` or `requireSession()`: a layout guard does not run for an action POST. The proxy's cookie check is UX only.
- An unknown role on a session is treated as signed out, never as manager. `?next=` goes through `safeNext()`.
- Operator accounts come from `scripts/seed-user.mjs` only. better-auth exposes `/api/auth/sign-up/email` by default whenever `emailAndPassword` is enabled — `disableSignUp: true` in `src/lib/auth.ts` is what actually refuses it. Removing that line reopens anonymous account creation (as `manager`, since `role.input` is `false`) even though nothing else in the UI links to a signup page. Adding a signup flow is a decision, not a convenience.
- On a mapped customer domain `/admin` falls through and 404s; the console only answers on the operator's own host.

## City generation pipeline

Flow: `/admin/new` (city, facts, ops, About Us inputs) → `createDraftFromFields` → stages run one request at a time → `/admin/review/[key]` (per-stage regenerate, suburbs editor, quality findings) → `finalizeDraft` → `publishCity` (optional domain provisioning) → live.

| Stage | Model | Writes |
|---|---|---|
| `research` | Sonnet (`MODELS.research`), 3 web-search passes (metro, area list, one per area) + a structuring pass | `ResearchOutput`: areas with subdivisions, housing, conditions (`copySafe`), neighbours; ZIPs; keywords |
| `front` | Opus (`MODELS.writing`) | `services.heroParagraphs`, `serviceIntro`, five cards |
| `suburb` | Opus, **one call per area** | `suburb.<slug>.intro|homes|local` |
| `service` | Opus | `service.<slug>.local` for `SERVICE_LOCAL_SLUGS` |

- Stages and their slots live in `src/content/slots.ts` (not `stages.ts`, to avoid an import cycle); prompts in `src/pipeline/stages.ts`. The union of `stageSlots(research)` must equal the required slots — pinned by a test.
- Drafts are sidecars at `content/_drafts/<key>.json` (+ `.progress.json`). Every stage is resumable; `regenerateStage` deletes exactly that stage's slots and clears downstream stages.
- The model is reached only through the `ModelClient` seam (`src/pipeline/model.ts`). `STUB_MODEL=1` swaps in fixtures — tests and E2E use it; never set it in production.
- `src/pipeline/facts.ts` derives phone and state in code; fuzzy matching was rejected on purpose. Operator notes go in via `notesBlock()` as data, never as instructions.
- `reservedSlugs()` / `normalizeResearchSlugs()` drop colliding and reserved slugs — extend, don't replace. New cities use a bare `<area>` slug; Minneapolis keeps its stored slugs (indexed URLs).
- At publish: `src/content/quality.ts` (entity counts, operator facts used, `BANNED_PHRASES`) and `src/content/similarity.ts` (verbatim runs ≥60 chars across cities, shingle similarity between cities and between sibling areas).
- Prompt changes: update `docs/ai-prompts.md` in the same change and run `evals/run.mjs` before merging.

## Content storage

- City documents are JSON in `content/<key>.json`, validated by `src/content/validate.ts`, read through `src/content/store.ts` (per-process cache). Setting `BLOB_READ_WRITE_TOKEN` flips the store into Vercel Blob mode — never set it for photos.
- Drafts, city JSON and both indexes are written with `fs`. **The Vercel filesystem is read-only**, so creating/generating/publishing a city and every Settings save only work on a local `next dev`; results reach production by committing `content/*.json`.

## Database (Prisma 7 + Neon)

- Client in `src/lib/db.ts`: `@prisma/adapter-pg` over a real `pg` Pool, cached on `globalThis`, shared by the leads store, the blog store and better-auth. Keep the Pool's `connectionTimeoutMillis` — without it pg-pool never times out a hung connect.
- Generator `provider = "prisma-client"`, output `src/generated/prisma`; config in `prisma.config.ts`. `DATABASE_URL` (Neon pooled, host contains `-pooler`) lives in `.env`, because the Prisma CLI reads only `.env`.
- Only `src/leads/store.ts` and `src/blog/store.ts` import Prisma; everything else takes injected ports.
- Neon can stall on IPv6: `DB_DISABLE_HAPPY_EYEBALLS=1` sets both `setDefaultAutoSelectFamily(false)` and `ipv4first`. When Neon is unreachable the DB suites time out — re-run before blaming code.

## Leads, blog, photos, domains

- **Leads** (`src/leads/`): `submit.ts` creates the lead BEFORE attempting the email — a failed notification never loses a customer. City attribution from host; honeypot + spam checks; `IP_HASH_SALT` must be non-blank. Five statuses: new / contacted / quoted / booked / lost.
- **Blog** (`src/blog/`, `/api/blog/webhook`): blogr.ai posts with bearer `BLOGR_WEBHOOK_TOKEN`; HTML sanitized, city resolved from the delivery's domain, near-duplicates rejected.
- **Photos** (`src/pipeline/photo-*.ts`, `src/lib/b2.ts`): uploaded to Backblaze B2 (`B2_*`), served at `/photos/<city>/<file>` with immutable caching. `sharp` must stay on the version Next ships (`^0.34.5` on Next 16.2) and be imported lazily — a second libvips 500s every admin page on Vercel. Vercel refuses bodies over ~4.5 MB, so the drop zone shrinks photos client-side.
- **Domains** (`src/pipeline/provision.ts`): Porkbun (registrar + DNS) → Vercel (host) → Global Config (host → city map). Three seams with stubs; opt-in at publish. Not yet run against live accounts. Read DNS targets from Vercel's API, never hardcode them.

## Environment

`.env` (Prisma reads only this): `DATABASE_URL`, `DB_DISABLE_HAPPY_EYEBALLS`, `BLOGR_WEBHOOK_TOKEN`, `B2_ENDPOINT`, `B2_ACCESS_KEY_ID`, `B2_SECRET_ACCESS_KEY`, `B2_BUCKET_NAME`. Template: `example.env`.

`.env.local`: `ANTHROPIC_API_KEY`, `STUB_MODEL`, `RESEND_API_KEY`, `LEADS_FROM_EMAIL`, `LEADS_DASHBOARD_ORIGIN`, `IP_HASH_SALT`, `STUB_EMAIL`, `BETTER_AUTH_SECRET` (keep stable — changing it signs everyone out), `BETTER_AUTH_URL`. Template: `.env.local.example`.

Provisioning: `PORKBUN_API_KEY`, `PORKBUN_SECRET_KEY`, `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`, `GLOBAL_CONFIG_ID`, `EDGE_CONFIG`.

Env fallbacks: `??` fires only on undefined, and env templates ship blank lines (`''`). Treat blank as unset.

---

## Agent Constraints

### Critical (pipeline — no test catches these)

- No `.min()` / `.max()` / `.length()` in `src/pipeline/schemas.ts`: the Anthropic structured-output API rejects them. `MarketOpsSchema` is the sole exemption (operator input, never model output).
- `isWritableArea()` has one definition (`src/content/slots.ts`) and several call sites (suburb loop, `stageComplete`, `stageSlots`, `buildSuburbPrompt`, `scoreSuburbs`). If they disagree, a city can never finalize.
- One model call per request. Twelve areas in one server action is minutes; a serverless function is killed long before. The admin drives the suburb stage one area per request; DNS/TLS checks are polled the same way.
- A prompt section with an empty body invites invention. Omit the whole section (header included) when its content is empty.

### Critical (security)

- Every console server action starts with `requireAdmin()` / `requireSession()`.
- Keep `disableSignUp: true`. Never weaken `safeNext()`.
- Leads hold customer PII. Never log lead contents; never send them anywhere but the operator email.
- `pnpm test` runs `tests/leads-store.test.ts` against whatever `DATABASE_URL` points at — today the **production** Neon. Every write/delete there is scoped to `cityKey` starting with `ztest-`; keep that prefix on any new DB test.

### Critical (git)

- NEVER commit unless explicitly asked. NEVER add Co-Authored-By or any AI attribution to commits.
- Commit messages: `area: description`, lowercase (`feat`, `fix`, `content`, `admin`, `blog`, `about`, `test`).
- Never commit: `.env*` (except the two templates), `docs/superpowers/`, `docs/ivy-cleans-handoff-1/`, `trip-scheduler/`, `peaktransport/` (sibling projects with their own history), `.superpowers/`, `.claude/`, `/fidelity-*/`.

## Code Style

- TypeScript strict; no `any`. Zod for all external input (forms, webhook payloads, model output).
- Server actions stay thin: call a pure `*Logic` function (e.g. `src/pipeline/admin-logic.ts`) that tests can drive without Next.
- Comments: short and rare. One line on why — a constraint, invariant or workaround. No multi-paragraph essays, no review-item or ticket citations, no change narration ("now uses…", "refactored to…").

## Testing

- `pnpm test` is Vitest, `environment: node`, files serialized (`fileParallelism: false`) because pipeline suites write the real `content/` dir and restore the shared indexes. `tests/setup-env.ts` loads `.env.local` then `.env`. `STUB_EMAIL=1` is forced so no test reaches Resend.
- Before claiming done: `pnpm test`, `pnpm lint`, and `pnpm build` for anything that touches routes or types. Pipeline/prompt changes also: `pnpm check:duplication`, `pnpm check:links`, evals.
- UI changes: verify in a real browser (Playwright click-through + screenshots), not only tests. Only one `next dev` per directory — reuse a running one on :3000, otherwise start on another port and kill it by pid.

## Key Files for Common Tasks

| Task | Where |
|---|---|
| New console section | `src/lib/access.ts` `SECTIONS` + route under `src/app/admin/(console)/` + guard in every action |
| New public page | route under `src/app/(sites)/[city]/(inner)/`, copy in `src/data/`, sizes from the reference CSS, link it into `src/data/link-graph.ts` |
| New generated slot | `src/content/slots.ts` (stage slots), prompt in `src/pipeline/stages.ts`, schema in `src/pipeline/schemas.ts`, read with `sOpt` in `src/data/*`, update `docs/ai-prompts.md` |
| New research field | `src/pipeline/schemas.ts` + `src/content/types.ts` + `src/content/validate.ts`; merge it in `updateSuburbsLogic` so the suburbs editor doesn't wipe it |
| New DB model | `prisma/schema.prisma` → `pnpm prisma db push` → a store module that is the only Prisma importer for it |
| New service | `src/data/services/registry.ts` (+ `SERVICE_LOCAL_SLUGS` if it gets a local paragraph; a test pins the two) |
