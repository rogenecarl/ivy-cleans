// tests/provision.test.ts
/*
 * Domain provisioning — task 9's orchestrator, against fakes.
 *
 * NOTHING HERE TOUCHES A REAL ACCOUNT. Every test drives the same Registrar /
 * Host / Router seams the real clients implement, so what is proven is the
 * ORDER and the IDEMPOTENCY: that a re-run after a partial failure does not
 * buy a second domain, that a price change between check and buy is refused,
 * and that DNS records are not duplicated.
 *
 * What these cannot prove is that Porkbun and Vercel behave as their docs say.
 * That needs one real domain bought and watched — see evals of a different
 * kind in docs/ivy-cleans-handsoff/domain-automation.md.
 */
import { describe, expect, it } from 'vitest'
import {
  defaultCandidates,
  provisionDomain,
  type Host,
  type Registrar,
  type Router,
} from '../src/pipeline/provision'

class FakeRegistrar implements Registrar {
  owned = new Set<string>()
  records = new Map<string, { name: string; type: string; content: string }[]>()
  registered: { domain: string; priceUsd: number }[] = []
  /** Domains that are unavailable, by name. */
  taken = new Set<string>()
  /** Per-domain price; anything absent is cheap. */
  prices = new Map<string, number>()

  async check(domain: string) {
    return {
      available: !this.taken.has(domain),
      priceUsd: this.prices.get(domain) ?? 9.73,
    }
  }
  async register(domain: string, priceUsd: number) {
    this.owned.add(domain)
    this.registered.push({ domain, priceUsd })
    return { orderId: `fake-${domain}` }
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

class FakeHost implements Host {
  attached: string[] = []
  alreadyAttached = false
  live = false
  configCalls = 0
  async attach(domain: string) {
    this.attached.push(domain)
    return { alreadyAttached: this.alreadyAttached }
  }
  async config() {
    this.configCalls += 1
    return { ipv4: '76.76.21.21', cname: 'proj.vercel-dns.com', live: this.live }
  }
}

class FakeRouter implements Router {
  hosts: Record<string, string> = {}
  cityKeys: string[] = []
  async setHost(domain: string, cityKey: string) {
    this.hosts[domain] = cityKey
  }
  async addCityKey(cityKey: string) {
    if (!this.cityKeys.includes(cityKey)) this.cityKeys.push(cityKey)
  }
}

function parts() {
  return { registrar: new FakeRegistrar(), host: new FakeHost(), router: new FakeRouter() }
}

const KATY = { cityKey: 'katy', city: 'Katy', state: 'TX' }

describe('defaultCandidates', () => {
  it('produces .com names built from the city, with no spaces or punctuation', () => {
    for (const name of defaultCandidates('Sugar Land', 'TX')) {
      expect(name).toMatch(/^[a-z0-9]+\.com$/)
      expect(name).toContain('sugarland')
    }
  })

  it('is stable for a city, so a re-run tries the same names in the same order', () => {
    // A re-run after a partial failure must not wander onto a different
    // candidate and buy a second domain for the same city.
    expect(defaultCandidates('Katy', 'TX')).toEqual(defaultCandidates('Katy', 'TX'))
  })

  it('does not give every city the same shape', () => {
    // A hundred domains all built as ivycleans{city}.com is a visible
    // pattern; the ladder rotates per city.
    const firsts = ['Katy', 'Pearland', 'Sugar Land', 'Memorial', 'Cypress', 'Bellaire'].map(
      (c) => defaultCandidates(c, 'TX')[0].replace(/[a-z]*cleans?/, '#'),
    )
    expect(new Set(firsts).size).toBeGreaterThan(1)
  })
})

describe('provisionDomain', () => {
  it('buys the first available candidate, attaches it, sets DNS and routes it', async () => {
    const { registrar, host, router } = parts()
    const result = await provisionDomain(KATY, registrar, host, router)

    expect(registrar.registered).toHaveLength(1)
    expect(result.domain).toBe(registrar.registered[0].domain)
    expect(host.attached).toEqual([result.domain])

    const records = registrar.records.get(result.domain)!
    expect(records.map((r) => `${r.type} ${r.name}`)).toEqual(['A ', 'CNAME www'])
    expect(records[0].content).toBe('76.76.21.21')
    expect(records[1].content).toBe('proj.vercel-dns.com')

    expect(router.hosts[result.domain]).toBe('katy')
    expect(router.cityKeys).toEqual(['katy'])
  })

  it('skips a candidate that is taken and buys the next one', async () => {
    const { registrar, host, router } = parts()
    const [first, second] = defaultCandidates('Katy', 'TX')
    registrar.taken.add(first)

    const result = await provisionDomain(KATY, registrar, host, router)
    expect(result.domain).toBe(second)
  })

  it('REUSES a candidate the account already owns instead of buying another', async () => {
    /*
     * The idempotency that matters most. A re-run after a partial failure —
     * bought, then the DNS call threw — must not buy a second domain for the
     * same city. Money, not just noise.
     */
    const { registrar, host, router } = parts()
    const [first] = defaultCandidates('Katy', 'TX')
    registrar.owned.add(first)

    const result = await provisionDomain(KATY, registrar, host, router)
    expect(result.domain).toBe(first)
    expect(registrar.registered).toHaveLength(0)
    expect(result.orderId).toBeNull()
    // and it still finishes the job it was interrupted during
    expect(router.hosts[first]).toBe('katy')
  })

  it('refuses a premium-priced name rather than buying it', async () => {
    const { registrar, host, router } = parts()
    const [first] = defaultCandidates('Katy', 'TX')
    registrar.prices.set(first, 3000)

    const result = await provisionDomain(KATY, registrar, host, router)
    expect(result.domain).not.toBe(first)
    expect(registrar.registered[0].priceUsd).toBeLessThanOrEqual(25)
  })

  it('throws rather than buying when every candidate is over the cap', async () => {
    const { registrar, host, router } = parts()
    for (const name of defaultCandidates('Katy', 'TX')) registrar.prices.set(name, 3000)

    await expect(provisionDomain({ ...KATY, maxPriceUsd: 25 }, registrar, host, router)).rejects.toThrow(
      /no candidate available under \$25/,
    )
    expect(registrar.registered).toHaveLength(0)
  })

  it('passes the checked price through to the purchase, so a change between the two is refused', async () => {
    // The registrar rejects a create whose cost does not match the quote.
    // That mismatch IS the guard, so the quoted number has to reach it.
    const { registrar, host, router } = parts()
    const [first] = defaultCandidates('Katy', 'TX')
    registrar.prices.set(first, 12.5)

    await provisionDomain(KATY, registrar, host, router)
    expect(registrar.registered[0]).toEqual({ domain: first, priceUsd: 12.5 })
  })

  it('treats an already-attached domain as success', async () => {
    const { registrar, host, router } = parts()
    host.alreadyAttached = true
    await expect(provisionDomain(KATY, registrar, host, router)).resolves.toBeTruthy()
  })

  it('does not write a DNS record that already exists', async () => {
    const { registrar, host, router } = parts()
    const [first] = defaultCandidates('Katy', 'TX')
    registrar.owned.add(first)
    registrar.records.set(first, [
      { name: '', type: 'A', content: '76.76.21.21' },
      { name: 'www', type: 'CNAME', content: 'proj.vercel-dns.com' },
    ])

    await provisionDomain(KATY, registrar, host, router)
    expect(registrar.records.get(first)).toHaveLength(2)
  })

  it('throws when the host recommends no DNS at all, rather than guessing at records', async () => {
    const { registrar, router } = parts()
    const host: Host = {
      attach: async () => ({ alreadyAttached: false }),
      config: async () => ({ ipv4: null, cname: null, live: false }),
    }
    await expect(provisionDomain(KATY, registrar, host, router)).rejects.toThrow(/no recommended DNS/)
  })

  it('routes the host even when the domain is not live yet', async () => {
    /*
     * DNS and TLS take minutes. The map should be correct the moment
     * propagation finishes, so routing is not conditional on liveness —
     * otherwise a site would come up on Vercel and route nowhere.
     */
    const { registrar, host, router } = parts()
    host.live = false
    const result = await provisionDomain(KATY, registrar, host, router)

    expect(result.live).toBe(false)
    expect(router.hosts[result.domain]).toBe('katy')
  })

  it('does NOT poll for liveness — it checks once and returns', async () => {
    /*
     * The handoff's version loops for up to ten minutes. publishCity is
     * called from a server action, and a serverless function is killed long
     * before that — the same failure the suburb stage hit. One check, then
     * return; the admin polls separately.
     */
    const { registrar, host, router } = parts()
    host.live = false
    await provisionDomain(KATY, registrar, host, router)
    expect(host.configCalls).toBe(1)
  })

  it('reports live when the host already says so', async () => {
    const { registrar, host, router } = parts()
    host.live = true
    expect((await provisionDomain(KATY, registrar, host, router)).live).toBe(true)
  })

  it('honours an explicit candidate list', async () => {
    const { registrar, host, router } = parts()
    const result = await provisionDomain(
      { ...KATY, candidates: ['only-this-one.com'] },
      registrar,
      host,
      router,
    )
    expect(result.domain).toBe('only-this-one.com')
  })

  it('logs each step, so the publish screen can show what happened', async () => {
    const { registrar, host, router } = parts()
    const lines: string[] = []
    await provisionDomain(KATY, registrar, host, router, (m) => lines.push(m))

    expect(lines.join('\n')).toMatch(/buying/)
    expect(lines.join('\n')).toMatch(/attached/)
    expect(lines.join('\n')).toMatch(/A @/)
    expect(lines.join('\n')).toMatch(/routed/)
  })
})
