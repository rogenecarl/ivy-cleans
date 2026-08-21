// src/leads/readiness.ts
/*
 * "Can this site actually deliver a lead to a human?"
 *
 * Derived, never stored, so it cannot go stale. A DRAFT city is exempt from
 * the domain and inbox checks: it has not launched, so those are not problems
 * yet, and flagging them would train the operator to ignore the chips.
 */
import type { LeadCounts } from './types'

export type ReadinessProblem = 'no-domain' | 'no-inbox' | 'email-failures'

export type Readiness = {
  ready: boolean
  problems: ReadinessProblem[]
  domain: string | null
}

export function siteReadiness(args: {
  isLive: boolean
  domain: string | null
  notifyEmails: string[]
  counts: LeadCounts
}): Readiness {
  const problems: ReadinessProblem[] = []
  if (args.isLive && !args.domain) problems.push('no-domain')
  if (args.isLive && args.notifyEmails.length === 0) problems.push('no-inbox')
  if (args.counts.emailFailed > 0) problems.push('email-failures')
  return { ready: problems.length === 0, problems, domain: args.domain }
}

/** The shape of content/_domains.json. Redefined locally rather than imported
 * from src/content/store.ts or resolve-rewrite.ts (both already carry their
 * own copy) so this module stays a leaf: it can be unit-tested with a plain
 * object literal and never has to import anything content-layer. */
export type DomainsIndex = {
  default: string
  hosts: Record<string, string>
}

/**
 * The domain a city answers on, for both display and the readiness check.
 *
 * RULING: `hosts` only ever records an OVERRIDE — the city named `default`
 * answers on the deploy's base domain without an entry there. With today's
 * `content/_domains.json` (`hosts: {}`), that city is the one LIVE site in
 * the system; treating it as domain-less here would put a NO DOMAIN chip on
 * the only site that actually works, which trains the operator to ignore the
 * chips entirely. So the default city counts as having a domain even absent
 * a `hosts` entry — this function returns a non-null placeholder for it, and
 * siteReadiness never sees a null `domain` for that city as a result.
 *
 * The literal string returned for the default city is not a real domain name
 * -- content/_domains.json does not record what host actually resolves there
 * -- so a placeholder is used rather than fabricating one.
 */
export function domainFor(cityKey: string, domains: DomainsIndex): string | null {
  const mapped = Object.entries(domains.hosts).find(([, value]) => value === cityKey)?.[0]
  if (mapped) return mapped
  return domains.default === cityKey ? '(default domain)' : null
}
