// src/leads/submit.ts
/*
 * The order of operations for a public form submission, with every side effect
 * behind an injected port so this module has no I/O and its tests need no
 * database and no network.
 *
 * THE ORDERING CONSTRAINT: the lead is created BEFORE the email is attempted,
 * and no email outcome can turn a saved lead into a failed submission. If
 * Resend is down, the domain is unverified, or the inbox is misconfigured, the
 * customer is already captured and the row carries a visible flag. A broken
 * notification path must never lose a customer.
 */
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
  /**
   * Is this city still a draft? A draft city's submissions are previews:
   * stored, hidden from the dashboard by default, never emailed. A LIVE
   * city's submissions are real customers no matter what host they arrived
   * on -- see the header of attribution.ts for the bug this replaced.
   *
   * MUST NOT THROW and MUST FAIL OPEN: an implementation that cannot resolve
   * the city (store unreachable, key unknown) reports `false`, i.e. "real".
   * A real lead wrongly marked as a test row disappears from every screen and
   * is never emailed; a preview wrongly marked real is merely a visible,
   * clearly-labelled row someone can ignore. Only one of those loses a
   * customer.
   */
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

  // Checked before any I/O: no hashing, no query. A bot is told it succeeded --
  // it learns nothing, and retries cost it time -- but the whole point of a
  // honeypot is that catching one must be free, so this must run first.
  if (honeypotFilled(honeypotValue)) return { ok: true }

  // `ipSalt: null` means "not configured" (env.ts already logged that, once,
  // at boot): hashIp returns null, no ipHash is stored, and the rate limit is
  // skipped. The customer is still captured -- losing the lead would be a far
  // worse outcome than losing a spam control. A blank STRING never reaches
  // here (env.ts normalizes it to null) and hashIp still throws on one, since
  // at that point it can only be a programming error.
  const ipHash = hashIp(args.clientIp, args.ipSalt)
  const recentCount = ipHash ? await ports.countRecentByIpHash(ipHash, RATE_WINDOW_MS) : 0
  if (overRateLimit(recentCount)) return { ok: false, error: 'rate-limit' }

  if (!parsed.ok) return { ok: false, error: 'validation', fieldErrors: parsed.fieldErrors }

  const attribution = attributeCity(args.host, args.renderedCityKey, args.domains)

  /*
   * The city key decides WHOSE lead this is (attribution.ts, pure, Host-first).
   * The city's own status decides whether it is a real customer or a draft
   * preview -- a separate question, answered here because it needs I/O.
   * Deliberately after validation and the rate limit, so a rejected or
   * bot-filled submission never costs a city lookup.
   */
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
      // A failure to RECORD success is not a failure to SEND: swallow this in
      // its own try/catch so the outer catch below can never relabel a
      // genuinely successful send as failed.
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
