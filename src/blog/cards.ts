import type { CityContent } from '@/content/types'
import { cityHref } from '@/content/interpolate'
import type { BlogCard } from '@/data/blog'
import { postDate } from './format'
import type { BlogPostRecord } from './types'

/** Listing cards for blog-tool posts, in the order given. */
export function postCards(posts: BlogPostRecord[], c: Pick<CityContent, 'city' | 'status'>): BlogCard[] {
  return posts.map((post) => ({
    title: post.title,
    href: cityHref(c, `/blog/${post.slug}`),
    excerpt: post.excerpt,
    date: postDate(post.publishedAt),
    comments: 'No Comments',
    category: post.categories[0],
    thumb: post.imageUrl
      ? { src: post.imageUrl, width: 1200, height: 630, alt: post.imageAlt ?? post.title, external: true }
      : undefined,
  }))
}
