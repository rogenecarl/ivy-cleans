// src/pipeline/provision.ts
/*
 * Domain purchase + hosting, autonomous. Called from publishCity().
 *
 * Three providers behind three seams, each with a real client and a stub, the
 * same shape as ModelClient and KeywordClient. STUB_MODEL=1 runs the whole
 * flow with no network and no spend.
 *
 *   Registrar   Porkbun    owns the domain and the authoritative DNS
 *   Host        Vercel     one multi-tenant project; verifies via DNS
 *   Router      Global Config   host -> city map, read by the proxy at the edge
 *
 * The registrar is deliberately NOT the host. If Vercel suspends the project,
 * every domain and its DNS is still yours at Porkbun, and recovery is two DNS
 * records per domain pointed at a new deployment. See domain-automation.md.
 *
 * Endpoint paths were verified against Porkbun API v3 and Vercel's REST docs.
 * Not yet run end to end against live accounts — buy ONE domain with this,
 * watched, before it runs unattended.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────────── */

export interface Registrar {
  /** null if unavailable; price in USD if available. */
  check(domain: string): Promise<{ available: boolean; priceUsd: number | null }>
  /** Buys. `priceUsd` must match what check() returned or the registrar rejects. */
  register(domain: string, priceUsd: number): Promise<{ orderId: string }>
  listRecords(domain: string): Promise<Array<{ name: string; type: string; content: string }>>
  createRecord(domain: string, rec: { name: string; type: string; content: string; ttl?: number }): Promise<void>
  ownsDomain(domain: string): Promise<boolean>
}

export interface Host {
  attach(domain: string): Promise<{ alreadyAttached: boolean }>
  /** DNS values Vercel wants for this domain on this project, and whether it's live. */
  config(domain: string): Promise<{ ipv4: string | null; cname: string | null; live: boolean }>
}

export interface Router {
  setHost(domain: string, cityKey: string): Promise<void>
  addCityKey(cityKey: string): Promise<void>
}

export interface ProvisionInput {
  cityKey: string
  city: string
  state: string
  /** Reject any domain priced above this. Guards against premium names. */
  maxPriceUsd?: number
  /** Override the candidate ladder. */
  candidates?: string[]
  /** How long to wait for DNS + TLS before giving up. */
  liveTimeoutMs?: number
}

export interface ProvisionResult {
  domain: string
  orderId: string | null
  priceUsd: number
  /** true = misconfigured:false was observed; false = timed out, still provisioning. */
  live: boolean
}

/* ────────────────────────────────────────────────────────────────────────────
 * Candidates
 * ──────────────────────────────────────────────────────────────────────────── */

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * Preference order. First available wins.
 *
 * Deliberately mixed rather than one fixed pattern: a hundred domains all
 * built as ivycleans{city}.com is a visible shape. Rotating the ladder per
 * city costs nothing.
 */
export function defaultCandidates(city: string, state: string): string[] {
  const c = slug(city)
  const st = state.toLowerCase()
  const ladders = [
    [`ivycleans${c}.com`, `${c}ivycleans.com`, `ivycleans${c}${st}.com`],
    [`${c}ivycleans.com`, `ivycleans${c}.com`, `ivyclean${c}.com`],
    [`ivycleans${c}${st}.com`, `ivycleans${c}.com`, `${c}ivycleans.com`],
  ]
  // Stable pick per city so re-runs produce the same ladder.
  let h = 0
  for (let i = 0; i < c.length; i++) h = (h * 31 + c.charCodeAt(i)) >>> 0
  return ladders[h % ladders.length]
}

/* ────────────────────────────────────────────────────────────────────────────
 * The orchestrator
 * ──────────────────────────────────────────────────────────────────────────── */

