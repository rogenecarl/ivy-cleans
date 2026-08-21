// src/leads/types.ts
/*
 * Shared vocabulary for the leads feature. Deliberately free of Prisma types:
 * store.ts maps between these and the generated client, so every other module
 * (and every test) can be written without a database in scope.
 */

export type FormType = 'booking' | 'contact'
export type LeadStatus = 'new' | 'contacted' | 'quoted' | 'booked' | 'lost'
export type EmailStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export const LEAD_STATUSES: readonly LeadStatus[] = [
  'new',
  'contacted',
  'quoted',
  'booked',
  'lost',
]

/** A lead as it arrives, before the database assigns identity or defaults. */
export type LeadInput = {
  cityKey: string
  formType: FormType
  name: string | null
  email: string | null
  phone: string | null
  /** Every submitted field, label-keyed, verbatim. */
  payload: Record<string, string>
  isTest: boolean
  ipHash: string | null
}

/** A stored lead. */
export type LeadRecord = LeadInput & {
  id: string
  status: LeadStatus
  notes: string
  emailStatus: EmailStatus
  emailError: string | null
  submittedAt: Date
  updatedAt: Date
}

/** A validated dashboard query. Produced only by filters.ts. */
export type LeadQuery = {
  city: string | null
  status: LeadStatus | null
  formType: FormType | null
  includeTest: boolean
}

export type LeadCounts = {
  total: number
  /** Leads not yet booked or lost, i.e. still needing action. */
  unworked: number
  emailFailed: number
}

export type SiteSettingsRecord = {
  cityKey: string
  notifyEmails: string[]
}
