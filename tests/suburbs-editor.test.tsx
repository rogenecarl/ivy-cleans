// tests/suburbs-editor.test.tsx
/*
 * Task 13: the per-row verdict chip on the review screen's service-area
 * editor. scoreSuburbs (Task 9/12) already runs in the research stage and
 * drops the areas it scores 'skip' before this component ever sees them, so
 * the only verdicts SuburbsEditor is ever handed are 'build' and 'review' —
 * plus the absent case, when an operator adds a row by hand that scoreSuburbs
 * never scored at all.
 *
 * renderToStaticMarkup in plain node is enough, the same as
 * tests/lead-submission.test.tsx: this is a client component (useState), but
 * nothing here exercises an event handler — only the markup its initial
 * render produces.
 */
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SuburbsEditor, { type SuburbMeta } from '@/app/admin/(console)/review/[key]/suburbs-editor'

function render(meta: Record<string, SuburbMeta>) {
  return renderToStaticMarkup(
    <SuburbsEditor
      cityKey="ztest-chipville"
      initial={[
        { name: 'Researched Heights', slug: 'researched-heights' },
        { name: 'Hand-Added Hollow', slug: 'hand-added-hollow' },
      ]}
      meta={meta}
    />,
  )
}

describe('SuburbsEditor verdict chips', () => {
  it('renders a verdict chip per scored area and a not-researched chip for a hand-added row', () => {
    const markup = render({
      'researched-heights': {
        score: 9,
        verdict: 'build',
        reason: '3 subdivisions, 2 local conditions',
      },
    })
    expect(markup).toContain('Researched')
    expect(markup).toMatch(/not researched/i)
  })

  it('renders the amber "thin" chip for a review verdict, carrying the reason', () => {
    const markup = render({
      'researched-heights': {
        score: 5,
        verdict: 'review',
        reason: 'thin — enough for a page only if search demand justifies it',
      },
      'hand-added-hollow': {
        score: 9,
        verdict: 'build',
        reason: '4 subdivisions, 1 local condition',
      },
    })
    expect(markup).toContain('Thin')
    expect(markup).toContain('thin — enough for a page only if search demand justifies it')
    // Both rows are scored here, so the not-researched chip must not appear.
    expect(markup).not.toMatch(/not researched/i)
  })

  it('renders every row unresearched when meta is empty (e.g. a draft with no research yet)', () => {
    const markup = render({})
    const matches = markup.match(/not researched/gi) ?? []
    expect(matches).toHaveLength(2)
  })
})
