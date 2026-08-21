/**
 * Structured-output schemas for the Claude pipeline.
 *
 * zod v4, `.strict()` everywhere so an extra key from the model fails loudly
 * instead of silently passing through into content. NO min/max/length
 * constraints anywhere in this file — the API's structured outputs
 * (`output_config.format`) don't support numeric/string length constraints;
 * "about N items" expectations belong in the prompt, not the schema.
 */

import { z } from 'zod'

export const ResearchSchema = z
  .object({
    suburbs: z.array(z.object({ name: z.string(), slug: z.string() }).strict()),
    zips: z.array(z.string()),
    landmarks: z.array(z.string()),
    keywords: z.array(z.string()),
  })
  .strict()
export type ResearchOutput = z.infer<typeof ResearchSchema>

export const FrontSectionsSchema = z
  .object({
    heroParagraphs: z.array(z.string()),
    serviceIntro: z.array(z.string()),
    cards: z
      .object({
        dusting: z.string(),
        vacuuming: z.string(),
        bathroom: z.string(),
        window: z.string(),
        upholstery: z.string(),
      })
      .strict(),
  })
  .strict()
export type FrontSectionsOutput = z.infer<typeof FrontSectionsSchema>

export const HomeProseSchema = z
  .object({ zipParagraph: z.string(), landmarksParagraph: z.string() })
  .strict()
export type HomeProseOutput = z.infer<typeof HomeProseSchema>

export const DeepSchema = z.object({ whatIs: z.string() }).strict()
export type DeepOutput = z.infer<typeof DeepSchema>
