'use client'

import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SuburbVerdict } from '@/pipeline/stages'
import { cn } from '@/lib/utils'
import { updateSuburbsAction } from '../../actions'
import { ErrorText } from '../../../ui'

/*
 * The suburb list is the one piece of researched data that becomes URLs, and
 * the one most likely to need a human correction (a neighbourhood the branch
 * does not actually serve, a name spelled the way locals write it). Editing it
 * here beats regenerating the whole research stage for one wrong row.
 *
 * Slugs are normalized server-side by updateSuburbsLogic, so the operator can
 * type "Coral Gables" into the slug box and get coral-gables — the hint under
 * the table says so rather than the field silently rewriting itself.
 *
 * Stage 3: this is a single set of rows, not a desktop-table/mobile-card
 * pair like the Sites and Leads screens use — the two aria-labelled inputs
 * per row (`Area N name` / `Area N slug`) are asserted by scripts/admin-e2e.mjs
 * by count (`SUBURBS.length`), so rendering them twice for two breakpoints
 * would double that count. Each row reflows from a row to a stacked block
 * with Tailwind alone instead.
 *
 * Task 13: each row also carries a verdict chip, keyed by slug off `meta` —
 * the uniqueness score Task 12's research-stage gate already computed, so an
 * operator sees WHY an area survived (or was hand-added) rather than only
 * being able to infer it from a progress line that has already scrolled by.
 * `meta` is recomputed by the caller from the draft's research every render
 * (see page.tsx) rather than stored, so it can never drift once the operator
 * edits the row list here. A 'skip' area never reaches this screen at all —
 * the research stage already dropped it — so re-adding one by hand renders
 * as "Not researched" rather than as a chip this file has no data for.
 *
 * Chip styling borrows the sites screen's status-chip shape (rounded-md
 * border, sentence case, small text — src/app/admin/(console)/sites/status-
 * chips.tsx) rather than the bold all-caps StatusChip/LeadStatusChip pill:
 * these sit one per row next to a table of inputs, not as a single
 * page-level status, so the quieter chip reads better at that density. The
 * fill colors reuse the same success/warning tokens those pill chips use
 * (src/components/ui/badge.tsx), so the color vocabulary stays one thing
 * across the console even though the shape differs here.
 */

type Row = { name: string; slug: string }

export type SuburbMeta = { score: number; verdict: SuburbVerdict; reason: string }

const VERDICT_CHIP: Record<SuburbVerdict, { label: string; className: string }> = {
  build: { label: 'Researched', className: 'border-green-600/30 bg-green-50 text-green-700' },
  review: { label: 'Thin', className: 'border-amber-600/30 bg-amber-50 text-amber-700' },
  // Never actually reached — the research stage drops 'skip' areas before
  // this screen exists — kept only so this map stays exhaustive over
  // SuburbVerdict without an `as` cast.
  skip: { label: 'Skip', className: 'border-border bg-muted text-muted-foreground' },
}

function VerdictChip({ meta }: { meta: SuburbMeta | undefined }) {
  if (!meta) {
    return (
      <span
        title="Added by hand — not part of the researched list, so it has no uniqueness score."
        className="inline-flex shrink-0 items-center rounded-md border border-border bg-card px-2 py-0.5 text-[0.72rem] font-medium text-muted-foreground"
      >
        Not researched
      </span>
    )
  }
  const chip = VERDICT_CHIP[meta.verdict]
  return (
    <span
      title={meta.reason}
      className={cn(
        'inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[0.72rem] font-medium',
        chip.className,
      )}
    >
      {chip.label}
    </span>
  )
}

export default function SuburbsEditor({
  cityKey,
  initial,
  meta,
}: {
  cityKey: string
  initial: Row[]
  meta: Record<string, SuburbMeta>
}) {
  const [rows, setRows] = useState<Row[]>(initial.length > 0 ? initial : [{ name: '', slug: '' }])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function edit(index: number, field: keyof Row, value: string) {
    setSaved(false)
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  function addRow() {
    setSaved(false)
    setRows((prev) => [...prev, { name: '', slug: '' }])
  }

  function removeRow(index: number) {
    setSaved(false)
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    const result = await updateSuburbsAction(cityKey, rows)
    setSaving(false)
    if (result.ok) setSaved(true)
    else setError(result.error)
  }

  return (
    <>
      <div className="hidden gap-3 px-1 text-[0.72rem] font-semibold tracking-wide text-muted-foreground uppercase sm:flex">
        <span className="flex-1">Area name</span>
        <span className="flex-1">URL slug</span>
        <span className="w-28 shrink-0">Research</span>
        <span className="w-11 shrink-0" />
      </div>

      <div className="mt-1 space-y-3 sm:mt-1.5 sm:space-y-2">
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:gap-3 sm:border-0 sm:p-0"
          >
            <div className="flex-1">
              <Label htmlFor={`suburb-name-${i}`} className="mb-1 text-[0.75rem] font-normal text-muted-foreground sm:hidden">
                Area name
              </Label>
              <Input
                id={`suburb-name-${i}`}
                value={row.name}
                aria-label={`Area ${i + 1} name`}
                onChange={(e) => edit(i, 'name', e.target.value)}
                className="min-h-11 sm:min-h-9"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor={`suburb-slug-${i}`} className="mb-1 text-[0.75rem] font-normal text-muted-foreground sm:hidden">
                URL slug
              </Label>
              <Input
                id={`suburb-slug-${i}`}
                value={row.slug}
                aria-label={`Area ${i + 1} slug`}
                onChange={(e) => edit(i, 'slug', e.target.value)}
                className="min-h-11 sm:min-h-9"
              />
            </div>
            <div className="flex items-center sm:w-28 sm:shrink-0">
              <VerdictChip meta={meta[row.slug]} />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="min-h-11 min-w-11 shrink-0 self-end sm:size-9 sm:min-h-9 sm:min-w-9 sm:self-auto"
              onClick={() => removeRow(i)}
              aria-label={`Remove area ${i + 1}`}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[0.75rem] text-muted-foreground">
        Slugs are cleaned on save (lowercase, hyphens). Leave a slug blank to build it from the
        name. Duplicate slugs and empty rows are dropped.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className="min-h-11 sm:min-h-9" onClick={addRow}>
          <Plus className="size-4" aria-hidden="true" />
          Add area
        </Button>
        <Button
          type="button"
          className="min-h-11 sm:min-h-9"
          onClick={() => void save()}
          disabled={saving}
        >
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {saving ? 'Saving…' : 'Save areas'}
        </Button>
        {saved && <span className="text-[0.8rem] text-green-700">Saved.</span>}
      </div>

      {error && <ErrorText>{error}</ErrorText>}
    </>
  )
}
