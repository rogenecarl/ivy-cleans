// src/leads/email.ts
/*
 * The notification body, as a pure function, so it can be asserted on without
 * a provider or a network.
 *
 * Values come from a public form and are interpolated into HTML, so every one
 * is escaped. Nothing here is customer-facing: this email goes to the operator
 * for the city the lead came from.
 */
import type { LeadInput } from './types'

export type LeadEmail = { subject: string; html: string; text: string }

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/*
 * The plaintext half of a multipart email has no markup to escape, so a
 * newline is the only structural character a submitter controls: an
 * unsanitized value can inject what reads as a whole extra line — a forged
 * field or a forged "Open in dashboard" link — into the operator's inbox.
 * Collapse any run of CR/LF into a single space so a submitted value can
 * never start a new line. Applied to submitted values (and the lead's name,
 * for the subject) only — never to labels, which are fixed schema constants.
 */
function collapseNewlines(value: string): string {
  return value.replace(/\r\n|\r|\n/g, ' ')
}

export function buildLeadEmail(args: {
  cityName: string
  lead: LeadInput
  /**
   * null when the deployment has no configured canonical origin
   * (LEADS_DASHBOARD_ORIGIN unset -- see lead-actions.ts). A URL placed in an
   * outbound email must never be guessed from request input, so the caller
   * fails closed instead of deriving one from the Host header: this function
   * renders no clickable link at all rather than an attacker-influenced one.
   */
  dashboardUrl: string | null
}): LeadEmail {
  const { cityName, lead, dashboardUrl } = args
  const kind = lead.formType === 'booking' ? 'New booking request' : 'New contact message'
  const safeName = lead.name ? collapseNewlines(lead.name) : null
  const subject = safeName ? `[${cityName}] ${kind} — ${safeName}` : `[${cityName}] ${kind}`

  const entries = Object.entries(lead.payload).filter(([, value]) => value.trim() !== '')

  const dashboardLine = dashboardUrl
    ? `Open in dashboard: ${dashboardUrl}`
    : 'Open the dashboard to see this lead.'

  const text = [
    `${kind} from the ${cityName} website.`,
    '',
    ...entries.map(([label, value]) => `${label}: ${collapseNewlines(value)}`),
    '',
    dashboardLine,
  ].join('\n')

  const rows = entries
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#6b7680;font-size:13px;vertical-align:top">${escapeHtml(
          label,
        )}</td><td style="padding:4px 0;font-size:13px">${escapeHtml(value)}</td></tr>`,
    )
    .join('')

  const dashboardBlock = dashboardUrl
    ? `<p style="margin-top:16px"><a href="${escapeHtml(dashboardUrl)}" style="background:#1b6f56;color:#fff;border-radius:5px;padding:8px 14px;text-decoration:none;font-size:13px">Open in dashboard</a></p>`
    : '<p style="margin-top:16px;color:#6b7680;font-size:13px">Open the dashboard to see this lead.</p>'

  const html = [
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1b1f23">',
    `<p style="font-size:14px"><strong>${escapeHtml(kind)}</strong> from the `,
    `<strong>${escapeHtml(cityName)}</strong> website.</p>`,
    `<table cellpadding="0" cellspacing="0">${rows}</table>`,
    dashboardBlock,
    '</div>',
  ].join('')

  return { subject, html, text }
}
