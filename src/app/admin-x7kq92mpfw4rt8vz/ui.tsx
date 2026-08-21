import type { ReactNode } from 'react'
import type { CityStatus } from '@/pipeline/admin-logic'
import type { LeadStatus } from '@/leads/types'
import type { Readiness, ReadinessProblem } from '@/leads/readiness'

/*
 * Presentational scraps shared by the admin screens. Server-safe (no hooks,
 * no event handlers) so both server and client components can render them.
 * Deliberately tiny — this is an internal tool, not a design system.
 */

const CHIP: Record<CityStatus, { label: string; className: string }> = {
  live: { label: 'LIVE', className: 'bg-[#e6f4ea] text-[#106b35] border-[#a8d8ba]' },
  draft: { label: 'DRAFT', className: 'bg-[#fff4e5] text-[#8a5300] border-[#f0cf9a]' },
  generating: { label: 'GENERATING', className: 'bg-[#e8f0fe] text-[#1a4fb4] border-[#b4c9f2]' },
  'draft-unfinalized': {
    label: 'NEEDS FINALIZE',
    className: 'bg-[#e8f0fe] text-[#1a4fb4] border-[#b4c9f2]',
  },
  error: { label: 'ERROR', className: 'bg-[#fdeaea] text-[#a11212] border-[#f0b4b4]' },
}

export function StatusChip({ status }: { status: CityStatus }) {
  const chip = CHIP[status]
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide ${chip.className}`}
    >
      {chip.label}
    </span>
  )
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6 rounded-lg border border-[#d8dde2] bg-white p-5">
      <h2 className="mb-3 text-[1rem] font-semibold">{title}</h2>
      {children}
    </section>
  )
}

/** Shared button/link surface classes, so the two element types match. */
export const BTN =
  'inline-flex items-center rounded-md border border-[#c3cbd3] bg-white px-3 py-1.5 text-[0.85rem] font-medium text-[#1b1f23] hover:bg-[#eef1f4] disabled:cursor-not-allowed disabled:opacity-50'

export const BTN_PRIMARY =
  'inline-flex items-center rounded-md border border-transparent bg-[#1b6f56] px-4 py-2 text-[0.9rem] font-semibold text-white hover:bg-[#155a45] disabled:cursor-not-allowed disabled:opacity-50'

export const INPUT =
  'w-full rounded-md border border-[#c3cbd3] bg-white px-3 py-2 text-[0.9rem] outline-none focus:border-[#1b6f56]'

export const LABEL = 'mb-1 block text-[0.8rem] font-semibold text-[#3a444d]'

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 rounded-md border border-[#f0b4b4] bg-[#fdeaea] px-3 py-2 text-[0.8rem] text-[#a11212]">
      {children}
    </p>
  )
}

const LEAD_CHIP: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: 'NEW', className: 'bg-[#e8f0fe] text-[#1a4fb4] border-[#b4c9f2]' },
  contacted: { label: 'CONTACTED', className: 'bg-[#fff4e5] text-[#8a5300] border-[#f0cf9a]' },
  quoted: { label: 'QUOTED', className: 'bg-[#f3ecfb] text-[#5b2d90] border-[#d6c2ee]' },
  booked: { label: 'BOOKED', className: 'bg-[#e6f4ea] text-[#106b35] border-[#a8d8ba]' },
  lost: { label: 'LOST', className: 'bg-[#f2f4f6] text-[#6b7680] border-[#d8dde2]' },
}

export function LeadStatusChip({ status }: { status: LeadStatus }) {
  const chip = LEAD_CHIP[status]
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide ${chip.className}`}
    >
      {chip.label}
    </span>
  )
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded border border-[#dde2e7] bg-[#eef1f4] px-1.5 text-[0.65rem] font-semibold text-[#4a545d]">
      {children}
    </span>
  )
}

const PROBLEM_LABEL: Record<ReadinessProblem, string> = {
  'no-domain': 'NO DOMAIN',
  'no-inbox': 'NO INBOX',
  'email-failures': 'EMAIL FAILURES',
}

/** Launch-readiness for a single Sites row: one green chip when everything
 * checks out, or one red chip per unmet condition when it does not. */
export function ReadinessChips({ readiness }: { readiness: Readiness }) {
  if (readiness.ready) {
    return (
      <span className="inline-block rounded-full border border-[#a8d8ba] bg-[#e6f4ea] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[#106b35]">
        READY
      </span>
    )
  }
  return (
    <span className="flex flex-wrap gap-1">
      {readiness.problems.map((problem) => (
        <span
          key={problem}
          className="inline-block rounded-full border border-[#f0b4b4] bg-[#fdeaea] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[#a11212]"
        >
          {PROBLEM_LABEL[problem]}
        </span>
      ))}
    </span>
  )
}
