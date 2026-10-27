# Wiring `provision.ts` into the repo

Two edits. Together they make a new site live from the admin Publish button with no rebuild.

---

## 1 · `src/content/resolve-rewrite.ts` — read the host map at runtime

Today:

```ts
import domainsJson from "../../content/_domains.json";
import cityKeys from "../../content/_cities.json";
```

Both inlined at build time, which is the only reason a new domain needs a redeploy. Replace with a Global Config read, keeping the JSON as a fallback:

```ts
import { get } from "@vercel/edge-config";          // package name survived the rename
import domainsJson from "../../content/_domains.json";
import cityKeysJson from "../../content/_cities.json";

export type DomainsIndex = { default: string; hosts: Record<string, string> };

/**
 * Global Config first, build-time JSON second. A Global Config outage degrades
 * to the last deployed map, never to nothing. Reads are <15ms P99 at the edge
 * and cached by Vercel's optimizations, so this costs nothing per request.
 */
export async function loadRouting(): Promise<{ domains: DomainsIndex; cityKeys: string[] }> {
  try {
    const [hosts, keys] = await Promise.all([
      get<Record<string, string>>("hosts"),
      get<string[]>("cityKeys"),
    ]);
    return {
      domains: { default: domainsJson.default, hosts: { ...domainsJson.hosts, ...(hosts ?? {}) } },
      cityKeys: [...new Set([...cityKeysJson, ...(keys ?? [])])],
    };
  } catch {
    return { domains: domainsJson as DomainsIndex, cityKeys: cityKeysJson };
  }
}
```

Then `rewriteFor()` (or whatever the pure function is called) takes `domains` and `cityKeys` as arguments rather than closing over the imports — it's already described as a pure function, so this is the natural shape. `proxy.ts` calls `loadRouting()` once per request and passes the result in.

**Merging rather than replacing** means Minneapolis keeps working from the JSON while every new city routes from Global Config. Nothing existing changes.

Env: `EDGE_CONFIG` connection string on the project (Vercel sets this automatically when you connect the store to the project in the dashboard).

**Test:** the existing pure-function tests still pass with the JSON passed in explicitly. Add one that passes a Global-Config-shaped map and confirms a host not in `_domains.json` routes.

---

## 2 · `src/content/drafts.ts` — `publishCity()` provisions

Today `publishCity(key, domain?)` accepts a domain the operator typed and writes it to `_domains.json`. It becomes:

```ts
import { provisionDomain, buildProvisioners } from '../pipeline/provision'

export async function publishCity(
  key: string,
  opts: { domain?: string; provisionDomain?: boolean } = {},
  log: (msg: string) => void = () => {}
): Promise<void> {
  assertKeyShape(key)
  const raw = await readFile(cityPath(key), 'utf-8')
  const doc = validateCityContent(JSON.parse(raw))

  let host: string | undefined = opts.domain?.toLowerCase().split(':')[0]

  if (opts.provisionDomain) {
    const { registrar, host: h, router } = buildProvisioners()
    const result = await provisionDomain(
      { cityKey: key, city: doc.city, state: doc.state },
      registrar, h, router, log
    )
    host = result.domain
    doc.provisioning = result.live ? undefined : { since: new Date().toISOString(), domain: result.domain }
  } else if (host !== undefined) {
    // Operator supplied a domain they already own — route it, don't buy it.
    const { router } = buildProvisioners()
    await router.setHost(host, key)
    await router.addCityKey(key)
  }

  doc.status = 'live'
  if (host) doc.domain = host
  await writeFile(cityPath(key), JSON.stringify(doc, null, 2), 'utf-8')

  // _domains.json is no longer written here. It stays as the deploy-time
  // fallback and is only edited by hand when you want to bake a host in.

  revalidateCity(key)
  await rm(draftPath(key), { force: true })
  await rm(progressPath(key), { force: true })
}
```

**The `provisioning` state** matters. If DNS/TLS hasn't confirmed within the timeout, the site is still routed and still live from Vercel's side — it just hasn't been observed as `misconfigured: false` yet. Mark it, show it in the admin, and give it a retry that re-runs `provisionDomain()` (which is idempotent end to end) rather than failing the publish.

Add `provisioning?: { since: string; domain: string }` to `CityContent` and `validate.ts`.

**Progress:** thread `log` into `appendProgress` so the publish screen shows "buying ivycleanskaty.com at $9.73 → attached → A @ → CNAME www → waiting for DNS… → live" the same way the generation stages do.

---

## 3 · Admin

The publish box (`review/[key]/publish-box.tsx`) currently has a domain text field. Add a toggle: **"Buy and configure a domain automatically"** — default on for new cities. When on, the field is read-only and shows the chosen domain once provisioning returns.

Keep the manual field. Minneapolis and any domain you already own go through it.

---

## 4 · Env

```bash
# Registrar — Porkbun
PORKBUN_API_KEY=
PORKBUN_SECRET_KEY=

# Host — Vercel (Pro plan required: Hobby caps at 50 domains/project)
VERCEL_TOKEN=
VERCEL_PROJECT_ID=
VERCEL_TEAM_ID=          # if the project is on a team

# Router — Global Config
GLOBAL_CONFIG_ID=        # from POST /v1/global-config, or the dashboard
EDGE_CONFIG=             # connection string; Vercel sets it when the store is connected to the project

# STUB_MODEL=1 stubs all three — full flow, no spend
```

---

## 5 · Verify before it runs unattended

1. `STUB_MODEL=1` — publish a test city end to end. Confirms the wiring.
2. **One real domain, watched.** Publish one real city with `provisionDomain: true` and follow the progress line through to `live`. Then load it in a browser. This is the moment the Porkbun `create` body shape, the Vercel CNAME target, and the Global Config read all prove out together.
3. Re-publish the same city. Confirms idempotency on live accounts — no second domain, no duplicate DNS.
4. Run the recovery drill once (domain-automation.md) on that same test domain.

Then it can run in a loop.
