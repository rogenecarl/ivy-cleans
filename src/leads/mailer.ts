// src/leads/mailer.ts
/*
 * The only module that talks to Resend.
 *
 * STUB_EMAIL=1 diverts everything into `stubbedEmails` so the test suite can
 * never reach the provider. That flag mirrors the pipeline's STUB_MODEL=1.
 *
 * One verified sending domain serves every city (LEADS_FROM_EMAIL); the
 * per-city part is the recipient list. Reply-To is the customer, so the
 * operator can answer from their mail client without opening the dashboard.
 */
import type { LeadEmail } from './email'

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

  const from = process.env.LEADS_FROM_EMAIL ?? 'leads@example.invalid'

  if (process.env.STUB_EMAIL === '1') {
    stubbedEmails.push({ to: args.to, from, replyTo: args.replyTo, email: args.email })
    return { ok: true }
  }

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
