'use client'

import { useState } from 'react'
import { updateSuburbsAction } from '../../actions'
import { BTN, BTN_PRIMARY, ErrorText, INPUT } from '../../ui'

/*
 * The suburb list is the one piece of researched data that becomes URLs, and
 * the one most likely to need a human correction (a neighbourhood the branch
 * does not actually serve, a name spelled the way locals write it). Editing it
 * here beats regenerating the whole research stage for one wrong row.
 *
 * Slugs are normalized server-side by updateSuburbsLogic, so the operator can
 * type "Coral Gables" into the slug box and get coral-gables — the hint under
 * the table says so rather than the field silently rewriting itself.
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
      <table className="w-full border-collapse text-[0.85rem]">
        <thead>
          <tr className="text-left text-[0.72rem] uppercase tracking-wide text-[#6b7680]">
            <th className="pb-2 font-semibold">Area name</th>
            <th className="pb-2 font-semibold">URL slug</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td className="py-1 pr-2">
                <input
                  className={INPUT}
                  value={row.name}
                  aria-label={`Area ${i + 1} name`}
                  onChange={(e) => edit(i, 'name', e.target.value)}
                />
              </td>
              <td className="py-1 pr-2">
                <input
                  className={INPUT}
                  value={row.slug}
                  aria-label={`Area ${i + 1} slug`}
                  onChange={(e) => edit(i, 'slug', e.target.value)}
                />
              </td>
              <td className="py-1">
                <button type="button" className={BTN} onClick={() => removeRow(i)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-2 text-[0.75rem] text-[#6b7680]">
        Slugs are cleaned on save (lowercase, hyphens). Leave a slug blank to build it from the
        name. Duplicate slugs and empty rows are dropped.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button type="button" className={BTN} onClick={addRow}>
          + Add area
        </button>
        <button type="button" className={BTN_PRIMARY} onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving…' : 'Save areas'}
        </button>
        {saved && <span className="text-[0.8rem] text-[#106b35]">Saved.</span>}
      </div>

      {error && <ErrorText>{error}</ErrorText>}
    </>
  )
}
