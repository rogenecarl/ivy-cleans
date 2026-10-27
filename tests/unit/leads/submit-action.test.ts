import { describe, expect, it, vi } from 'vitest'

// Lead attribution must use the same routing tables as the proxy: a domain added through Global Config (no redeploy)
// is a mapped host, so the untrusted renderedCityKey is never consulted for it.
vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: 'gc-only.example' }) }))
vi.mock('@/server/content/resolve-rewrite', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/content/resolve-rewrite')>()),
  loadRouting: async () => ({ domains: { default: 'minneapolis', hosts: { 'gc-only.example': 'miami' } }, cityKeys: [] }),
}))
const submitLead = vi.fn(async () => ({ ok: true as const }))
vi.mock('@/server/leads/submit', () => ({ submitLead }))

describe('submitLeadAction', () => {
  it('attributes by the live routing tables, Global Config included', async () => {
    const { submitLeadAction } = await import('@/app/(sites)/[city]/actions')
    await submitLeadAction('contact', 'anything', new FormData())
    const [input] = submitLead.mock.calls[0] as unknown as [{ domains: { hosts: Record<string, string> } }]
    expect(input.domains.hosts['gc-only.example']).toBe('miami')
  })
})
