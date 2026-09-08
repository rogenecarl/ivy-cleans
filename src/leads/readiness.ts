// src/leads/readiness.ts
// "Can this site deliver a lead to a human?" Derived, never stored. Drafts are exempt from the domain/inbox checks.
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

/** content/_domains.json shape, redefined so this module stays a leaf. */
export type DomainsIndex = {
  default: string
  hosts: Record<string, string>
}

// the domain a city answers on. The `default` city answers on the deploy's base domain without a hosts entry,
// so it gets a placeholder rather than a NO DOMAIN chip on the only working site.
export function domainFor(cityKey: string, domains: DomainsIndex): string | null {
  const mapped = Object.entries(domains.hosts).find(([, value]) => value === cityKey)?.[0]
  if (mapped) return mapped
  return domains.default === cityKey ? '(default domain)' : null
}
