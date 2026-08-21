# Dynamic vs static content — authoritative list

Dictated by the user page-by-page on 2026-08-08 (superseding the meeting-map
draft where they differ). Rules legend:

- **STATIC** — copy stays byte-identical on every city site.
- **CITY** — copy stays as written, only the city/state name swaps
  (Minneapolis → Miami, "Minneapolis, MN" → "Miami, FL"). Applies to visible
  text, image alt text, and (assumed, flagged below) URL slugs.
- **AI** — Claude rewrites the copy focused on the chosen city, grounded in
  the deep-research step (entities, keywords, climate, housing).
- **RESEARCH** — factual local data produced by the Claude research skill
  with web search (suburb lists, ZIP codes, landmarks, map).
- **FACT** — human-entered by Abdi in the admin form, never through AI
  (phone number; later: address, booking link as applicable).
- **IMAGE-LATER** — will be AI-generated eventually; not implemented now
  (images stay as-is until then).

Site-wide rules (apply on every page):
- Phone **612-424-0391** → FACT wherever it appears, including CTA bands
  ("Prefer to call? We're available now.") and headers/footers.
- "SET AN APPOINTMENT" / "Set an appointment" / "Book A Cleaning" /
  "Call Us Now!" buttons and their lead-in lines → STATIC.
