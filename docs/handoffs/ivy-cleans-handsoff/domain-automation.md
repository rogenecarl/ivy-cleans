# Task 9 — autonomous domain purchase and hosting

Market approved → domain bought, DNS set, SSL issued, site routing — with no human step and no redeploy.

Search Console is out of scope for now. This is purchase + hosting only.

---

## The principle

**Domains are the durable asset. Hosting is fungible.**

The ToS risk you're worried about is real, but the answer isn't to avoid Vercel — it's to make Vercel *replaceable*. If the registrar and authoritative DNS live somewhere Vercel can't touch, a Vercel suspension costs you a DNS change and a redeploy elsewhere, not 100 domains. Recovery becomes a script that runs in an hour.

So the registrar is **not** Vercel. It's Porkbun, and DNS stays there too.

```
Porkbun          registrar + authoritative DNS      ← you own these
   │
   │  A @   → Vercel's IP for the project
   │  CNAME www → Vercel's CNAME for the project
   ▼
Vercel Pro       one multi-tenant project           ← replaceable
   │
   ▼
Global Config    host → city map, read at the edge  ← no rebuild
```

---

## What I verified

| Fact | Source | Why it matters |
|---|---|---|
| Porkbun supports registration by API: `POST /domain/create/{domain}` with `cost` (pennies) + `agreeToTerms` | Porkbun API v3 | Buying is scriptable |
| Porkbun API registration requires **one prior manual registration** on the account, verified email/phone, and a **prepaid balance** | Porkbun docs | One-time setup; the balance is the spend cap |
| Porkbun DNS: `POST /dns/create/{domain}` | Porkbun API v3 | DNS stays at the registrar, scriptable |
| Vercel Pro: **unlimited custom domains per project**, soft cap 100,000. Hobby: **50** | Vercel multi-tenant limits | Must be on Pro |
| Vercel rate limit: **100 domain additions per hour per team** | Same | Fine at 10–15 a week |
| `GET /v6/domains/{d}/config?projectIdOrName=…` returns `recommendedIPv4` and `recommendedCNAME` with rank, plus `misconfigured` | Vercel API | **Read the DNS values, don't hardcode them** — CNAME targets are project-specific now |
| `misconfigured: false` means "configured AND we can issue TLS" | Same | The one poll that confirms the site is live |
| Global Config (formerly Edge Config): readable from middleware at <15ms P99, written via `PATCH /v1/global-config/{id}/items`, **no redeploy** | Vercel docs | Kills the build-time constant |
| City content is already Blob-backed when `BLOB_READ_WRITE_TOKEN` is set | `src/content/store.ts` | Content never needed a rebuild — only the host map did |

That last row is the key finding. **The only thing in the whole pipeline that forces a rebuild is `_domains.json`.** Move it to Global Config and a new site is live the moment `publishCity()` returns.

---

## The one code change that unlocks autonomy

`src/content/resolve-rewrite.ts` currently:

```ts
import domainsJson from "../../content/_domains.json";   // inlined at build
```

Becomes a Global Config read in the proxy:

```ts
import { get } from "@vercel/edge-config";   // package name unchanged after the rename

const hosts = (await get<Record<string, string>>("hosts")) ?? {};
const cityKeys = (await get<string[]>("cityKeys")) ?? [];
```

Their own comment explains why it was inlined: *"Proxy runs before routes are rendered and is meant to be deployable to a CDN edge."* Global Config exists precisely for that constraint — Vercel's own docs list "critical redirects without redeploying" as the canonical use case, read from middleware.

Keep `_domains.json` as the **fallback** if the Global Config read fails, so a Global Config outage degrades to the last deployed map rather than to nothing.

`publishCity()` then writes the host map with one PATCH instead of a file write. Everything else in that function stays.

---

## The flow, per site

`publishCity(key, { provisionDomain: true })` becomes the orchestrator:

