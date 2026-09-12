export type BlogPostRecord = {
  id: string
  cityKey: string
  externalId: string
  slug: string
  title: string
  html: string
  text: string
  excerpt: string
  metaTitle: string | null
  metaDescription: string | null
  imageUrl: string | null
  imageAlt: string | null
  categories: string[]
  tags: string[]
  publishedAt: Date
  updatedAt: Date
}

export type BlogPostInput = Omit<BlogPostRecord, 'id' | 'updatedAt'>
