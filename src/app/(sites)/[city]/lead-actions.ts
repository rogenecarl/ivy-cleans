'use server'
/*
 * The only framework surface on the capture path. Everything it does beyond
 * reading request state is delegated to src/leads/submit.ts, which is where
 * the tests live: a 'use server' module is an RPC endpoint, not something
 * vitest can import and call.
 *
 * The city is read from the Host header HERE, not passed in from the browser.
 * Per the Next 16 server-actions guide, an action is reachable by anyone who
 * can POST to it, and bound arguments round-trip through the client, so
 * `renderedCityKey` is untrusted. attributeCity() consults it only for draft
 * previews. See src/leads/attribution.ts.
 */
import { headers } from 'next/headers'
import domainsJson from '../../../../content/_domains.json'
import type { DomainsIndex } from '@/content/resolve-rewrite'
import { getCity } from '@/content/store'
import { clientIp } from '@/leads/client-ip'
import { sendLeadEmail } from '@/leads/mailer'
import {
  countRecentByIpHash,
  createLead,
  getSiteSettings,
  markLeadEmail,
} from '@/leads/store'
import { submitLead, type SubmitPorts, type SubmitResult } from '@/leads/submit'
import type { FormType } from '@/leads/types'
import { ADMIN_BASE } from '@/app/admin-x7kq92mpfw4rt8vz/base'

export async function submitLeadAction(
  formType: FormType,
  renderedCityKey: string,
  form: FormData,
): Promise<SubmitResult> {
  const list = await headers()
  const host = list.get('host') ?? ''

  /*
   * A URL placed in an outbound email must never be derived from request
   * input -- that question should not even arise, independent of how hard it
   * is to exploit on any given platform. LEADS_DASHBOARD_ORIGIN is the ONLY
   * source for the dashboard link; there is deliberately no Host-header
   * fallback. If it is unset, fail closed: dashboardUrlFor below returns
   * null, and buildLeadEmail (src/leads/email.ts) renders the notification
   * with no clickable link rather than guess at one. The lead itself is still
   * saved either way -- only the convenience link is lost.
   */
  const dashboardOrigin = process.env.LEADS_DASHBOARD_ORIGIN
  if (!dashboardOrigin) {
    console.error(
      'submitLeadAction: LEADS_DASHBOARD_ORIGIN is not set -- notification emails will omit the dashboard link. Set it in the deployment environment (see .env.local.example).',
    )
  }

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
        ipSalt: process.env.IP_HASH_SALT ?? 'unsalted-dev-only',
        domains: domainsJson as DomainsIndex,
      },
      ports,
    )
  } catch (cause) {
    // Deliberately broad: this catches submitLead's uncaught hashIp throw
    // (empty/whitespace-only IP_HASH_SALT -- see src/leads/spam.ts), which is
    // the one failure submit.ts intentionally does NOT swallow, so a
    // misconfigured deployment fails loudly instead of silently storing
    // reversible IP hashes forever. It also happens to catch anything else
    // unexpected in that call graph, which is accepted on purpose: submit.ts
    // already wraps its own risky internal calls (storage, email) in their
    // own try/catches, so anything that reaches here is already an
    // unanticipated failure, and an uncaught throw in a server action would
    // otherwise surface to a real customer as a raw 500. Log it loudly here --
    // where it's actionable -- and hand the form a graceful failure it can
    // render as the "call us instead" panel.
    console.error('submitLeadAction: submitLead threw', cause)
    return { ok: false, error: 'storage' }
  }
}
