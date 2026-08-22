// src/app/admin-x7kq92mpfw4rt8vz/leads/lead-submission.tsx
/*
 * The one rendering of "what this customer actually submitted".
 *
 * Used by BOTH the row-click sheet on the list and the standalone
 * /leads/<id> page, which exists because the notification email deep-links
 * to it (see (sites)/[city]/lead-actions.ts). One component, so the two can
 * never drift into showing different things about the same lead.
 *
 * DRIVEN BY THE FORM DEFINITION, NOT BY THE PAYLOAD KEYS. Iterating
 * lead.payload would only ever show questions the customer answered, so an
 * optional question they SKIPPED would silently vanish -- the operator could
 * not tell "they left the phone number blank" from "we never asked". Walking
 * BOOKING_FIELDS/CONTACT_FIELDS instead guarantees the whole form appears, in
 * the order it was asked, with blanks called out as blank.
 *
 * Any payload key that is NOT in the form definition is still rendered, at
 * the end, under "Other". That is the safety valve for a form that gains a
 * field before this file learns about it: the answer shows up unlabelled
 * rather than being dropped on the floor.
 */
import type { ReactNode } from 'react'
import { Mail, MapPin, Phone } from 'lucide-react'
import { BOOKING_FIELDS, CONTACT_FIELDS, type LeadFormField } from '@/leads/schema'
import type { LeadRecord } from '@/leads/types'

function fieldsFor(formType: LeadRecord['formType']): readonly LeadFormField[] {
  return formType === 'booking' ? BOOKING_FIELDS : CONTACT_FIELDS
}

/** A value that reads as a phone number or an email becomes one tap to dial
 * or write, matching the list's ContactLine. Address gets no link: the
 * property address is for the crew, not for a map lookup from here. */
function hrefFor(label: string, value: string): string | null {
  if (/phone/i.test(label)) return `tel:${value.replace(/[^\d+]/g, '')}`
  if (/email/i.test(label)) return `mailto:${value}`
  return null
}

/* Returns the ELEMENT, not the component type. Handing back a component and
 * rendering it as <Icon /> creates a component during render, which
 * react-hooks/static-components correctly rejects. */
function iconFor(label: string): ReactNode {
  const className = 'size-3.5 shrink-0'
  if (/phone/i.test(label)) return <Phone className={className} aria-hidden="true" />
  if (/email/i.test(label)) return <Mail className={className} aria-hidden="true" />
  if (/address/i.test(label)) return <MapPin className={className} aria-hidden="true" />
  return null
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2.5 text-[0.7rem] font-medium tracking-widest text-muted-foreground uppercase">
      {children}
    </h3>
  )
}

/**
 * One question and its answer.
 *
 * An unanswered field is rendered, not hidden, and says so in words. The
 * distinction matters operationally: "How Many Bathrooms?" left blank is
 * something to ask on the call, and a row that simply disappeared would look
 * like the question was never on the form.
 */
function Answer({ label, value }: { label: string; value: string }) {
  const answered = value.trim() !== ''
  const href = answered ? hrefFor(label, value) : null
  const icon = iconFor(label)
  return (
    <div className="flex flex-col gap-1 px-3.5 py-2.5 sm:flex-row sm:items-baseline sm:gap-3">
      <dt className="flex shrink-0 items-center gap-1.5 text-[0.75rem] text-muted-foreground sm:w-[15rem]">
        {icon}
        {label}
      </dt>
      <dd className="min-w-0 text-[0.85rem] break-words">
        {!answered ? (
          <span className="text-muted-foreground italic">Not answered</span>
        ) : href ? (
          <a href={href} className="cursor-pointer text-primary underline-offset-2 hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}

export function LeadSubmission({ lead }: { lead: LeadRecord }) {
  const fields = fieldsFor(lead.formType)
  const known = new Set(fields.map((f) => f.label))
  // Anything the form definition does not know about, so a newly-added form
  // field is visible here the day it starts arriving rather than the day
  // someone remembers to update schema.ts.
  const extras = Object.entries(lead.payload).filter(
    ([label, value]) => !known.has(label) && value.trim() !== '',
  )

  return (
    <div className="space-y-5">
      <div>
        <SectionHeading>
          {lead.formType === 'booking' ? 'Booking request' : 'Contact enquiry'}
        </SectionHeading>
        <dl className="divide-y divide-border rounded-lg border border-border bg-muted/30">
          {fields.map((f) => (
            <Answer key={f.label} label={f.label} value={lead.payload[f.label] ?? ''} />
          ))}
        </dl>
      </div>

      {extras.length > 0 && (
        <div>
          <SectionHeading>Other</SectionHeading>
          <dl className="divide-y divide-border rounded-lg border border-border bg-muted/30">
            {extras.map(([label, value]) => (
              <Answer key={label} label={label} value={value} />
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}

/**
 * The headline answer for a lead, for the list's Service column and the
 * sheet's subtitle -- the one thing an operator scanning the table needs
 * before deciding whether to open it.
 *
 * Falls back through the form's first question to null rather than inventing
 * a label, so a lead with an empty payload renders a dash instead of "".
 */
export function leadHeadline(lead: LeadRecord): string | null {
  const fields = fieldsFor(lead.formType)
  const first = fields[0]
  const value = first ? lead.payload[first.label] : undefined
  return value && value.trim() !== '' ? value : null
}
