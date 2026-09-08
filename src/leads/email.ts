// src/leads/email.ts
// the notification body as a pure function; every submitted value is escaped
import type { LeadInput } from './types'

export type LeadEmail = { subject: string; html: string; text: string }

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// plaintext has no markup to escape, so collapse CR/LF: a submitted value must never start a new line
function collapseNewlines(value: string): string {
  return value.replace(/\r\n|\r|\n/g, ' ')
}

export function buildLeadEmail(args: {
  cityName: string
  lead: LeadInput
  // null when LEADS_DASHBOARD_ORIGIN is unset: no link rather than one derived from request input
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
