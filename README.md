# Ivy Cleans

AI-generated local microsites for a residential cleaning business, one per city, served from a single app.

Ivy Cleans turns one proven cleaning-company website into a network of city sites. An operator types in a city and the branch's facts; Claude researches the market and writes the copy that makes that city's site its own — front page, one page per service area, and a local section on every service page. Each site captures leads, and every lead from every city lands in one CRM.

## How It Works

1. **Create** — An operator opens `/admin/new` and enters the city, phone, address and About Us facts
2. **Research** — Claude (Sonnet) searches the web for the city's service areas, subdivisions, housing and local conditions, then structures the findings
3. **Write** — Claude (Opus) writes the front page, each area page and each service page's local section, grounded in that research
4. **Review** — The operator previews the draft, edits the area list, regenerates any stage, and sees quality and duplication findings
5. **Publish** — The city goes live; optionally its domain is bought and pointed at the app (Porkbun → Vercel → Global Config), with no redeploy
6. **Capture** — Booking and contact forms store leads in Postgres and email that city's operator; blog posts arrive by webhook

## Key Features

- **Multi-tenant by domain** — One Next.js app serves every city; the request host decides which city renders
- **Pixel-faithful template** — Every page is a byte-verbatim clone of the original ivycleans.com, sizes traced to its live CSS
- **Research-grounded copy** — Area pages name real subdivisions and local conditions; facts flagged not copy-safe are used for targeting only
- **Duplication guards** — Verbatim-run and similarity checks across cities and between sibling areas, plus banned phrasings, run at publish
- **Resumable pipeline** — Every stage saves to a draft and can be regenerated on its own
- **Leads CRM** — Five-stage pipeline (new / contacted / quoted / booked / lost) with notes, across every city
- **Role-based console** — `admin` runs everything; `manager` sees Dashboard and Leads only
- **Blog per city** — blogr.ai delivers posts to one webhook that routes them to the right city

## Platform Overview

| Part | Technology | Location |
|---|---|---|
| City sites (public) | Next.js 16 App Router, React 19, Tailwind CSS v4 | `src/app/(sites)/[city]`, `src/components`, `src/data` |
| Operator console | Next.js server actions, shadcn/ui, better-auth | `src/app/admin` |
| Generation pipeline | Anthropic SDK (Sonnet research, Opus writing), Zod structured output | `src/pipeline`, `src/content` |
| Leads & blog | Prisma 7 + `@prisma/adapter-pg`, Resend | `src/leads`, `src/blog` |
| Database | Neon Postgres | `prisma/schema.prisma` |

**Infrastructure:** Vercel (hosting), Vercel Global Config (host → city map), Neon (Postgres), Backblaze B2 (city photos), Resend (lead email), Porkbun (domains + DNS), blogr.ai (blog posts).

**Cities:** Minneapolis is live. Houston and Orlando are drafts, previewable at `/houston` and `/orlando`.

## Development

### Prerequisites

- Node.js 20.6+ (22 recommended) and pnpm
- A Neon Postgres database (pooled connection string)
- An Anthropic API key with a spend cap — or `STUB_MODEL=1` to run the pipeline on fixtures

### Quick Start

```bash
# 1. Clone and configure
git clone git@github.com:rogenecarl/ivy-cleans.git
cd ivy-cleans
cp example.env .env                  # DATABASE_URL, B2_*, BLOGR_WEBHOOK_TOKEN
cp .env.local.example .env.local     # ANTHROPIC_API_KEY, RESEND_*, BETTER_AUTH_*, IP_HASH_SALT

# 2. Install and push the schema
pnpm install                         # also runs prisma generate
pnpm prisma db push

# 3. Create an operator account
SEED_PASSWORD=... node --env-file=.env scripts/seed-user.mjs \
  --email you@example.com --name 'Your Name' --role admin

# 4. Run
pnpm dev
# http://localhost:3000            Minneapolis (default city)
# http://localhost:3000/houston    a draft city's preview
# http://localhost:3000/admin      operator console
```

### Common Commands

| Task | Command |
|---|---|
| Dev server | `pnpm dev` |
| Build + typecheck | `pnpm build` |
| Lint | `pnpm lint` |
| Run tests | `pnpm test` |
| Cross-city duplication check | `pnpm check:duplication` |
| Internal link check | `pnpm check:links` |
| Generate a city with the real model | `node scripts/generate-city.mjs` |
| Prompt evals | `npx tsx evals/run.mjs --dry-run` |
| Admin end-to-end run | `node scripts/admin-e2e.mjs` |
| Check provisioning credentials | `node scripts/provision-probe.mjs` |

### Console Access

The console at `/admin` sits behind a session. There is no signup page, and better-auth's `/api/auth/sign-up/email` is disabled (`disableSignUp: true` in `src/lib/auth.ts`). Accounts come from `scripts/seed-user.mjs` only.

| Role | Access |
|---|---|
| `admin` | Dashboard, Leads, Sites, and the generation pipeline (new / generate / review) |
| `manager` | Dashboard and Leads only; everything else is refused server-side |

`src/lib/access.ts` is the single place the role matrix lives. `BETTER_AUTH_SECRET` signs session cookies — keep it stable, changing it signs every operator out. `BETTER_AUTH_URL` is the console's own origin.

### Known Limits

- **Creating and editing cities works only on a local `pnpm dev`.** City content is JSON in `content/`, and Vercel's filesystem is read-only. Generate locally, then commit `content/*.json` to publish.
- **`pnpm test` runs the leads-store suite against the database in `DATABASE_URL`.** Its writes are scoped to `ztest-` city keys; point it at a separate Neon branch where possible.

## Code Style

- **TypeScript:** strict mode, ESLint (`eslint-config-next`), Zod at every boundary — forms, webhooks, model output
- **Copy:** user-visible text lives in `src/data/*.ts`, verbatim from the live site; never paraphrased
- **Styling:** Tailwind arbitrary values traced to the reference CSS, not default utilities
- **Git:** commit messages `area: description` (`feat`, `fix`, `content`, `admin`, `blog`)

For coding conventions, architecture and agent rules, see [AGENTS.md](AGENTS.md) (also [CLAUDE.md](CLAUDE.md)). Every prompt the generator sends is written out in plain language in [docs/ai-prompts.md](docs/ai-prompts.md).
