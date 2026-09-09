import type { CityContent } from '../../content/types'
import { tenantHref } from '../routes'
import type { ArticleBlock, Inline, PostArticleData } from './types'

// A post with every link pointed at this tenant, or unlinked when the tenant has no such page.
export function postForCity(post: PostArticleData, c: CityContent): PostArticleData {
  const runs = (list: Inline[]): Inline[] =>
    list.flatMap((run): Inline[] => {
      if (typeof run === 'string') return [run]
      if ('b' in run) return [{ b: runs(run.b) }]
      if ('i' in run) return [{ i: runs(run.i) }]
      const href = tenantHref(c, run.href)
      return href === null ? runs(run.a) : [{ a: runs(run.a), href }]
    })

  const blocks = post.blocks.map((block): ArticleBlock => {
    if (block.type === 'img') return block
    if ('items' in block) return { ...block, items: block.items.map(runs) }
    return { ...block, text: runs(block.text) }
  })

  return {
    ...post,
    blocks,
    authorBox: { ...post.authorBox, href: tenantHref(c, post.authorBox.href) ?? '' },
    responses: post.responses && {
      ...post.responses,
      items: post.responses.items.map((item) => ({ ...item, href: tenantHref(c, item.href) ?? '' })),
    },
  }
}
