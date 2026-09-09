// zod v4 structured-output schemas, .strict() everywhere. NO min/max/length: the API rejects them; put counts in the prompt.

import { z } from 'zod'

// A local fact and what it means for cleaning. copySafe false = operator judgement only, never printed.
// Per-market operations facts, entered by a human. Optional means 'may be absent', never 'may be ignored'.
// Exempt from the no-min/max rule: never sent as an output format.
export const MarketOpsSchema = z
  .object({
    /** ZIP codes this branch actually serves. Operator-entered, never modelled. */
    zips: z.array(z.string()).optional(),
    /** "2024-03" — the month you started serving this market. */
    servingSince: z.string().optional(),
    /** First name only. "Maria". Never a surname. */
    crewLead: z.string().optional(),
    crewSize: z.number().int().positive().optional(),
    /** Rounded DOWN to a number you can defend if asked. */
    homesCleaned: z.number().int().nonnegative().optional(),
    /** Real reviews from customers IN this market. */
    reviews: z
      .array(
        z
          .object({
            quote: z.string(),
            firstName: z.string(),
            /** The area they live in, e.g. "Cinco Ranch". */
            area: z.string(),
            date: z.string().optional(),
          })
          .strict()
      )
      .optional(),
    // photos of this crew or market; alt written by the operator. Absent = no gallery.
    photos: z
      .array(z.object({ path: z.string(), alt: z.string() }).strict())
      .optional(),
  })
  .strict()
export type MarketOps = z.infer<typeof MarketOpsSchema>

export const ConditionSchema = z
  .object({
    condition: z.string(),
    implication: z.string(),
    copySafe: z.boolean(),
  })
  .strict()
export type Condition = z.infer<typeof ConditionSchema>

// One area's researched fact. `subdivisions` is the highest-value field: checkable, so never invented — empty is correct.
// A subdivision is not a suburb (Cinco Ranch sits inside Katy).
export const SuburbSchema = z
  .object({
    name: z.string(),
    slug: z.string(),
    subdivisions: z.array(z.string()),
    housingCharacter: z.string(),
    /** Other areas from the same list that border this one, by name. Code turns them into slugs and makes them symmetric. */
    neighbors: z.array(z.string()),
    conditions: z.array(ConditionSchema),
  })
  .strict()
export type Suburb = z.infer<typeof SuburbSchema>

// Research output. `conditions` and the per-suburb fields replaced `landmarks`, which fed one identical sentence per site.
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

// DeepSchema removed: the 'what is deep cleaning' text is canonical and static (src/data/deep-cleaning.ts)

// one area page's copy, three blocks so the similarity checker compares like with like
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

// one service page's local section; the word range lives in the prompt
export const ServiceCopySchema = z
  .object({
    /** 90-130 words. What this city's homes, climate or habits change. */
    local: z.string(),
  })
  .strict()
export type ServiceCopyOutput = z.infer<typeof ServiceCopySchema>

// HomeProseSchema removed: the ZIP/landmark sentences were identical across sites; ZIPs render as a list
