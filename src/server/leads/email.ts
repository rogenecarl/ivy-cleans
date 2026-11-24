// src/server/leads/email.ts
// the notification body as a pure function; every submitted value is escaped
import { BOOKING_FIELDS, CONTACT_FIELDS, IDENTITY_KEYS } from './schema'
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

const labelOf = (fields: typeof BOOKING_FIELDS, name: string) => fields.find((f) => f.name === name)?.label
const ADDRESS_LABEL = labelOf(BOOKING_FIELDS, 'form_fields[field_1872bc3]')
const MESSAGE_LABEL = labelOf(CONTACT_FIELDS, 'form_fields[field_45db7dd]')
// name, email and phone sit in the customer block, so the details list skips them
const IDENTITY_LABELS = new Set(
  [
    ...IDENTITY_KEYS.booking.map((n) => labelOf(BOOKING_FIELDS, n)),
    ...IDENTITY_KEYS.contact.map((n) => labelOf(CONTACT_FIELDS, n)),
  ].filter((l): l is string => Boolean(l)),
)

const GREEN = '#37745F'
const BOOKING_BADGE = { label: 'New Booking Request', fg: '#9A2B07', bg: '#FCEEE8', border: '#F3C9B8' }
const CONTACT_BADGE = { label: 'New Contact Message', fg: '#1E5A45', bg: '#EEF7F4', border: '#BFE0D3' }

/** "Tuesday, November 24, 2026 at 5:57 PM CST" in the business's own time zone. */
function submittedLabel(at: Date): string {
  return at.toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

export function buildLeadEmail(args: {
  cityName: string
  lead: LeadInput
  // null when LEADS_DASHBOARD_ORIGIN is unset: no link rather than one derived from request input
  dashboardUrl: string | null
  submittedAt?: Date
}): LeadEmail {
  const { cityName, lead, dashboardUrl } = args
  const booking = lead.formType === 'booking'
  const kind = booking ? 'New booking request' : 'New contact message'
  const badge = booking ? BOOKING_BADGE : CONTACT_BADGE
  // one inbox gets every city's leads, so the site leads both the subject and the body
  const site = `Ivy Cleans ${cityName}`
  const safeName = lead.name ? collapseNewlines(lead.name) : null
  const subject = safeName ? `[${site}] ${kind} — ${safeName}` : `[${site}] ${kind}`
  const when = submittedLabel(args.submittedAt ?? new Date())

  const entries = Object.entries(lead.payload).filter(([, value]) => value.trim() !== '')
  const message = !booking && MESSAGE_LABEL ? lead.payload[MESSAGE_LABEL]?.trim() || null : null
  const details = entries.filter(([label]) => !IDENTITY_LABELS.has(label) && label !== MESSAGE_LABEL)

  // ---- plain text ----
  const text = [
    site,
    '',
    `${kind} from the ${site} website.`,
    `Submitted ${when}`,
    '',
    `Name: ${safeName ?? '(not given)'}`,
    ...(lead.email ? [`Email: ${collapseNewlines(lead.email)}`] : []),
    ...(lead.phone ? [`Phone: ${collapseNewlines(lead.phone)}`] : []),
    '',
    ...details.map(([label, value]) => `${label}: ${collapseNewlines(value)}`),
    ...(message ? ['', `Message: ${collapseNewlines(message)}`] : []),
    '',
    dashboardUrl ? `Open in dashboard: ${dashboardUrl}` : 'Open the dashboard to see this lead.',
    'Reply to this email to answer the customer directly.',
  ].join('\n')

  // ---- html ----
  const label = (s: string) =>
    `<div style="font-size:11px;color:#6b7680;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:3px">${escapeHtml(s)}</div>`
  const link = (href: string, s: string) =>
    `<a href="${escapeHtml(href)}" style="color:${GREEN};font-weight:600;text-decoration:none">${escapeHtml(s)}</a>`

  // one per row: side by side, a phone screen breaks the number across lines
  const contactCells = [
    lead.phone ? `<tr><td style="padding:4px 0">${label('Phone')}${link(`tel:${lead.phone.replace(/[^\d+]/g, '')}`, lead.phone)}</td></tr>` : '',
    lead.email ? `<tr><td style="padding:4px 0;word-break:break-all">${label('Email')}${link(`mailto:${lead.email}`, lead.email)}</td></tr>` : '',
  ].join('')

  const detailRows = details
    .map(([l, value]) => {
      const shown =
        l === ADDRESS_LABEL
          ? link(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`, value)
          : `<span style="font-weight:600;color:#1b1f23">${escapeHtml(value)}</span>`
      return `<tr><td style="padding:8px 0;border-bottom:1px solid #eef0f2">${label(l)}<div style="font-size:14px">${shown}</div></td></tr>`
    })
    .join('')

  const section = (title: string, body: string) =>
    `<tr><td style="padding:24px 32px 0"><h3 style="margin:0 0 8px;font-size:12px;color:#6b7680;text-transform:uppercase;letter-spacing:1px">${escapeHtml(title)}</h3>${body}</td></tr>`

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f2f4f3;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1b1f23">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f3;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:${GREEN};padding:28px 32px;text-align:center">
<h1 style="margin:0;font-size:22px;color:#ffffff">${escapeHtml(site)}</h1>
<p style="margin:6px 0 0;font-size:13px;color:#d6ebe3">${escapeHtml(kind)} from the ${escapeHtml(site)} website.</p>
</td></tr>
<tr><td style="background:${badge.bg};border-bottom:1px solid ${badge.border};padding:12px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="font-size:13px;font-weight:700;color:${badge.fg}">&#9679; ${badge.label}</td>
<td align="right" style="font-size:12px;color:${badge.fg}">${escapeHtml(when)}</td>
</tr></table></td></tr>
<tr><td style="padding:24px 32px 0">
<h2 style="margin:0 0 12px;font-size:20px;color:#1b1f23">${escapeHtml(lead.name ?? 'No name given')}</h2>
${contactCells ? `<table role="presentation" cellpadding="0" cellspacing="0" style="background:#f7f9f8;border-radius:8px;padding:10px 16px;width:100%">${contactCells}</table>` : ''}
</td></tr>
${detailRows ? section(booking ? 'Job details' : 'Details', `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detailRows}</table>`) : ''}
${message ? section('Message', `<div style="background:#f7f9f8;border-left:3px solid ${GREEN};border-radius:0 8px 8px 0;padding:14px 16px;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(message)}</div>`) : ''}
<tr><td style="padding:28px 32px" align="center">${
    dashboardUrl
      ? `<a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#BF360C;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px">Open in dashboard &rarr;</a>`
      : '<p style="margin:0;color:#6b7680;font-size:13px">Open the dashboard to see this lead.</p>'
  }</td></tr>
<tr><td style="background:#f7f9f8;border-top:1px solid #e6e9eb;padding:16px 32px;text-align:center;font-size:11px;color:#6b7680;line-height:1.5">
Reply to this email to answer the customer directly.<br>Automated notification from the ${escapeHtml(site)} website.
</td></tr>
</table></td></tr></table></body></html>`

  return { subject, html, text }
}
