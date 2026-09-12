// The only module that speaks Prisma for blog posts; the client lives in src/lib/db.ts.
import { prisma } from '@/lib/db'
import type { BlogPost as Row } from '@/generated/prisma/client'
import type { BlogPostInput, BlogPostRecord } from './types'
import type { Candidate } from './similarity'

function toRecord(row: Row): BlogPostRecord {
  return {
    id: row.id,
    cityKey: row.cityKey,
    externalId: row.externalId,
    slug: row.slug,
    title: row.title,
    html: row.html,
    text: row.text,
    excerpt: row.excerpt,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    imageUrl: row.imageUrl,
    imageAlt: row.imageAlt,
    categories: row.categories,
    tags: row.tags,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
  }
}

/** Create or replace by (cityKey, externalId): a retried delivery updates the row it made. */
export async function upsertPost(input: BlogPostInput): Promise<BlogPostRecord> {
  const { cityKey, externalId, ...rest } = input
  const row = await prisma.blogPost.upsert({
    where: { cityKey_externalId: { cityKey, externalId } },
    create: { cityKey, externalId, ...rest },
    update: rest,
  })
  return toRecord(row)
}

/** The post another delivery already gave this slug in this city, or null. */
export async function postBySlug(cityKey: string, slug: string): Promise<BlogPostRecord | null> {
  const row = await prisma.blogPost.findUnique({ where: { cityKey_slug: { cityKey, slug } } })
  return row === null ? null : toRecord(row)
}

/** Newest first. */
export async function listPosts(cityKey: string): Promise<BlogPostRecord[]> {
  const rows = await prisma.blogPost.findMany({ where: { cityKey }, orderBy: { publishedAt: 'desc' } })
  return rows.map(toRecord)
}

const CANDIDATE_LIMIT = 300

/** Recent posts on every other city, for the duplicate check. */
export async function candidatesOutside(cityKey: string): Promise<Candidate[]> {
  const rows = await prisma.blogPost.findMany({
    where: { cityKey: { not: cityKey } },
    orderBy: { publishedAt: 'desc' },
    take: CANDIDATE_LIMIT,
    select: { cityKey: true, slug: true, title: true, text: true },
  })
  return rows
}
