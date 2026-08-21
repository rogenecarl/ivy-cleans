// tests/leads-store.test.ts
/*
 * The leads store, against the real Neon database.
 *
 * Follows tests/admin-logic.test.ts's convention: every row this file creates
 * uses a `ztest-` prefixed cityKey, and afterAll deletes them unconditionally
 * so a failed run cannot leave rows behind. Skipped entirely when
 * DATABASE_URL is absent so the rest of the suite still runs.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  countRecentByIpHash,
  createLead,
  getLead,
  leadCountsByCity,
  listLeads,
  markLeadEmail,
  setLeadNotes,
  setLeadStatus,
  getSiteSettings,
  upsertSiteSettings,
} from '../src/leads/store'
import type { LeadInput } from '../src/leads/types'

const CITY = 'ztest-miami'
const OTHER = 'ztest-houston'
const prisma = new PrismaClient()

function input(over: Partial<LeadInput> = {}): LeadInput {
  return {
    cityKey: CITY,
    formType: 'booking',
    name: 'Dana Whitfield',
    email: 'dana@example.com',
    phone: '305-555-0184',
    payload: { service: 'Deep Cleaning', bedrooms: '3' },
    isTest: false,
    ipHash: 'hash-a',
    ...over,
  }
}

afterAll(async () => {
  await prisma.lead.deleteMany({ where: { cityKey: { startsWith: 'ztest-' } } })
  await prisma.siteSettings.deleteMany({ where: { cityKey: { startsWith: 'ztest-' } } })
  await prisma.$disconnect()
})

describe.skipIf(!process.env.DATABASE_URL)('leads store', () => {
  beforeEach(async () => {
    await prisma.lead.deleteMany({ where: { cityKey: { startsWith: 'ztest-' } } })
    await prisma.siteSettings.deleteMany({ where: { cityKey: { startsWith: 'ztest-' } } })
  })

  it('creates a lead defaulted to new and pending', async () => {
    const lead = await createLead(input())
    expect(lead.id).toBeTruthy()
    expect(lead.status).toBe('new')
    expect(lead.emailStatus).toBe('pending')
    expect(lead.payload).toEqual({ service: 'Deep Cleaning', bedrooms: '3' })
  })

  it('marks email delivery outcome with an error string', async () => {
    const lead = await createLead(input())
    await markLeadEmail(lead.id, 'failed', 'domain not verified')
    const after = await getLead(lead.id)
    expect(after?.emailStatus).toBe('failed')
    expect(after?.emailError).toBe('domain not verified')
  })

  it('filters by city, status and form type, newest first', async () => {
    await createLead(input())
    await createLead(input({ cityKey: OTHER, formType: 'contact', name: 'Marcus' }))
    const miami = await listLeads({ city: CITY, status: null, formType: null, includeTest: false })
    expect(miami).toHaveLength(1)
    expect(miami[0].name).toBe('Dana Whitfield')

    const contacts = await listLeads({ city: null, status: null, formType: 'contact', includeTest: false })
    expect(contacts.map((l) => l.name)).toEqual(['Marcus'])
  })

  it('hides test rows unless asked for them', async () => {
    await createLead(input({ isTest: true, name: 'Preview Person' }))
    const hidden = await listLeads({ city: CITY, status: null, formType: null, includeTest: false })
    expect(hidden).toHaveLength(0)
    const shown = await listLeads({ city: CITY, status: null, formType: null, includeTest: true })
    expect(shown).toHaveLength(1)
  })

  it('updates status and notes independently', async () => {
    const lead = await createLead(input())
    await setLeadStatus(lead.id, 'contacted')
    await setLeadNotes(lead.id, 'Call back Thu')
    const after = await getLead(lead.id)
    expect(after?.status).toBe('contacted')
    expect(after?.notes).toBe('Call back Thu')
  })

  it('counts recent leads for one ip hash, ignoring test rows', async () => {
    await createLead(input({ ipHash: 'hash-b' }))
    await createLead(input({ ipHash: 'hash-b' }))
    await createLead(input({ ipHash: 'hash-b', isTest: true }))
    expect(await countRecentByIpHash('hash-b', 10 * 60_000)).toBe(2)
  })

  it('aggregates counts per city', async () => {
    const a = await createLead(input())
    await createLead(input({ cityKey: OTHER }))
    await markLeadEmail(a.id, 'failed', 'boom')
    const counts = await leadCountsByCity()
    expect(counts[CITY]).toEqual({ total: 1, unworked: 1, emailFailed: 1 })
    expect(counts[OTHER]).toEqual({ total: 1, unworked: 1, emailFailed: 0 })
  })

  it('upserts site settings', async () => {
    await upsertSiteSettings(CITY, ['miami@example.com'])
    await upsertSiteSettings(CITY, ['miami@example.com', 'ops@example.com'])
    const settings = await getSiteSettings(CITY)
    expect(settings?.notifyEmails).toEqual(['miami@example.com', 'ops@example.com'])
    expect(await getSiteSettings('ztest-nope')).toBeNull()
  })
})
