// src/leads/submit.ts
// A public form submission, every side effect behind an injected port. The lead is created BEFORE the email is
// attempted; a failed notification never loses a customer.
import type { DomainsIndex } from '../content/resolve-rewrite'
import { attributeCity } from './attribution'
import { buildLeadEmail, type LeadEmail } from './email'
import type { SendResult } from './mailer'
import { HONEYPOT_FIELD, parseBookingForm, parseContactForm } from './schema'
import { RATE_WINDOW_MS, hashIp, honeypotFilled, overRateLimit } from './spam'
import type { EmailStatus, FormType, LeadInput, LeadRecord, SiteSettingsRecord } from './types'

export type SubmitPorts = {
  countRecentByIpHash(ipHash: string, windowMs: number): Promise<number>
  createLead(input: LeadInput): Promise<LeadRecord>
  markLeadEmail(id: string, status: EmailStatus, error: string | null): Promise<void>
  getSiteSettings(cityKey: string): Promise<SiteSettingsRecord | null>
  // is this city still a draft? MUST NOT THROW and MUST FAIL OPEN (false = real): a real lead misfiled as a test
  // disappears from every screen; a preview misfiled as real is just a labelled row.
  isDraftCity(cityKey: string): Promise<boolean>
  sendEmail(args: {
    to: string[]
    replyTo: string | null
    email: LeadEmail
  }): Promise<SendResult>
  /** Display name for the city, for the subject line. */
  cityNameFor(cityKey: string): Promise<string>
  /** null when the deployment has no configured canonical origin (see lead-actions.ts) -- the email omits the link rather than guess. */
  dashboardUrlFor(leadId: string): string | null
}

export type SubmitArgs = {
  form: FormData
  formType: FormType
  host: string
  renderedCityKey: string
  clientIp: string | null
  /** Resolved once by src/leads/env.ts. `null` = not configured: no ipHash is stored and the per-IP rate limit is skipped, rather than refusing the customer. */
  ipSalt: string | null
  domains: DomainsIndex
}

export type SubmitResult =
  | { ok: true; leadId?: string }
  | { ok: false; error: 'validation'; fieldErrors: Record<string, string> }
  | { ok: false; error: 'rate-limit' | 'storage' }

export async function submitLead(args: SubmitArgs, ports: SubmitPorts): Promise<SubmitResult> {
  const parsed =
    args.formType === 'booking' ? parseBookingForm(args.form) : parseContactForm(args.form)

  const honeypotRaw = args.form.get(HONEYPOT_FIELD)
  const honeypotValue = typeof honeypotRaw === 'string' ? honeypotRaw : null

  // before any I/O: catching a bot must be free
  if (honeypotFilled(honeypotValue)) return { ok: true }

  // ipSalt null = not configured: no ipHash, no rate limit, lead still captured
  const ipHash = hashIp(args.clientIp, args.ipSalt)
  const recentCount = ipHash ? await ports.countRecentByIpHash(ipHash, RATE_WINDOW_MS) : 0
  if (overRateLimit(recentCount)) return { ok: false, error: 'rate-limit' }

  if (!parsed.ok) return { ok: false, error: 'validation', fieldErrors: parsed.fieldErrors }

  const attribution = attributeCity(args.host, args.renderedCityKey, args.domains)

  // attribution decides whose lead; the city's status decides real vs preview. After validation and the rate limit.
  const isTest = await ports.isDraftCity(attribution.cityKey)

  const input: LeadInput = {
    cityKey: attribution.cityKey,
    formType: args.formType,
    name: parsed.fields.name,
    email: parsed.fields.email,
    phone: parsed.fields.phone,
    payload: parsed.fields.payload,
    isTest,
    ipHash,
  }

  let lead: LeadRecord
  try {
    lead = await ports.createLead(input)
  } catch {
    return { ok: false, error: 'storage' }
  }

  // From here on nothing may change the caller's result. The lead is durable.
  await notify(lead, input, isTest, ports)
  return { ok: true, leadId: lead.id }
}

async function notify(
  lead: LeadRecord,
  input: LeadInput,
  isTest: boolean,
  ports: SubmitPorts,
): Promise<void> {
  try {
    if (isTest) {
      await ports.markLeadEmail(lead.id, 'skipped', 'preview submission')
      return
    }

    const settings = await ports.getSiteSettings(lead.cityKey)
    const to = settings?.notifyEmails ?? []
    if (to.length === 0) {
      await ports.markLeadEmail(lead.id, 'skipped', 'no notification inbox configured')
      return
    }

    const email = buildLeadEmail({
      cityName: await ports.cityNameFor(lead.cityKey),
      lead: input,
      dashboardUrl: ports.dashboardUrlFor(lead.id),
    })

    const result = await ports.sendEmail({ to, replyTo: input.email, email })
    if (result.ok) {
      // a failure to record success is not a failure to send
      try {
        await ports.markLeadEmail(lead.id, 'sent', null)
      } catch {
        /* the email was sent; nothing further can be done here */
      }
      return
    }
    await ports.markLeadEmail(lead.id, 'failed', result.error)
  } catch (cause) {
    // Even the bookkeeping failing must not surface to the customer.
    try {
      await ports.markLeadEmail(
        lead.id,
        'failed',
        cause instanceof Error ? cause.message : String(cause),
      )
    } catch {
      /* the lead is saved; nothing further can be done here */
    }
  }
}
