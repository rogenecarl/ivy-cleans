'use server'
// The only framework surface on the capture path; the logic is in src/leads/submit.ts. The city comes from the
// Host header here — `renderedCityKey` is untrusted and consulted only on an unmapped host. Draft vs live is
// answered by the city document's status through the isDraftCity port, never by the request.
import { headers } from 'next/headers'
import domainsJson from '../../../../content/_domains.json'
import type { DomainsIndex } from '@/content/resolve-rewrite'
import { getCity } from '@/content/store'
import { clientIp } from '@/leads/client-ip'
import { IP_HASH_SALT, LEADS_DASHBOARD_ORIGIN } from '@/leads/env'
import { sendLeadEmail } from '@/leads/mailer'
import {
  countRecentByIpHash,
  createLead,
  getSiteSettings,
  markLeadEmail,
} from '@/leads/store'
import { submitLead, type SubmitPorts, type SubmitResult } from '@/leads/submit'
import type { FormType } from '@/leads/types'
import { ADMIN_BASE } from '@/lib/admin-routes'

export async function submitLeadAction(
  formType: FormType,
  renderedCityKey: string,
  form: FormData,
): Promise<SubmitResult> {
  const list = await headers()
  const host = list.get('host') ?? ''

  // LEADS_DASHBOARD_ORIGIN is the only source for the email's dashboard link; unset = no link, never a Host-derived one
  const dashboardOrigin = LEADS_DASHBOARD_ORIGIN

  const ports: SubmitPorts = {
    countRecentByIpHash,
    createLead,
    markLeadEmail,
    getSiteSettings,
    sendEmail: sendLeadEmail,
    async cityNameFor(cityKey) {
      try {
        return (await getCity(cityKey)).city
      } catch {
        return cityKey
      }
    },
    // the draft/live lookup is injected here, the one module allowed to do I/O. Fails OPEN: unresolvable = real.
    async isDraftCity(cityKey) {
      try {
        return (await getCity(cityKey)).status !== 'live'
      } catch (cause) {
        console.error(
          `submitLeadAction: could not resolve city "${cityKey}" to classify this lead; treating it as a REAL submission so it stays visible and gets emailed.`,
          cause,
        )
        return false
      }
    },
    dashboardUrlFor: (id) => (dashboardOrigin ? `${dashboardOrigin}${ADMIN_BASE}/leads/${id}` : null),
  }

  try {
    return await submitLead(
      {
        form,
        formType,
        host,
        renderedCityKey,
        clientIp: clientIp(list),
        // null = no salt configured: no ipHash, no rate limit, lead still captured. No fallback string on purpose.
        ipSalt: IP_HASH_SALT,
        domains: domainsJson as DomainsIndex,
      },
      ports,
    )
  } catch (cause) {
    // backstop for the genuinely unexpected; submit.ts already handles storage and email failures itself
    console.error('submitLeadAction: submitLead threw', cause)
    return { ok: false, error: 'storage' }
  }
}
