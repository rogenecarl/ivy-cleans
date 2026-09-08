// src/leads/types.ts
// Shared vocabulary for the leads feature, free of Prisma types.

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

// dashboard aggregates computed by the database, not from listLeads() (which caps at 200). Test rows excluded.
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
  /** All-time split by form: a booking request signals far more intent than an enquiry. */
  bookings: number
  enquiries: number
  /** Non-test lead count per cityKey. */
  byCity: Record<string, number>
}

/** One count per pipeline stage. Every stage is always present, so a stage
 * with no leads renders as "0" rather than vanishing from the row. */
export type LeadStatusCounts = Record<LeadStatus, number>