export async function provisionDomain(
  input: ProvisionInput,
  registrar: Registrar,
  host: Host,
  router: Router,
  log: (msg: string) => void = () => {}
): Promise<ProvisionResult> {
  const maxPrice = input.maxPriceUsd ?? 25
  const timeout = input.liveTimeoutMs ?? 10 * 60 * 1000
  const names = input.candidates ?? defaultCandidates(input.city, input.state)

  // 1 · pick. If we already own one of the candidates, reuse it — a re-run
  //     after a partial failure must not buy a second domain for the same city.
  let domain: string | null = null
  let price = 0
  let orderId: string | null = null

  for (const n of names) {
    if (await registrar.ownsDomain(n)) {
      domain = n
      log(`already own ${n} — reusing`)
      break
    }
  }

  if (!domain) {
    for (const n of names) {
      const r = await registrar.check(n)
      if (!r.available || r.priceUsd == null) continue
      if (r.priceUsd > maxPrice) {
        log(`${n} available at $${r.priceUsd} — over the $${maxPrice} cap, skipping`)
        continue
      }
      domain = n
      price = r.priceUsd
      break
    }
    if (!domain) throw new Error(`no candidate available under $${maxPrice}: ${names.join(', ')}`)

    // 2 · buy. Price must match check() or the registrar rejects — that is the
    //     guard against a price change between the two calls.
    log(`buying ${domain} at $${price}`)
    const order = await registrar.register(domain, price)
    orderId = order.orderId
    log(`order ${orderId}`)
  }

  // 3 · attach to the host. 409 "already exists" is success on a re-run.
  const att = await host.attach(domain)
  log(att.alreadyAttached ? `${domain} already attached` : `${domain} attached to project`)

  // 4 · ask the host what DNS it wants. Never hardcode — the CNAME target is
  //     project-specific and the IPv4 can change.
  const cfg = await host.config(domain)
  if (!cfg.ipv4 && !cfg.cname) {
    throw new Error(`host returned no recommended DNS for ${domain}`)
  }

  // 5 · set DNS at the registrar, idempotently.
  const existing = await registrar.listRecords(domain)
  const has = (name: string, type: string) =>
    existing.some((r) => r.type === type && (r.name === name || r.name === `${name}.${domain}`.replace(/^\./, '')))

  if (cfg.ipv4 && !has('', 'A') && !has(domain, 'A')) {
    await registrar.createRecord(domain, { name: '', type: 'A', content: cfg.ipv4, ttl: 600 })
    log(`A @ → ${cfg.ipv4}`)
  }
  if (cfg.cname && !has('www', 'CNAME')) {
    await registrar.createRecord(domain, { name: 'www', type: 'CNAME', content: cfg.cname, ttl: 600 })
    log(`CNAME www → ${cfg.cname}`)
  }

  // 6 · wait for live — "configured AND we can issue TLS".
  const started = Date.now()
  let live = cfg.live
  while (!live && Date.now() - started < timeout) {
    await new Promise((r) => setTimeout(r, 20_000))
    live = (await host.config(domain)).live
    log(live ? `${domain} is live` : `waiting for DNS/TLS…`)
  }

  // 7 · route it. Upsert, so a re-run is harmless. Done even if step 6 timed
  //     out — the map should be correct the moment DNS finishes propagating.
  await router.setHost(domain, input.cityKey)
  await router.addCityKey(input.cityKey)
  log(`routed ${domain} → ${input.cityKey}`)

  return { domain, orderId, priceUsd: price, live }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Porkbun
 * ──────────────────────────────────────────────────────────────────────────── */

const PB = 'https://api.porkbun.com/api/json/v3'

export class PorkbunRegistrar implements Registrar {
  constructor(private readonly apikey: string, private readonly secretapikey: string) {
    if (!apikey || !secretapikey) throw new Error('PorkbunRegistrar: PORKBUN_API_KEY and PORKBUN_SECRET_KEY are required')
  }

  static fromEnv(): PorkbunRegistrar | null {
    const k = process.env.PORKBUN_API_KEY
    const s = process.env.PORKBUN_SECRET_KEY
    return k && s ? new PorkbunRegistrar(k, s) : null
  }

  private async post(path: string, body: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const res = await fetch(`${PB}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apikey: this.apikey, secretapikey: this.secretapikey, ...body }),
    })
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok || json.status !== 'SUCCESS') {
      throw new Error(`Porkbun ${path}: ${json.message ?? res.statusText}`)
    }
    return json
  }

  async check(domain: string) {
    const r = await this.post(`/domain/checkDomain/${domain}`)
    const resp = (r.response ?? r) as { avail?: string; price?: string | number }
    const available = resp.avail === 'yes'
    const priceUsd = resp.price == null ? null : Number(resp.price)
    return { available, priceUsd: Number.isFinite(priceUsd as number) ? (priceUsd as number) : null }
  }

  async register(domain: string, priceUsd: number) {
    // Porkbun takes the cost in PENNIES and requires explicit terms agreement.
    const r = await this.post(`/domain/create/${domain}`, {
      cost: Math.round(priceUsd * 100),
      agreeToTerms: 'yes',
    })
    return { orderId: String(r.orderId ?? '') }
  }

  async listRecords(domain: string) {
    const r = await this.post(`/dns/retrieve/${domain}`)
    const recs = (r.records ?? []) as Array<{ name: string; type: string; content: string }>
    return recs.map((x) => ({ name: x.name, type: x.type, content: x.content }))
  }

  async createRecord(domain: string, rec: { name: string; type: string; content: string; ttl?: number }) {
    await this.post(`/dns/create/${domain}`, { name: rec.name, type: rec.type, content: rec.content, ttl: rec.ttl ?? 600 })
  }

  async ownsDomain(domain: string) {
    // /domain/listAll is paginated; for a portfolio this size one page is fine.
    // Fall back to "not owned" on any error so a listing hiccup can't block a purchase.
    try {
      const r = await this.post('/domain/listAll', { start: 0 })
      const domains = (r.domains ?? []) as Array<{ domain: string }>
      return domains.some((d) => d.domain.toLowerCase() === domain.toLowerCase())
    } catch {
      return false
    }
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Vercel host
 * ──────────────────────────────────────────────────────────────────────────── */

const VC = 'https://api.vercel.com'

export class VercelHost implements Host {
  constructor(
    private readonly token: string,
    private readonly projectId: string,
    private readonly teamId?: string
  ) {
    if (!token || !projectId) throw new Error('VercelHost: VERCEL_TOKEN and VERCEL_PROJECT_ID are required')
  }

  static fromEnv(): VercelHost | null {
    const t = process.env.VERCEL_TOKEN
    const p = process.env.VERCEL_PROJECT_ID
    return t && p ? new VercelHost(t, p, process.env.VERCEL_TEAM_ID) : null
  }

  private q(extra = '') {
    const parts = [this.teamId ? `teamId=${this.teamId}` : '', extra].filter(Boolean)
    return parts.length ? `?${parts.join('&')}` : ''
  }

  private async call(path: string, init: RequestInit = {}): Promise<{ status: number; body: Record<string, unknown> }> {
    const res = await fetch(`${VC}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    })
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    return { status: res.status, body }
  }

  async attach(domain: string) {
    const r = await this.call(`/v10/projects/${this.projectId}/domains${this.q()}`, {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    })
    if (r.status === 409) return { alreadyAttached: true }
    if (r.status >= 400) {
      const err = r.body.error as { message?: string } | undefined
      throw new Error(`Vercel attach ${domain}: ${r.status} ${err?.message ?? ''}`)
    }
    return { alreadyAttached: false }
  }

  async config(domain: string) {
    const r = await this.call(`/v6/domains/${domain}/config${this.q(`projectIdOrName=${this.projectId}`)}`)
    if (r.status >= 400) {
      const err = r.body.error as { message?: string } | undefined
      throw new Error(`Vercel config ${domain}: ${r.status} ${err?.message ?? ''}`)
    }
    const ipv4s = (r.body.recommendedIPv4 ?? []) as Array<{ rank: number; value: string[] }>
    const cnames = (r.body.recommendedCNAME ?? []) as Array<{ rank: number; value: string }>
    const best = <T extends { rank: number }>(xs: T[]) => [...xs].sort((a, b) => a.rank - b.rank)[0]
    return {
      ipv4: best(ipv4s)?.value?.[0] ?? null,
      cname: best(cnames)?.value ?? null,
      live: r.body.misconfigured === false,
    }
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Global Config router
 * ──────────────────────────────────────────────────────────────────────────── */

export class GlobalConfigRouter implements Router {
  constructor(
    private readonly token: string,
    private readonly configId: string,
    private readonly teamId?: string
  ) {
    if (!token || !configId) throw new Error('GlobalConfigRouter: VERCEL_TOKEN and GLOBAL_CONFIG_ID are required')
  }

  static fromEnv(): GlobalConfigRouter | null {
    const t = process.env.VERCEL_TOKEN
    const c = process.env.GLOBAL_CONFIG_ID
    return t && c ? new GlobalConfigRouter(t, c, process.env.VERCEL_TEAM_ID) : null
  }

  private async read(): Promise<{ hosts: Record<string, string>; cityKeys: string[] }> {
    const q = this.teamId ? `?teamId=${this.teamId}` : ''
    const res = await fetch(`${VC}/v1/global-config/${this.configId}/items${q}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    })
    const items = (await res.json().catch(() => ({}))) as Record<string, unknown>
    return {
      hosts: (items.hosts as Record<string, string>) ?? {},
      cityKeys: (items.cityKeys as string[]) ?? [],
    }
  }

  private async patch(items: Array<{ operation: 'upsert'; key: string; value: unknown }>) {
    const q = this.teamId ? `?teamId=${this.teamId}` : ''
    const res = await fetch(`${VC}/v1/global-config/${this.configId}/items${q}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      throw new Error(`Global Config PATCH: ${res.status} ${body.error?.message ?? ''}`)
    }
  }

  // The map is one key holding an object, so a write is read-modify-write.
  // Concurrent publishes are rare enough that this is fine; if it ever isn't,
  // key each host separately (host:{domain} = cityKey) and drop the read.
  async setHost(domain: string, cityKey: string) {
    const cur = await this.read()
    cur.hosts[domain.toLowerCase()] = cityKey
    await this.patch([{ operation: 'upsert', key: 'hosts', value: cur.hosts }])
  }

  async addCityKey(cityKey: string) {
    const cur = await this.read()
    if (cur.cityKeys.includes(cityKey)) return
    await this.patch([{ operation: 'upsert', key: 'cityKeys', value: [...cur.cityKeys, cityKey] }])
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Stubs — STUB_MODEL=1 exercises the whole flow with no network and no spend
 * ──────────────────────────────────────────────────────────────────────────── */

export class StubRegistrar implements Registrar {
  owned = new Set<string>()
  records = new Map<string, Array<{ name: string; type: string; content: string }>>()
  async check(domain: string) {
    return { available: !domain.includes('taken'), priceUsd: 9.73 }
  }
  async register(domain: string) {
    this.owned.add(domain)
    return { orderId: `stub-${domain}` }
  }
  async listRecords(domain: string) {
    return this.records.get(domain) ?? []
  }
  async createRecord(domain: string, rec: { name: string; type: string; content: string }) {
    this.records.set(domain, [...(this.records.get(domain) ?? []), rec])
  }
  async ownsDomain(domain: string) {
    return this.owned.has(domain)
  }
}

export class StubHost implements Host {
  private polls = new Map<string, number>()
  async attach() {
    return { alreadyAttached: false }
  }
  async config(domain: string) {
    // Goes live on the second poll, so the wait loop is exercised.
    const n = (this.polls.get(domain) ?? 0) + 1
    this.polls.set(domain, n)
    return { ipv4: '76.76.21.21', cname: 'stub.vercel-dns.com', live: n >= 2 }
  }
}

export class StubRouter implements Router {
  hosts: Record<string, string> = {}
  cityKeys: string[] = []
  async setHost(domain: string, cityKey: string) {
    this.hosts[domain] = cityKey
  }
  async addCityKey(cityKey: string) {
    if (!this.cityKeys.includes(cityKey)) this.cityKeys.push(cityKey)
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Construction — mirror how ModelClient is built
 * ──────────────────────────────────────────────────────────────────────────── */

export function buildProvisioners(): { registrar: Registrar; host: Host; router: Router } {
  if (process.env.STUB_MODEL === '1') {
    return { registrar: new StubRegistrar(), host: new StubHost(), router: new StubRouter() }
  }
  const registrar = PorkbunRegistrar.fromEnv()
  const host = VercelHost.fromEnv()
  const router = GlobalConfigRouter.fromEnv()
  // Fail loudly, matching deriveFacts: a site that silently skipped buying its
  // domain is worse than an error the operator sees immediately.
  if (!registrar) throw new Error('provisioning: PORKBUN_API_KEY / PORKBUN_SECRET_KEY not set')
  if (!host) throw new Error('provisioning: VERCEL_TOKEN / VERCEL_PROJECT_ID not set')
  if (!router) throw new Error('provisioning: GLOBAL_CONFIG_ID not set')
  return { registrar, host, router }
}
