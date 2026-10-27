# Task 8 — OpenSEO at portfolio scale

Separate from the seven code changes. Nothing in the `ivy-cleans` repo depends on it, and it can run in parallel or go to someone else.

**Repo:** https://github.com/every-app/open-seo · MIT

---

## What it's for

Self-hostable DataForSEO frontend: web UI, an MCP server with ~45 tools, 9 agent skills. It replaces the Ahrefs subscription.

At one or two sites it's a research tool. **At 100 sites it's the instrument that makes the kill rule executable** — without per-site impression data there is no way to decide what to cut, and the portfolio strategy collapses into guessing.

**It does not touch the build pipeline.** `keywords.ts` from change 2 calls DataForSEO directly, in-process, per city build. OpenSEO is a separate consumer of the same DataForSEO account.

```
DataForSEO account
├── keywords.ts   → in the generator, per build
└── OpenSEO       → measurement + research, driven by a human or an agent
```

---

## It scales to 100. Here's what I verified in their schema

| Concern | Finding |
|---|---|
| Project count | `projects` is org-scoped with no cap. 100 projects is structurally fine |
| **Kill rule** | Projects soft-delete via `archivedAt` — *"archived projects are hidden everywhere but their data is preserved."* That's exactly what killing a site should do |
| Search Console | `uniqueIndex("gsc_connections_project_idx")` — **one property per project.** 100 sites = 100 connections, but they share `connectedByUserId`, so one Google account with 100 verified properties works |
| Rank tracking | Per project, with `scheduleInterval` (daily/weekly/monthly/manual) and `serpDepth` |
| **Local rank tracking** | `rankTrackingConfigs.locationName` — when set, tracking is local rather than national. Map-pack position per site, which is the number that matters for a service business |
| Cohort tagging | `projectContextSections` is `(projectId, key) → content`, free-form. Store the cohort there |
| Scriptable | MCP at **`POST /mcp`**, auth via `x-api-key` header or `Authorization: Bearer`. Bulk provisioning is a script, not 100 rounds of clicking |

---

## Cost, self-hosted

From their own model in `src/shared/rank-tracking.ts` — queued SERP at $0.0006 base + $0.00045 per extra page. Self-hosted means no 28% markup.

| Scenario | Monthly | Yearly |
|---|---|---|
| 100 sites × 10 keywords, weekly, depth 20 | **$4.20** | $50 |
| 100 sites × 10 keywords, **monthly** | $1.05 | $13 |
| 100 sites × 20 keywords, weekly | $8.40 | $109 |
| 100 sites × 10 keywords, weekly, depth 100 | $18.60 | $242 |
| 3×3 local rank grid × 100 markets, one-off | **$0.94** | — |

Measurement is effectively free at this scale. Track weekly, not monthly — the extra $3/month buys four times the resolution on the kill decision.

---

## Setup

Docker is the fast path (`docs/SELF_HOSTING_DOCKER.md`). Cloudflare (`docs/SELF_HOSTING_CLOUDFLARE.md`) if it needs to be reachable from more than one machine; works on the free plan.

```bash
DATAFORSEO_API_KEY=        # same account the pipeline uses
AUTH_MODE=local_noauth     # local trusted mode, injects admin@localhost
PORT=3001

# Required for Search Console — which is the whole point at portfolio scale.
# BETTER_AUTH_SECRET encrypts the stored OAuth tokens.
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
BETTER_AUTH_SECRET=        # 32+ chars

# Only for their in-app agent. Not needed for MCP use.
# OPENROUTER_API_KEY=
```

Then install the MCP (`docs/mcp.md`) so the tools are usable from an agent, not just the UI.

---

## Provisioning 100 projects

`scripts/openseo-provision.mjs` in this package. Reads a markets file, and per market: creates the project, tags its cohort, creates a rank tracker, adds keywords. Idempotent — re-running skips what exists.

```bash
OPENSEO_URL=http://localhost:3001 \
OPENSEO_API_KEY=... \
node scripts/openseo-provision.mjs markets.json --dry-run

# then for real
node scripts/openseo-provision.mjs markets.json
```

`markets.json` shape:

```json
[
  { "city": "Katy", "state": "TX", "domain": "ivycleanskaty.com", "cohort": "A-control" },
  { "city": "Sugar Land", "state": "TX", "domain": "ivycleanssugarland.com", "cohort": "D-gbp" }
]
```

**Caveat:** I wrote this against their schema and route definitions but could not run it against a live instance. The MCP initialize handshake and the exact argument names for `create_project` / `create_rank_tracker` should be checked against one manual call before running it across 100 markets. Use `--dry-run` first; it prints every call it would make without sending any.

### The actual bottleneck: Search Console

Project creation scripts. **GSC connection does not.** One property per project, each needing an OAuth selection through the UI. 100 sites means 100 manual connections.

Two things make that survivable:

1. **Verify the domains in Search Console first**, in bulk, via DNS TXT records at the registrar. Domain properties (`sc-domain:example.com`) are one DNS record each and can be scripted at most registrars' APIs.
2. **Connect them in OpenSEO as sites launch**, not all at once. If launches are staggered 10–15 per week over eight weeks — which they should be — this is fifteen minutes a week, not a lost day.

Do not skip this. GSC impressions are the kill-rule metric; a site without a connected property is a site you cannot judge.

---

## The kill rule, as a query

Written down before launch, or it won't be enforced.

| Checkpoint | Healthy | Watch | **Kill** |
|---|---|---|---|
| Month 3 | >500 impr/mo | 100–500 | <100, or not indexed |
| Month 6 | >2,000 impr/mo | 500–2,000 | **<300** |
| Month 9 | >4,000 impr/mo + first leads | 1,000–4,000 | <1,000 |

Run `get_search_console_performance` per project monthly, dump to one sheet, sort ascending. Kill = archive the project in OpenSEO (`archivedAt` preserves the data) and let the domain lapse.

**Never 301 dead sites into survivors.** Fifty redirects converging on one domain is a link scheme, and it takes the survivor with it.

**Do not kill before month 6.** New domains need 4–8 months. Month 3 is an *indexation* check only — anything not indexed by then has a technical problem, which is usually fixable and not a reason to cut.

---

## Verify before cancelling Ahrefs

Run `get_backlinks_overview` on a domain whose backlink profile you already know. DataForSEO's index is not Ahrefs-grade. If the numbers are wildly off, say so and keep Ahrefs another month.

---

## One pattern from their code worth copying

From their `local-seo` skill:

> *"Before spending credits, check the research log. If the same research ran within the last 30 days, reuse that result and say so instead of re-buying it."*

Backed by `projectResearchLog` — a per-project append-only log every agent session reads and writes.

Same discipline as the keyword sidecar cache in `change-2-wiring.md`, generalised. At 100 markets, re-buying research you already have is the easiest money to waste.
