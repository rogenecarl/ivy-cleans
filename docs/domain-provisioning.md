# Domains — buying, pointing and routing

Task 9. What runs today, what you have to do once by hand, and why the
registrar is deliberately not the host.

---

## You buy the first domain yourself, and there is no way around it

**Porkbun locks its registration API until the account has already bought one
domain through the website.** So the first purchase is manual whether or not
any of this exists. Everything below assumes you have done that.

---

## One-time setup

**Porkbun**

1. Create the account; verify email and phone.
2. **Buy one domain through the UI.** This is what unlocks the API.
3. Generate API keys at `porkbun.com/account/api`.
4. Load a prepaid balance. **This is your real spend cap** — load $300 and the
   system physically cannot buy more than about 25 domains, no matter what a
   bug does. A software limit can be bypassed by a bug; a balance cannot.

**Vercel**

5. Confirm the team is on **Pro**. Hobby caps at 50 custom domains per
   project, and this is one project serving every city.
6. Create an API token scoped to the team; note the project and team IDs.
7. Create a Global Config store and connect it to the project. Vercel sets
   `EDGE_CONFIG` automatically when you connect it.

**Then check all of it without spending anything:**

```bash
node scripts/provision-probe.mjs
```

It verifies both sets of credentials, confirms the plan is Pro, and confirms
Porkbun's API registration is actually unlocked.

---

## Environment

```bash
# Registrar — Porkbun
PORKBUN_API_KEY=
PORKBUN_SECRET_KEY=

# Host — Vercel (Pro required)
VERCEL_TOKEN=
VERCEL_PROJECT_ID=
VERCEL_TEAM_ID=          # if the project belongs to a team

# Router — Global Config
GLOBAL_CONFIG_ID=        # from the dashboard, or POST /v1/global-config
EDGE_CONFIG=             # connection string; Vercel sets this for you

# STUB_MODEL=1 stubs the registrar, the host AND the router — the whole flow
# runs with no network and no spend.
```

**Every one of these is optional.** With none set, publishing behaves exactly
as it did before task 9: you type a domain you already own, it is written to
`content/_domains.json`, and the app needs a redeploy for it to route.

---

## What happens when you publish

```
Publish  ─┬─ "Buy and configure a domain automatically" OFF (the default)
          │     the domain you typed is written to _domains.json,
          │     and pushed to Global Config if one is configured
          │
          └─ ON
                1  pick     first available candidate for the city
                2  buy      Porkbun, at the price just quoted
                3  attach   to the Vercel project
                4  read     the A and CNAME values Vercel wants
                5  write    both records at Porkbun
                6  route    host → city, in Global Config
                7  live     status flips; `provisioning` records that DNS
                            and TLS have not been observed answering yet
```

Then the review screen polls every 20 seconds until the domain answers.

**Step 4 is not optional and must never be hardcoded.** The CNAME target is
project-specific and the IPv4 can change; `provisionDomain` asks Vercel what
it wants for this domain on this project and writes exactly that.

---

## Why publishing does not wait for DNS

DNS propagation plus TLS issuance takes minutes. Publish is reached through a
server action, and a serverless function is killed long before that — the same
constraint that forced the suburb stage into one request per area.

So provisioning routes the domain and returns. `doc.provisioning` records that
it is routed but unconfirmed, and the browser polls `checkProvisioningAction`,
where minutes cost nothing. The site is live from Vercel's side either way;
what is pending is only the confirmation.

**This is a deliberate departure** from `docs/ivy-cleans-handsoff/patches/provision-wiring.md`,
which polls inside `publishCity` for up to ten minutes.

---

## Why the registrar is not Vercel

**Domains are the durable asset. Hosting is fungible.**

If Vercel ever suspends the project, every domain and its authoritative DNS is
still yours at Porkbun, and recovery is two DNS records per domain pointed at
a new deployment — a script that runs in an hour. Register through Vercel and
a suspension takes the domains with it.

Honestly stated: **this does not reduce the chance of a review. It reduces the
cost of one.**

---

## The rebuild problem this solves

`src/content/resolve-rewrite.ts` imports `_domains.json` and `_cities.json`
statically, because the proxy runs before any route renders and must be
deployable to a CDN edge. That single import was **the only thing in the whole
pipeline forcing a rebuild** — city content is already Blob-backed.

`loadRouting()` now reads the host map from Global Config at request time,
**merged over** the deployed JSON, and never throws:

- Global Config unreachable → the last deployed map, never nothing.
- `EDGE_CONFIG` unset → the JSON, with no import and no request made at all.
- Minneapolis keeps routing from the JSON while new cities route from the
  store.

---

## Before it runs unattended

1. `STUB_MODEL=1` — publish a test city end to end. Proves the wiring.
2. **One real domain, watched.** Publish one real city with the toggle on and
   follow it through to answering in a browser. This is where the Porkbun
   `create` body, the Vercel CNAME target and the Global Config read all prove
   out together for the first time.
3. Re-publish the same city. Proves idempotency on live accounts — no second
   domain, no duplicate DNS records.
4. Run the recovery drill once, on that same domain
   (`docs/ivy-cleans-handsoff/domain-automation.md`).

`tests/provision.test.ts` proves the order and the idempotency against fakes.
It cannot prove Porkbun and Vercel behave as their documentation says. Only
step 2 does.
