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

/**
 * The dashboard's aggregate view of every lead, computed by the database
 * rather than by counting rows in memory.
 *
 * That distinction matters: listLeads() caps at 200 rows, so any figure
 * derived from its result silently stops being true once a city passes 200
 * leads -- and "booked in the last 30 days" computed from the newest 200
 * would quietly drift low with no visible symptom. Every number here comes
 * from a COUNT the store issues directly.
 *
 * Test rows are excluded from all of it: a preview submission is not a
 * customer and must never move a business metric.
 */
export type LeadDashboardStats = {
  /** Leads still in `new` -- nobody has responded yet. */
  waiting: number
  /** When the OLDEST waiting lead arrived; null when nothing is waiting. */
  oldestWaitingAt: Date | null
  /** Leads whose operator notification failed to send. */
  emailFailed: number
  newThisWeek: number
  newLastWeek: number
  bookedLast30: number
  /** All-time bookings, for the 30-day figure's context line. */
  booked: number
  /** All-time split by form. A booking request (bedrooms, bathrooms, an
   * address) signals far more intent than a general enquiry, and the ratio
   * is readable at any volume -- unlike a win rate, which needs dozens of
   * decided leads before it stops swinging on a single outcome. */
  bookings: number
  enquiries: number
  /** Non-test lead count per cityKey. */
  byCity: Record<string, number>
}
