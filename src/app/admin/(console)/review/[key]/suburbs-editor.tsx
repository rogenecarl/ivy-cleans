'use client'

import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
 */

type Row = { name: string; slug: string }

export default function SuburbsEditor({
  cityKey,
  initial,
}: {
  cityKey: string
  initial: Row[]
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
