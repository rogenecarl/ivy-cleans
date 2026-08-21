// src/leads/mailer.ts
/*
 * The only module that talks to Resend.
 *
 * STUB_EMAIL=1 diverts everything into `stubbedEmails` so the test suite can
 * never reach the provider. That flag mirrors the pipeline's STUB_MODEL=1.
 *
 * One verified sending domain serves every city (LEADS_FROM_EMAIL, resolved
 * once in src/leads/env.ts -- absent and blank both mean "not configured");
 * the per-city part is the recipient list. Reply-To is the customer, so the
 * operator can answer from their mail client without opening the dashboard.
 */
import type { LeadEmail } from './email'
import { LEADS_FROM_EMAIL } from './env'

/*
 * Stub-only sender identity. Never used for a real send: the live branch
 * below refuses outright when LEADS_FROM_EMAIL is not configured, rather than
 * handing Resend a `from` that will bounce or, worse, an empty string. This
 * exists only so the stub sink records a stable, obviously-fake value.
 */
const STUB_FROM = 'leads@example.invalid'

export type SendResult = { ok: true } | { ok: false; error: string }

export type SentEmail = {
  to: string[]
  from: string
  replyTo: string | null
  email: LeadEmail
}

/** Test-only sink. Populated only when STUB_EMAIL=1. */
export const stubbedEmails: SentEmail[] = []

export async function sendLeadEmail(args: {
  to: string[]
  replyTo: string | null
  email: LeadEmail
}): Promise<SendResult> {
  if (args.to.length === 0) return { ok: false, error: 'no recipients configured' }

  if (process.env.STUB_EMAIL === '1') {
    stubbedEmails.push({
      to: args.to,
      from: LEADS_FROM_EMAIL ?? STUB_FROM,
      replyTo: args.replyTo,
      email: args.email,
    })
    return { ok: true }
  }

  /*
   * Absent and blank mean the same thing here (env.ts), and neither may be
   * sent: `from: ''` is rejected by Resend for every notification, which used
   * to read in the dashboard as an unexplained "email not sent" on every
   * single lead. Report the real reason instead -- submit.ts writes it into
   * the row's emailError, so the operator sees the cause, not the symptom.
   */
  const from = LEADS_FROM_EMAIL
  if (!from) return { ok: false, error: 'LEADS_FROM_EMAIL is not set' }

  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: 'RESEND_API_KEY is not set' }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(key)
    const { error } = await resend.emails.send({
      from,
      to: args.to,
      replyTo: args.replyTo ?? undefined,
      subject: args.email.subject,
      html: args.email.html,
      text: args.email.text,
    })
    return error ? { ok: false, error: error.message } : { ok: true }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : String(cause) }
  }
}
