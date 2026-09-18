'use client'

import { useTransition } from 'react'
import { Loader2, RotateCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { removeAboutStoryAction, writeAboutStoryAction } from '../site-actions'

// The one model-written passage on the About page, written on demand from the saved facts and checked against them.
export function StoryPanel({ cityKey, story, ready }: { cityKey: string; story: readonly string[] | undefined; ready: boolean }) {
  const [busy, start] = useTransition()

  function write() {
    start(async () => {
      const result = await writeAboutStoryAction(cityKey)
      if (result.ok) toast.success(story ? 'Story rewritten' : 'Story written')
      else toast.error(result.error)
    })
  }

  function remove() {
    start(async () => {
      const result = await removeAboutStoryAction(cityKey)
      if (result.ok) toast.success('Story removed')
      else toast.error(result.error)
    })
  }

  return (
    <div className="space-y-4">
      {story ? (
        <div className="space-y-3 text-[0.9rem] leading-relaxed">
          {story.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      ) : (
        <p className="text-[0.85rem] text-muted-foreground">
          No story yet. The page reads fine without one: the facts, photos and reviews carry it. Write one when the
          facts above are saved.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy || !ready} className="min-h-11 sm:min-h-8" onClick={write}>
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <RotateCw className="size-3.5" aria-hidden="true" />}
          {story ? 'Rewrite from the facts' : 'Write from the facts'}
        </Button>
        {story && (
          <Button type="button" variant="outline" size="sm" disabled={busy} className="min-h-11 sm:min-h-8" onClick={remove}>
            <Trash2 className="size-3.5" aria-hidden="true" />
            Remove story
          </Button>
        )}
      </div>
      <p className="text-[0.75rem] text-muted-foreground">
        Two short paragraphs. Every name, number and year in it is checked against the facts; a draft that adds one is
        refused and nothing is saved.
      </p>
    </div>
  )
}
