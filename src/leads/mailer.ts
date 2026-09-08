// src/leads/mailer.ts
// The only module that talks to Resend. STUB_EMAIL=1 diverts into `stubbedEmails`. One sending domain for every
// city; Reply-To is the customer.
import type { LeadEmail } from './email'
import { LEADS_FROM_EMAIL } from './env'

// stub-only sender; the live branch refuses without LEADS_FROM_EMAIL
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

  // not configured: report the real reason (submit.ts writes it to emailError) instead of sending from ''
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
