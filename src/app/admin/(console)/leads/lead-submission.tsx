// src/app/admin/(console)/leads/lead-submission.tsx
// The one rendering of "what this customer submitted", shared by the list's sheet and /leads/<id>.
// Driven by the form definition, not the payload keys, so a skipped optional question still shows as blank.
// Unknown payload keys render at the end under "Other".
import type { ReactNode } from 'react'
import { Mail, MapPin, Phone } from 'lucide-react'
import { BOOKING_FIELDS, CONTACT_FIELDS, type LeadFormField } from '@/leads/schema'
import type { LeadRecord } from '@/leads/types'

function fieldsFor(formType: LeadRecord['formType']): readonly LeadFormField[] {
  return formType === 'booking' ? BOOKING_FIELDS : CONTACT_FIELDS
}

/** Phone/email values become tap-to-dial/write links; address does not. */
function hrefFor(label: string, value: string): string | null {
  if (/phone/i.test(label)) return `tel:${value.replace(/[^\d+]/g, '')}`
  if (/email/i.test(label)) return `mailto:${value}`
  return null
}

/* returns the element, not the component type — react-hooks/static-components */
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

// one question and its answer; an unanswered field is rendered and says so
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
  // anything the form definition doesn't know about
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

// the headline answer for the list's Service column and the sheet's subtitle; null rather than an invented label
export function leadHeadline(lead: LeadRecord): string | null {
  const fields = fieldsFor(lead.formType)
  const first = fields[0]
  const value = first ? lead.payload[first.label] : undefined
  return value && value.trim() !== '' ? value : null
}