| # | Step | Call | Idempotent because |
|---|---|---|---|
| 1 | Pick a name | `POST /domain/checkDomain/{d}` per candidate, first `avail: "yes"` | Skips if the city already has a domain |
| 2 | **Buy** | `POST /domain/create/{d}` with `cost` from step 1 | `cost` must match or Porkbun rejects |
| 3 | Attach to Vercel | `POST /v10/projects/{id}/domains` | 409 if already attached — treat as success |
| 4 | Get the DNS targets | `GET /v6/domains/{d}/config?projectIdOrName=…` | Read-only |
| 5 | Set DNS at Porkbun | `POST /dns/create/{d}` × 2 — A `@`, CNAME `www` | Checks `dns/retrieve` first |
| 6 | Wait for live | Poll step 4 until `misconfigured: false` | Read-only |
| 7 | Route it | `PATCH /v1/global-config/{id}/items` upsert `hosts[d] = key` | Upsert |
| 8 | Mark live | `doc.status = 'live'`, `doc.domain = d` | Existing code |

Step 6 is usually minutes — Porkbun DNS propagates fast and Vercel's config check runs on demand. Budget ten minutes with a timeout, and if it times out, leave the site in a `provisioning` state the admin can retry rather than failing the whole publish.

**No rebuild anywhere in that list.**

---

## Safety

**The Porkbun prepaid balance is the spend cap.** Load $300 and the system physically cannot buy more than ~25 domains. That's a better guard than any software limit — it can't be bypassed by a bug. Top up per wave.

**`cost` mismatch fails the purchase.** The price from `checkDomain` is passed to `create`; if it changed in between, Porkbun rejects it.

**Stub clients for every provider**, same pattern as `ModelClient` and `KeywordClient`. `STUB_MODEL=1` should run the entire provisioning flow without touching Porkbun, Vercel, or Global Config.

**A `--max-domain` cap** (default $25) rejects premium-priced names so a typo in the candidate ladder doesn't buy a $3,000 domain.

---

## One-time setup

**Porkbun**
1. Create the account, verify email and phone
2. **Buy one domain manually through the UI** — API registration is locked until the account has a prior registration
3. Generate API keys at `porkbun.com/account/api`
4. Load a prepaid balance
5. `POST /ping` with the keys — confirms credentials

**Vercel**
1. Confirm the team is on **Pro** — Hobby caps at 50 domains per project
2. API token scoped to the team
3. Create a Global Config: `POST /v1/global-config` with `{ "slug": "ivy-hosts" }`; connect it to the project
4. Note the project ID, team ID, and Global Config ID

**Repo**
1. The `resolve-rewrite.ts` change above
2. `provision.ts` from this package, wired into `publishCity`

---

## The recovery runbook — test it once, before wave two

This is the actual ToS insurance. Don't just have it; run it.

1. Deploy the same repo to a second host — a second Vercel account, or Cloudflare Pages
2. Script: for every domain in Porkbun, update the A and CNAME records to the new host's targets
3. Point the Global Config read at the new deployment (or keep the map at Porkbun-side JSON as a second fallback)

Time to recover: **under an hour** for 100 domains. Run it on one test domain before you launch wave two, so if the day comes it's a rehearsed script and not a panic.

---

## Does this actually reduce ToS risk?

Honestly: **it doesn't reduce the probability of a review. It reduces the cost of one.**

100 near-identical sites on one Vercel project might attract a look. Nothing about the registrar choice changes that. What changes is that a suspension no longer takes the domains with it — and domains are the only part of this that took months to earn value.

The things that *do* reduce the probability are the ones in the portfolio playbook: no interlinking, genuinely different content per site, staggered launches, and — the one that matters most to a hosting provider's abuse team — sites that look like a real business with real contact details, not a farm.

---

## Effort

| Piece | Time |
|---|---|
| Global Config read in `resolve-rewrite.ts` + fallback | 2 hours |
| `provision.ts` — Porkbun, Vercel, Global Config clients + stubs | half day |
| Wire into `publishCity` + admin state for `provisioning` / retry | half day |
| One-time account setup | 1 hour |
| Buy one domain end to end, watched | 1 hour |
| Recovery runbook, rehearsed once | 2 hours |

About two days. After that, a new market is: approve → generate → review → **Publish**, and it's live on its own domain with SSL before you've closed the tab.
