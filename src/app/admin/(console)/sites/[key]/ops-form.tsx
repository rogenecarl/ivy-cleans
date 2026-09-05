'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { OpsFields } from '@/pipeline/admin-logic'
import { SubmitButton } from '../../../submit-button'
import { saveOpsAction } from '../site-actions'

type SaveState = { savedAt: number } | null

/*
 * The market's operator-entered facts, editable after creation.
 *
 * Before this form these could be typed only once, on /admin/new, and were
 * then destroyed by publishing (publishCity deletes the draft sidecar they
 * lived in). So a crew lead hired after launch, a homes-cleaned count that
 * grew, a first real review -- none of them had anywhere to go, on exactly
 * the cities that had been running long enough to have them.
 *
 * Same wrapper shape as SettingsForm alongside: on the happy path the action
 * returns and this toasts; a rejected review line calls redirect(), which
 * throws through this wrapper and re-renders the page at ?error=... instead,
 * so no false-positive toast fires on a save that did not happen.
 *
 * Every input is rendered with a defaultValue of '' rather than omitted --
 * parseOpsForm REJECTS an absent field rather than reading it as cleared, and
 * that is what stops one malformed POST erasing a market's facts.
 */
export function OpsForm({ cityKey, fields }: { cityKey: string; fields: OpsFields }) {
  const [state, formAction] = useActionState<SaveState, FormData>(async (_prev, formData) => {
    await saveOpsAction(cityKey, formData)
    return { savedAt: Date.now() }
  }, null)
  const savedAt = useRef<number | null>(null)

  useEffect(() => {
    if (state && state.savedAt !== savedAt.current) {
      savedAt.current = state.savedAt
      toast.success('Market facts saved')
    }
  }, [state])

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="zips" className="mb-1.5">
          ZIP codes you serve
        </Label>
        <Textarea
          id="zips"
          name="zips"
          rows={2}
          defaultValue={fields.zips ?? ''}
          placeholder="77002, 77003, 77004 — commas, spaces or one per line"
        />
        <p className="mt-1 text-[0.75rem] text-muted-foreground">
          Printed as a list on the home page. Anything that isn&rsquo;t five digits is ignored
          rather than guessed at.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="crewLead" className="mb-1.5">
            Crew lead
          </Label>
          <Input
            id="crewLead"
            name="crewLead"
            className="min-h-11 sm:min-h-9"
            defaultValue={fields.crewLead ?? ''}
            placeholder="First name only — Maria"
          />
        </div>

        <div>
          <Label htmlFor="servingSince" className="mb-1.5">
            Serving since
          </Label>
          <Input
            id="servingSince"
            name="servingSince"
            className="min-h-11 sm:min-h-9"
            defaultValue={fields.servingSince ?? ''}
            placeholder="2024-03"
          />
        </div>

        <div>
          <Label htmlFor="crewSize" className="mb-1.5">
            Crew size
          </Label>
          <Input
            id="crewSize"
            name="crewSize"
            inputMode="numeric"
            className="min-h-11 sm:min-h-9"
            defaultValue={fields.crewSize ?? ''}
            placeholder="4"
          />
        </div>

        <div>
          <Label htmlFor="homesCleaned" className="mb-1.5">
            Homes cleaned here
          </Label>
          <Input
            id="homesCleaned"
            name="homesCleaned"
            inputMode="numeric"
            className="min-h-11 sm:min-h-9"
            defaultValue={fields.homesCleaned ?? ''}
            placeholder="340"
          />
          <p className="mt-1 text-[0.75rem] text-muted-foreground">
            Printed on the page exactly as typed, so round down rather than up.
          </p>
        </div>
      </div>

      <p className="text-[0.75rem] text-muted-foreground">
        A crew lead or a homes-cleaned figure entered here <strong>must</strong> appear in the
        copy. If a page is given one and ignores it, publishing that city is refused &mdash; the
        whole point of these facts is that they end up on the page.
      </p>

      <div>
        <Label htmlFor="reviews" className="mb-1.5">
          Reviews from customers here
        </Label>
        <Textarea
          id="reviews"
          name="reviews"
          rows={5}
          defaultValue={fields.reviews ?? ''}
          placeholder={
            'One per line:  what they said | first name | area | month (optional)\n' +
            'They got the grout white again. | Maria | Cinco Ranch | 2025-06'
          }
        />
        <p className="mt-1 text-[0.75rem] text-muted-foreground">
          Separated by <code className="font-mono">|</code>, because real reviews are full of commas
          and dashes. A line that doesn&rsquo;t fit the shape is refused with its line number
          &mdash; nothing is saved until it&rsquo;s fixed, so a real quote can&rsquo;t go missing.
        </p>
      </div>

      <SubmitButton pendingLabel="Saving">Save market facts</SubmitButton>
    </form>
  )
}
