import { z } from 'zod'

// The blog tool's delivery body: https://blogr.ai/integrations/webhooks. Unknown fields are ignored so additions on
// their side don't break deliveries; `event` is checked by the receiver, not here, so new events read as "skip".
const ArticleSchema = z.object({
  id: z.union([z.number(), z.string()]),
  type: z.string(),
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  path: z.string().nullable().optional(),
  content_markdown: z.string().optional(),
  content_html: z.string().optional(),
  seo: z.object({ title: z.string().nullable().optional(), meta_description: z.string().nullable().optional() }).optional(),
  og_image_url: z.string().nullable().optional(),
  og_image_alt: z.string().nullable().optional(),
  target_keyword: z.string().nullable().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  published_at: z.string().optional(),
})

export const DeliverySchema = z.object({
  event: z.string(),
  test: z.boolean().optional(),
  article: ArticleSchema,
  website: z.object({ domain: z.string().trim().min(1) }),
})

export type Delivery = z.infer<typeof DeliverySchema>

/** Parsed delivery, or the first validation problem as text. */
export function parseDelivery(body: unknown): { ok: true; delivery: Delivery } | { ok: false; error: string } {
  const result = DeliverySchema.safeParse(body)
  if (result.success) return { ok: true, delivery: result.data }
  const issue = result.error.issues[0]
  return { ok: false, error: `${issue.path.join('.') || 'body'}: ${issue.message}` }
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** The tool's slug, lowercased and reduced to a-z0-9 and hyphens; null when nothing usable is left. */
export function normalizeSlug(raw: string): string | null {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return SLUG.test(slug) ? slug : null
}