- Any stray city mention in otherwise-static copy → CITY.
- Image alt texts containing the city ("home cleaning services minneapolis
  mn") → CITY.

## `/` (front page)

| Section | Class |
|---|---|
| Hero H1 "Professional Cleaning Services Minneapolis, MN" | "Professional Cleaning Services" STATIC + CITY |
| Hero intro paragraphs ("Ivy Cleans is known to provide an array…" incl. the dusting/vacuuming/bathroom/window climate paragraphs) | AI |
| Service blocks: Dusting / Vacuuming / Bathroom Cleaning / Window Cleaning / Upholstery Cleaning | Labels STATIC; body texts AI; images IMAGE-LATER |
| "Ready For a Sparkling Clean House? Book Your Cleaning Service Minneapolis" | STATIC + CITY |
| FEATURED IN strip | STATIC |
| "Your Happiness is our Priority" | STATIC |
| "Our Cleaning Service Packages" intro paragraph | STATIC + CITY |
| All 10 package cards (Standard, Deep, Move In/Out, Condo, AirBnB, Rental, Renovation & Post Construction, Eco Friendly Green, Commercial & Office, Maid Service) | STATIC |
| "House Cleaning Services Near Me in Minneapolis, MN" | STATIC + CITY |
| "Areas We Serve" heading | STATIC |
| 24-suburb list | RESEARCH (best local areas for the chosen city) |
| Map | RESEARCH (chosen city's map) |
| "Our Values & Guarantee" (two paragraphs) | STATIC + CITY (two mentions) |
| "Our Cleaning Work In Action" + before/after images | STATIC |
| Reviews: "Ivy Cleans Minneapolis" label | STATIC + CITY |
| Reviews: rating, count, all review texts | STATIC (real reviews reused — never AI-generate) |
| FAQ (all 10 Q&As) | STATIC (+CITY/FACT if a city or phone appears) |
| Blog strip ("Latest From The Ivy Cleans Blog" + 3 cards) | STATIC (blog is a separate later project) |

## `/home`

| Section | Class |
|---|---|
| "Cleaning Services Minneapolis" H1 | STATIC + CITY |
| "As a local and insured business…" paragraphs | AI |
| "Professional Cleaning Services Minneapolis, MN" + "Ivy Cleans is known to provide an array…" paragraphs | STATIC+CITY heading; AI paragraphs |
| Five service blocks (same as `/`) | Labels STATIC; texts AI; images IMAGE-LATER; alts CITY |
| "Cleaning Services Near Me In Minneapolis, MN" + quality cards (Attention to Detail, Eco-Friendly, Staff, Plans, Pricing) | STATIC + CITY (5 mentions) |
| "House Cleaning Services Minneapolis" section | STATIC + CITY (incl. "Deep Cleaning in Minneapolis" / "Move-out cleaning Minneapolis" links) |
| "Our Principles And Assurance" | STATIC (no city present) |
| "Locations": suburb list | RESEARCH |
| "Locations": ZIP codes | RESEARCH (real ZIPs, web-grounded) |
| "Locations": landmarks sentence | RESEARCH (real landmarks) + CITY |
| "Our Cleaning Work In Action" | STATIC |
| Full FAQ (10 Q&As with answers) | STATIC |
| "Trust Us For Your House Cleaning Needs…" closer | STATIC |

## `/cleaning-services`

Entire cleaning-plans table (Basic/Deep/Moving columns, all room
checklists, Book Now buttons) → STATIC.

## `/deep-cleaning-minneapolis`

| Section | Class |
|---|---|
| URL slug | CITY (confirmed by user → `/deep-cleaning-miami`) |
| "Deep Cleaning Minneapolis" hero + intro | STATIC + CITY |
| "What is Deep House Cleaning?" paragraph | AI |
| "Benefits of Deep Cleaning Minneapolis" (paragraphs + 5-item list) | STATIC + CITY |
| "Deep Cleaning Services Minneapolis" (lead-in + 6-item list) | STATIC + CITY |
| "We understand that every home…" closing band | STATIC + CITY (2 mentions) |
| "Why Choose Ivy Cleans for Deep Cleaning Minneapolis?" (paragraphs + 4 quality cards + closer) | STATIC + CITY (~6 mentions) |

## `/minneapolis-move-out-cleaning-services`

| Section | Class |
|---|---|
| URL slug | CITY (confirmed by user → e.g. `/miami-move-out-cleaning-services`) |
| Entire page (hero, all paragraphs, "What services are included" checklist, quality cards, cost section) | STATIC + CITY (~9 mentions) |

## `/blog`

STATIC — unchanged for now; blog machine is a separate later tool.

## `/contact`

STATIC layout and copy — but the city-specific location details swap
(confirmed by user): phone → FACT (Abdi's number for the city), and any
city name, address, or map → the chosen city's.

NOTE (found during implementation 2026-08-08): the live site shows THREE
address variants — front chrome "Road,West Unit 208 … N 55416" (typo'd),
footer "Road, West Unit 208 … MN 55416" (clean, = CityContent.address),
and contact page "Road Suite 208 …" (third variant). For Minneapolis
fidelity the contact-page variant stays a literal; for a NEW city the
contact page should use the single entered address — wire this in Plan 2/3
when the admin form collects it.

## `/faq`

STATIC (+CITY/FACT rule if city/phone appears in an answer).

## `/book`, `/book-now`

SKIPPED for now, per user (2026-08-08).

## Suburb/area pages (`areas.ts`, 24 pages)

SKIPPED for now, per user (2026-08-08) — same as `/book`. Note for the
design: a new city's Areas We Serve suburb list must therefore render
without links (or the links must be hidden) until suburb pages are in
scope, otherwise they would 404.

## Suburb ("Areas We Serve") pages — dictated 2026-08-14, reference captured

Reference: docs/superpowers/reference/ivycleans-live/suburb-savage.html
(live /cleaning-service-savage-mn/). All 24 live suburb pages are word-identical
except the suburb name; URL slugs are STORED data (four mixed patterns).

Two tokens only. {suburb} = the area name (e.g. Savage), {city} = the metro
(e.g. Minneapolis). No AI writing on these pages — pure token substitution.

- <title>: "House Cleaning Service In {suburb}, {ST}"
- H1: "{suburb}, {ST} Cleaning Services"
- Hero paragraph: STATIC except the metro: "...house cleaning services to
  individuals in {city} and the surrounding areas..." + "Contact us today to
  book your quote." + Set an appointment CTA (static)
- "House Cleaning {suburb} {ST}" section: "Do you live in {suburb} {ST}?
  You're in luck our cleaning services span the entire {city} area..." (rest static)
- "Benefits of House Cleaning {suburb}": body static, except "...benefits to
  deep cleaning your home in {city}, including:" + the 5 benefits bullets static
- "Our Different Services": "Other Services Offered In {suburb} Include:
  Move-Out Cleanings {suburb} / Deep Cleaning {suburb}" (links to the two
  service pages of the tenant)
- "Our Work In Action": static images (rn_image_picker_* + Untitled design)
- Closing: "We understand that every home in {suburb} is unique..." +
  "Contact us today to discuss your deep cleaning requirements in {city}."
