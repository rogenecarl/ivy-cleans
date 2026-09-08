'use client'

import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SuburbVerdict } from '@/pipeline/stages'
import { cn } from '@/lib/utils'
import { updateSuburbsAction } from '../../actions'
import { ErrorText } from '../../../ui'

// The suburb list becomes URLs and is the researched data most likely to need a human fix. Slugs are normalised
// server-side. One set of rows (scripts/admin-e2e.mjs counts the inputs). Each row carries the uniqueness verdict,
// recomputed by the caller every render; a hand-added row shows "Not researched".

type Row = { name: string; slug: string }

export type SuburbMeta = { score: number; verdict: SuburbVerdict; reason: string }

const VERDICT_CHIP: Record<SuburbVerdict, { label: string; className: string }> = {
  build: { label: 'Researched', className: 'border-green-600/30 bg-green-50 text-green-700' },
  review: { label: 'Thin', className: 'border-amber-600/30 bg-amber-50 text-amber-700' },
  // never reached ('skip' is dropped at research); keeps the map exhaustive
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
            <div className="flex-1 min-w-0">
              <span className="text-[0.75rem] text-muted-foreground sm:hidden">Area name</span>
              <p className="truncate text-[0.9rem] font-medium">{row.name}</p>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[0.75rem] text-muted-foreground sm:hidden">URL slug</span>
              <p className="truncate font-mono text-[0.8rem] text-muted-foreground">{row.slug}</p>
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
        Research picks these. Remove any area you don&rsquo;t actually serve &mdash; a page for one
        would claim you clean there. Adding and renaming are deliberately not offered: a
        hand-typed area has no research behind it, so its page would render the generic template,
        and a rename keeps the old area&rsquo;s developments under the new name.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
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
