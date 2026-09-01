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

/**
 * A local fact and what it means for cleaning, which is the only reason a
 * local fact belongs on this site at all.
 *
 * `implication` is not decoration. "Gulf humidity averages 75%" is useless to
 * a copywriter; "bathroom mildew and grout discolouration set in faster than
 * homeowners expect" is a sentence. The research stage is required to supply
 * both, and a condition that arrives without a real implication should be
 * dropped rather than padded.
 *
 * `copySafe: false` means the fact is for operator judgement only and must
 * never reach the page. Flood-pool proximity, crime statistics and household
 * income all belong in that bucket — genuinely useful when deciding whether
 * to build a market, and grotesque in cleaning copy. Every prompt that
 * receives conditions filters on this flag before rendering.
 */
export const ConditionSchema = z
  .object({
    condition: z.string(),
    implication: z.string(),
    copySafe: z.boolean(),
  })
  .strict()
export type Condition = z.infer<typeof ConditionSchema>

/**
 * One area page's worth of researched fact.
 *
 * `subdivisions` is the highest-value field in the whole pipeline and the one
 * the previous schema had no room for. Named developments — Cinco Ranch,
 * Firethorne, Cross Creek Ranch — are what a resident recognises and what a
 * competitor writing from three states away cannot fake. They are also
 * externally checkable, which is exactly why the model must never invent one:
 * an empty array is a correct answer and a fabricated name is the worst
 * failure this system can produce, because it is invisible to us and obvious
 * to the customer.
 *
 * NOTE ON GRANULARITY. A subdivision is not a suburb. Houston's first
 * generated run listed Cinco Ranch as a suburb alongside Katy, which contains
 * it — two pages competing for one place. The structuring prompt now names
 * that distinction explicitly, and this field is where the finer-grained
 * places are supposed to land.
 */
export const SuburbSchema = z
  .object({
    name: z.string(),
    slug: z.string(),
    subdivisions: z.array(z.string()),
    housingCharacter: z.string(),
    conditions: z.array(ConditionSchema),
  })
  .strict()
export type Suburb = z.infer<typeof SuburbSchema>

/**
 * Research output.
 *
 * CHANGED: `conditions` and the three new per-suburb fields are new; the
 * `landmarks` array is gone. The research brief has always asked for climate,
 * housing stock and the local conditions that dirty a house — this schema had
 * nowhere to put any of it, so the structuring pass dropped it and every
 * downstream prompt fell back on the model's own recall of the city. That
 * happens to work for Houston and quietly fails for somewhere the model knows
 * less well.
 *
 * Landmarks are removed rather than deprecated. They fed one sentence that was
 * byte-identical across every site in the network, and the live Minneapolis
 * landmark page earned 3,030 impressions and zero clicks across sixteen
 * months. Subdivisions do the job landmarks were meant to do, better.
 */
export const ResearchSchema = z
  .object({
    suburbs: z.array(SuburbSchema),
    conditions: z.array(ConditionSchema),
    zips: z.array(z.string()),
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

export const DeepSchema = z.object({ whatIs: z.string() }).strict()
export type DeepOutput = z.infer<typeof DeepSchema>

/**
 * One area page's generated copy. Three blocks, matching the three places in
 * src/data/suburb.ts where token substitution is replaced by a slot; the rest
 * of that page — CTA labels, the image grid, the other-services links — stays
 * template, correctly.
 *
 * The three are separated rather than returned as one blob so the similarity
 * checker can compare like against like across cities: a Katy `homes`
 * paragraph is only meaningfully comparable to a Sugar Land `homes` paragraph.
 */
export const SuburbCopySchema = z
  .object({
    /** Hero: that we work here, plus one concrete local fact. 60–90 words. */
    intro: z.string(),
    /** What the homes here are actually like. Names subdivisions. 90–130 words. */
    homes: z.string(),
    /** Local conditions and what we do about them. 90–130 words. */
    local: z.string(),
  })
  .strict()
export type SuburbCopyOutput = z.infer<typeof SuburbCopySchema>

/**
 * REMOVED: HomeProseSchema.
 *
 * It carried `zipParagraph` and `landmarksParagraph` — the two sentences the
 * old HOME_SYSTEM described as "deliberately identical across every Ivy Cleans
 * site". A byte-stable sentence repeated across a network of same-brand sites
 * is a fingerprint, not content, and a prose sentence listing twenty-seven ZIP
 * codes was never going to earn a click. ZIPs are still researched and still
 * stored; they now render as a compact list rather than as a paragraph, which
 * needs no model call at all.
 */
