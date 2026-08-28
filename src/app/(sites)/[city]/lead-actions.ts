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
 * `renderedCityKey` is untrusted. attributeCity() consults it only when the
 * Host is NOT a mapped tenant domain, which is the one case where there is no
 * trusted key to be had. See src/leads/attribution.ts.
 *
 * Whether a submission counts as a draft preview is a SEPARATE question,
 * answered by the city document's own `status` through the isDraftCity port
 * below -- never by the shape of the request.
 */
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

  /*
   * A URL placed in an outbound email must never be derived from request
   * input -- that question should not even arise, independent of how hard it
   * is to exploit on any given platform. LEADS_DASHBOARD_ORIGIN is the ONLY
   * source for the dashboard link; there is deliberately no Host-header
   * fallback. If it is unset, fail closed: dashboardUrlFor below returns
   * null, and buildLeadEmail (src/leads/email.ts) renders the notification
   * with no clickable link rather than guess at one. The lead itself is still
   * saved either way -- only the convenience link is lost.
   *
   * Read from src/leads/env.ts, which resolves an absent variable and a blank
   * one to the same `null` and reports every missing one ONCE at boot rather
   * than once per submission (this used to log per request).
   */
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
    /*
     * WHERE THE DRAFT/LIVE LOOKUP LIVES, and why it is a port.
     *
     * submitLead must stay framework-free and I/O-free -- that is what lets
     * tests/leads-submit.test.ts drive the whole capture path with no
     * database and no network. attributeCity must stay pure and synchronous
     * for the same reason. So the one piece of I/O this decision needs (read
     * the city document, look at its `status`) is injected here, in the only
     * module that is already allowed to do I/O and already holds getCity.
     *
     * Fails OPEN, per the port's contract in submit.ts: if the city cannot be
     * resolved at all we call the lead REAL. A real lead misfiled as a test
     * row is invisible on every screen and never emailed -- that is exactly
     * the bug this whole change exists to remove -- while a preview misfiled
     * as real is a labelled row an operator can ignore.
     */
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
        // env.ts: absent and blank both resolve to null, which means "no salt
        // configured" -- store no ipHash and skip the rate limit rather than
        // refuse the customer. There is deliberately NO fallback string: the
        // one this used to carry was committed to this repository, so every
        // deployment that forgot the variable hashed real customer IPs with a
        // public constant.
        ipSalt: IP_HASH_SALT,
        domains: domainsJson as DomainsIndex,
      },
      ports,
    )
  } catch (cause) {
    // Deliberately broad. A misconfigured IP_HASH_SALT no longer reaches
    // here -- env.ts resolves absent and blank alike to null, hashIp treats
    // that as "no salt" and the lead is captured anyway -- so this is now
    // purely a backstop for the genuinely unexpected, which is accepted on
    // purpose: submit.ts
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
