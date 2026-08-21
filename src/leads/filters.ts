// src/leads/filters.ts
/*
 * searchParams in, a validated LeadQuery out.
 *
 * Every filter lives in the URL, which is what makes "Miami, contacted"
 * bookmarkable and pasteable, and is why this feature needs no client state
 * library. A hand-edited URL must never crash the dashboard, so anything
 * unrecognised degrades to "no filter" rather than throwing.
 */
import { LEAD_STATUSES, type FormType, type LeadQuery, type LeadStatus } from './types'

const CITY_KEY = /^[a-z0-9-]+$/
const FORM_TYPES: readonly FormType[] = ['booking', 'contact']

type Params = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export function parseLeadQuery(params: Params): LeadQuery {
  const rawCity = first(params.city)
  const rawStatus = first(params.status)
  const rawForm = first(params.form)

  return {
    city: rawCity && CITY_KEY.test(rawCity) ? rawCity : null,
    status: LEAD_STATUSES.includes(rawStatus as LeadStatus) ? (rawStatus as LeadStatus) : null,
    formType: FORM_TYPES.includes(rawForm as FormType) ? (rawForm as FormType) : null,
    includeTest: first(params.test) === '1',
  }
}

export function leadQueryToSearch(query: LeadQuery): string {
  const search = new URLSearchParams()
  if (query.city) search.set('city', query.city)
  if (query.status) search.set('status', query.status)
  if (query.formType) search.set('form', query.formType)
  if (query.includeTest) search.set('test', '1')
  return search.toString()
}
