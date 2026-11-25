// src/server/leads/readiness.ts
// "Can this site deliver a lead to a human?" Derived, never stored. Drafts are exempt from the domain check.
import type { DomainsIndex } from '@/server/content/resolve-rewrite'
import type { LeadCounts } from './types'

export type ReadinessProblem = 'no-domain' | 'email-failures'

export type Readiness = {
  ready: boolean
  problems: ReadinessProblem[]
  domain: string | null
}

export function siteReadiness(args: {
  isLive: boolean
  domain: string | null
  counts: LeadCounts
}): Readiness {
  const problems: ReadinessProblem[] = []
  if (args.isLive && !args.domain) problems.push('no-domain')
  if (args.counts.emailFailed > 0) problems.push('email-failures')
  return { ready: problems.length === 0, problems, domain: args.domain }
}

export type { DomainsIndex }

// the domain a city answers on. The `default` city answers on the deploy's base domain without a hosts entry,
// so it gets a placeholder rather than a NO DOMAIN chip on the only working site.
export function domainFor(cityKey: string, domains: DomainsIndex): string | null {
  const mapped = Object.entries(domains.hosts).find(([, value]) => value === cityKey)?.[0]
  if (mapped) return mapped
  return domains.default === cityKey ? '(default domain)' : null
}

// where the console opens a city: a live city on its own domain, otherwise its /<key> preview
export function siteLink(cityKey: string, isLive: boolean, domains: DomainsIndex): string {
  const host = isLive ? Object.entries(domains.hosts).find(([, key]) => key === cityKey)?.[0] : undefined
  return host ? `https://${host}` : `/${cityKey}`
}
