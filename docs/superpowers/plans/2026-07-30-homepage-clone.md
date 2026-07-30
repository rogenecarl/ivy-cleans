# Ivy Cleans Homepage Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pixel-perfect rebuild of the https://ivycleans.com/ homepage as a static Next.js page.

**Architecture:** One static App Router route (`src/app/page.tsx`) composed of one component per homepage section. All copy lives in typed data files under `src/data/`. Real images are downloaded from the live site into `public/`. A final fidelity pass compares screenshots of the local build against the live site and fixes drift.

**Tech Stack:** Next.js 16.2.12 (App Router, Turbopack), React 19, Tailwind CSS 4 (`@tailwindcss/postcss`), TypeScript, pnpm.

## Global Constraints

- **Read `node_modules/next/dist/docs/` guidance (already done, summarized here):** standard App Router conventions apply, EXCEPT: the `priority` prop on `next/image` is **deprecated in Next 16** — use `fetchPriority="high"` + `loading="eager"` (or `preload`) instead. Do NOT use `export const dynamic` / `revalidate` (removed/legacy in 16); a page with no request-time inputs is prerendered static automatically. `next build` does NOT lint — run `pnpm lint` separately.
- Package manager: **pnpm**. No new runtime dependencies. Dev-only tools via `pnpm dlx` are fine.
- Root font size is browser default **16px** on the live site (no 62.5% trick) — rem values in the reference CSS are literal (e.g. hero H1 `7.2rem` ≈ 115px).
- Brand tokens (from live Elementor CSS): rust `#BF360C`, brand green `#40907A`, hero-heading green `#37745F`, peach `#FEF3F0`. Font: **Raleway** everywhere.
- Live-site reference files (consult for exact values): `docs/superpowers/reference/ivycleans-live/` — `ivycleans.html` (full rendered homepage), `post-2035.css` (homepage styles), `post-6.css` (global kit), `content-dump.txt` (all text/images in document order). To find which section a CSS rule styles: take the `elementor-element-XXXXXXX` id from the selector and search that id in `ivycleans.html` to see the surrounding content.
- All copy in data files must be **verbatim** from the live site (including the address typo "N 55416" and the ", MN" phrasings). EXCLUDE the "Vavada Casino" paragraph found before the reviews section — it is injected spam, not site content.
- Phone: `612-424-0391` (`tel:6124240391`), email `Support@ivycleans.com`, booking CTA target `/book-now`.
- Responsive breakpoints on the live site: desktop ≥1025px, tablet ≤1024px, mobile ≤767px. Map to Tailwind: base = mobile, `md:` = tablet (768+), `lg:` = desktop (1024+).
- Elementor content max-width is 1140px: use `mx-auto max-w-[1140px] px-4` for section inners.
- Commit after every task with the message given in the task.

## Recurring type scale (from `post-2035.css`)

| Element | Desktop | Tablet | Mobile |
|---|---|---|---|
| Hero H1 | 7.2rem, line-height 1, `#37745F` | 4rem | 3rem |
| Section H2 | 4.5rem | 4rem | 2.8rem |
| CTA band H2 (white) | 4.5rem | 4rem | 2.8rem |
| CTA band phone H3 | 3.6rem, 700 | 3rem | 2.6rem |
| Card H3 | 2.2rem, 400 | — | 1.8rem |
| Buttons | rust bg, white text, 1.8rem (hero: 2.4rem), 1px rust border; hover: white bg, rust text |

---

### Task 1: Assets, design tokens, font, root layout

**Files:**
- Create: `scripts/download-assets.sh`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: `public/images/<original-filename>` for all live-site images; `public/icons/<brand>.svg` social icons; Tailwind color utilities `rust`, `brand`, `herogreen`, `peach`; `--font-raleway` variable wired to Tailwind's `font-sans`.

- [ ] **Step 1: Write the asset download script**

```bash
#!/usr/bin/env bash
# scripts/download-assets.sh — pull real assets from the live site
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/images public/icons

BASE="https://ivycleans.com/wp-content/uploads"
IMAGES=(
  2023/05/Logo.png
  2023/06/dusting.jpg 2023/06/vacuuming.jpg 2023/06/bathroom-cleaning.jpg
  2023/06/window.jpg 2023/06/upholstery.jpg
  2023/11/before.jpg 2023/11/after.jpg
  2023/11/cleaning-bg2.jpg 2023/11/faq-bg.jpg
  2023/12/Logo.png 2023/12/Group-5.png 2023/12/logo-mbl1.png 2023/12/logo-mbl2.png
  2023/12/guarantee-icon-1.png
  2023/12/icon1.png 2023/12/icon2.png 2023/12/icon3.png 2023/12/icon4.png 2023/12/icon5.png
  2023/12/icon6.png 2023/12/icon7.png 2023/12/icon8.png 2023/12/icon9.png 2023/12/icon10.png
  2023/12/bg.jpg 2023/12/sec01-bgg.jpg 2023/12/Rectangle-12.jpg
  2023/12/pexels-la-miko-36167641.jpg "2023/12/woman-holding-spray-cleaner-1.png"
  2024/03/image-12.webp 2024/03/image-8.webp 2024/03/image-15.webp
  2023/12/ChIJT35locmWcKMRgykID0Xc2Vo_44e964bc48926e05964972e6c042257c.jpg
  2023/12/ChIJT35locmWcKMRgykID0Xc2Vo_336b91c4074d8ba6be3c75cb1fbe3538.jpg
  2023/12/ChIJT35locmWcKMRgykID0Xc2Vo_463c35959d5dbbd33f15d6ef7858cd18.jpg
  2023/12/ChIJT35locmWcKMRgykID0Xc2Vo_56247593c8630ce7a36d64aff55ab241.jpg
  2023/12/ChIJT35locmWcKMRgykID0Xc2Vo_26c0418afaf76eae62c81a42683725ff.jpg
  2023/12/ChIJT35locmWcKMRgykID0Xc2Vo_51b83e9a17d78c72d5a00c5714507752.jpg
  2023/12/ChIJT35locmWcKMRgykID0Xc2Vo_b6f41b6f1e06107b29211a5aeb0c6878.jpg
  2023/12/ChIJT35locmWcKMRgykID0Xc2Vo_db464bae7301c38f8607cd4ff2652a30.jpg
  2023/12/ChIJT35locmWcKMRgykID0Xc2Vo_1d694dba7949954b92bc22ef5a96f457.jpg
)
for path in "${IMAGES[@]}"; do
  name="$(basename "$path")"
  # 2023/12/Logo.png collides with 2023/05/Logo.png — keep the footer one distinct
  if [ "$path" = "2023/12/Logo.png" ]; then name="Logo-footer.png"; fi
  [ -f "public/images/$name" ] || curl -sf --retry 3 --max-time 120 "$BASE/$path" -o "public/images/$name"
  echo "ok $name"
done

for icon in facebook x youtube instagram pinterest tiktok; do
  [ -f "public/icons/$icon.svg" ] || curl -sfL --retry 3 "https://unpkg.com/simple-icons@13/icons/$icon.svg" -o "public/icons/$icon.svg"
  echo "ok $icon.svg"
done

# real favicon (replaces the create-next-app default)
curl -sf --retry 3 --max-time 120 "$BASE/2023/05/cropped-favicon-32x32.png" -o src/app/icon.png
rm -f src/app/favicon.ico
echo "ok icon.png"
```

- [ ] **Step 2: Run it and verify**

Run: `chmod +x scripts/download-assets.sh && ./scripts/download-assets.sh && ls public/images | wc -l && ls public/icons | wc -l`
Expected: every line prints `ok <name>`; 42 files in `public/images`, 6 in `public/icons`, plus `src/app/icon.png`. (The live host is slow — retries are normal. If any file 404s, find its exact URL in `docs/superpowers/reference/ivycleans-live/ivycleans.html` and correct the list.)

- [ ] **Step 3: Replace `src/app/globals.css`**

```css
@import "tailwindcss";

@theme inline {
  --font-sans: var(--font-raleway);
}

@theme {
  --color-rust: #bf360c;
  --color-brand: #40907a;
  --color-herogreen: #37745f;
  --color-peach: #fef3f0;
  --color-star: #f8af0d;
}

body {
  font-family: var(--font-sans);
  color: #000;
  background: #fff;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 4: Replace `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "./globals.css";

const raleway = Raleway({ subsets: ["latin"], variable: "--font-raleway" });

export const metadata: Metadata = {
  title: "House Cleaning Service in Minneapolis Minnesota - Ivy Cleans",
  description:
    "As a local and insured business, Ivy Cleans is thrilled to be providing cleaning and janitorial services across various areas of Minneapolis. Our experienced",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-US" className={raleway.variable}>
      <body>{children}</body>
    </html>
  );
}
```

(The truncated description is verbatim from the live site's meta tag. `TopBar`/`Header`/`Footer` get added to this layout in Tasks 3 and 10.)

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: build succeeds; route `/` listed as static.

- [ ] **Step 6: Commit**

```bash
git add -A scripts/download-assets.sh public/images public/icons src/app
git commit -m "feat: assets, design tokens, Raleway font, root layout"
```

---

### Task 2: Content data files

**Files:**
- Create: `src/data/site.ts`, `src/data/services.ts`, `src/data/packages.ts`, `src/data/areas.ts`, `src/data/reviews.ts`, `src/data/faqs.ts`, `src/data/posts.ts`

**Interfaces:**
- Produces (consumed by all component tasks):
  - `site: { phone; phoneHref; email; address; bookingUrl; nav: {label; href}[]; socials: {label; href; icon}[]; googleMapsUrl; writeReviewUrl }`
  - `serviceIntro: string[]`, `services: { title; text; image; alt }[]`
  - `packagesIntro: string`, `packages: { title; text; icon }[]`
  - `areas: { name; href }[]`
  - `reviewsSummary: { rating: number; count: number }`, `reviews: { name; avatar; profileUrl; rating: number; time; text }[]`
  - `faqs: { q: string; a: string }[]`
  - `posts: { title; href; image; alt }[]`

All copy below is verbatim from the live site (see `content-dump.txt` for provenance). Do not paraphrase.

- [ ] **Step 1: Create `src/data/site.ts`**

```ts
export const site = {
  phone: "612-424-0391",
  phoneHref: "tel:6124240391",
  email: "Support@ivycleans.com",
  address: "5821 Cedar Lake Road,West Unit 208, Minneapolis, N 55416",
  bookingUrl: "/book-now",
  googleMapsUrl: "https://maps.google.com/?cid=6546505722522773891",
  writeReviewUrl:
    "https://search.google.com/local/writereview?placeid=ChIJT35locmWcKMRgykID0Xc2Vo",
  nav: [
    { label: "Home", href: "/home" },
    { label: "Cleaning Services", href: "/cleaning-services" },
    { label: "Deep Cleaning Minneapolis", href: "/deep-cleaning-minneapolis" },
    {
      label: "Minneapolis Move Out Cleaning Services",
      href: "/minneapolis-move-out-cleaning-services",
    },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
    { label: "FAQ", href: "/faq" },
  ],
  socials: [
    { label: "Facebook", href: "https://www.facebook.com/ivy.cleans1/", icon: "/icons/facebook.svg" },
    { label: "Twitter", href: "https://twitter.com/Ivycleans", icon: "/icons/x.svg" },
    { label: "YouTube", href: "https://www.youtube.com/channel/UCZIsiCt4aoUbrzbPmpVwQGA", icon: "/icons/youtube.svg" },
    { label: "Instagram", href: "https://www.instagram.com/ivy.cleans1/", icon: "/icons/instagram.svg" },
    { label: "Pinterest", href: "https://www.pinterest.com/ivycleans/", icon: "/icons/pinterest.svg" },
    { label: "TikTok", href: "https://www.tiktok.com/@ivy.cleans1", icon: "/icons/tiktok.svg" },
  ],
} as const;
```

Note: "Deep Cleaning Minneapolis" and "Minneapolis Move Out Cleaning Services" render as a dropdown under "Cleaning Services" on the live site — the `Header` task handles that; keep the flat list here with all 7 entries.

- [ ] **Step 2: Create `src/data/services.ts`** — hero/intro copy and the 5 service cards. Copy each string EXACTLY from `content-dump.txt` lines 38–42 (hero paragraphs), 52–56 (intro paragraphs), and 57–71 (cards). Structure:

```ts
export const heroParagraphs: string[] = [
  "As a local and insured business, Ivy Cleans is thrilled to be providing cleaning and janitorial services across various areas of Minneapolis. …", // line 38, full text
  "That is why we hold fast to the notion that our services are the top most in the Minneapolis area. …", // line 39, full text
  "Do you have a mess that needs cleaning? Or perhaps you’re after a cleaner household or workplace? Do you have any cleaning project on your radar?",
  "Whether it’s your home or business, give our professional cleaning company a call today, request your quote, and put our skills to an effective test!",
  "Call our professional cleaning company Ivy Cleans today, get an estimate of our prices and put us to the test!",
];

export const serviceIntro: string[] = [
  "Ivy Cleans is known to provide an array of professional cleaning services including home cleaning services and maid service in Minneapolis and nearby cities. …", // line 52, full text
  "Whether you live in a quiet suburb or the bustling heart of Minneapolis, one thing is certain – dusting is an unavoidable part of maintaining a clean home. …", // line 53, full text
  "Given Minneapolis’ infamous cold winters where indoor living is predominant, maintaining clean floors and carpets is vital. …", // line 54, full text
  "Just like the janitorial services we offer for local businesses, our residential cleaning services include comprehensive bathroom cleaning – a necessary yet often dreaded task. …", // line 55, full text
  "The cold and snow-laden winters of Minneapolis might make window cleaning a daunting task but fret not as Ivy Cleans has got you covered. …", // line 56, full text
];

export type Service = { title: string; text: string; image: string; alt: string; width: number; height: number };
export const services: Service[] = [
  { title: "Dusting", text: "Dusting is an essential part of keeping a home clean and healthy. …", image: "/images/dusting.jpg", alt: "home cleaning services minneapolis mn", width: 401, height: 275 }, // text: line 59 full
  { title: "Vacuuming", text: "…", image: "/images/vacuuming.jpg", alt: "", width: 401, height: 275 }, // line 62 full
  { title: "Bathroom Cleaning", text: "…", image: "/images/bathroom-cleaning.jpg", alt: "bathroom-cleaning minneapolis", width: 401, height: 275 }, // line 65 full
  { title: "Window Cleaning", text: "…", image: "/images/window.jpg", alt: "", width: 401, height: 275 }, // line 68 full
  { title: "Upholstery Cleaning", text: "…", image: "/images/upholstery.jpg", alt: "professional cleaning services minneapolis", width: 401, height: 275 }, // line 71 full
];
```

The `…` markers above exist ONLY to keep this plan readable — in the actual file every string must be the complete verbatim text from the referenced `content-dump.txt` line. Same rule applies to Steps 3–7.

- [ ] **Step 3: Create `src/data/packages.ts`** — intro paragraph (line 77) plus all 10 packages (lines 78–107):

```ts
export const packagesIntro =
  "Under this section, we provide different types of cleaning services in Minneapolis. …"; // line 77 full

export type Pkg = { title: string; text: string; icon: string };
export const packages: Pkg[] = [
  { title: "Standard Cleaning", text: "Maintaining frequently used sections of your household ensures a worry-free living experience. Choose between scheduling one-time, bi-weekly, or monthly services!", icon: "/images/icon1.png" },
  { title: "Deep Cleaning", text: "A comprehensive sanitation of your residence, encompassing inaccessible regions such as beneath furniture and appliances, as well as baseboards and window sills.", icon: "/images/icon6.png" },
  { title: "Move In/Move Out Cleaning", text: "…", icon: "/images/icon2.png" }, // line 86
  { title: "Condo Cleaning", text: "…", icon: "/images/icon7.png" }, // line 89
  { title: "AirBnB Cleaning", text: "…", icon: "/images/icon3.png" }, // line 92
  { title: "Rental Cleaning", text: "…", icon: "/images/icon8.png" }, // line 95
  { title: "Renovation & Post Construction Cleaning", text: "…", icon: "/images/icon4.png" }, // line 98
  { title: "Eco Friendly Green Cleaning", text: "…", icon: "/images/icon9.png" }, // line 101
  { title: "Commercial & Office Cleaning", text: "…", icon: "/images/icon5.png" }, // line 104
  { title: "Maid Service", text: "…", icon: "/images/icon10.png" }, // line 107
];
```

Icon order matters — it alternates (icon1, icon6, icon2, icon7, icon3, icon8, icon4, icon9, icon5, icon10) exactly as above.

- [ ] **Step 4: Create `src/data/areas.ts`** — all 24 areas, verbatim hrefs from content-dump lines 113–160 (note the path patterns vary: `house-cleaning-apple-valley`, `cleaning-services-farmington`, `cleaning-service-maplewood`, `vadnais-heights-cleaning-services` — copy each exactly, as root-relative paths):

```ts
export type Area = { name: string; href: string };
export const areas: Area[] = [
  { name: "Apple Valley", href: "/house-cleaning-apple-valley" },
  { name: "Farmington", href: "/cleaning-services-farmington" },
  { name: "Rosemount", href: "/cleaning-services-rosemount" },
  { name: "Lakeville", href: "/cleaning-services-lakeville" },
  { name: "Eagan", href: "/cleaning-services-eagan" },
  { name: "Burnsville", href: "/cleaning-services-burnsville" },
  { name: "Bloomington", href: "/cleaning-services-bloomington" },
  { name: "Shakopee", href: "/cleaning-services-shakopee" },
  { name: "Eden Prairie", href: "/cleaning-services-eden-prairie" },
  { name: "Hopkins", href: "/cleaning-services-hopkins" },
  { name: "St. Louis Park", href: "/cleaning-services-st-louis-park" },
  { name: "Edina", href: "/cleaning-services-edina" },
  { name: "Inver Grove", href: "/cleaning-services-inver-grove" },
  { name: "Maple Grove", href: "/cleaning-services-maple-grove" },
  { name: "Maplewood", href: "/cleaning-service-maplewood" },
  { name: "St. Paul", href: "/cleaning-service-st-paul" },
  { name: "New Brighton", href: "/cleaning-service-new-brighton" },
  { name: "Plymouth", href: "/cleaning-service-plymouth-mn" },
  { name: "Richfield", href: "/cleaning-service-richfield" },
  { name: "Roseville", href: "/cleaning-services-roseville" },
  { name: "Savage", href: "/cleaning-service-savage-mn" },
  { name: "Wayzata", href: "/cleaning-service-wayzata" },
  { name: "Woodbury", href: "/cleaning-service-woodbury" },
  { name: "Vadnais Heights", href: "/vadnais-heights-cleaning-services" },
];
```

- [ ] **Step 5: Create `src/data/reviews.ts`** — summary + all 9 reviews. Review texts are in content-dump line 200 (one blob — split at each reviewer name); avatar filename ↔ reviewer mapping and profile URLs are in `ivycleans.html` (search `wp-google-name` and the adjacent `grw-img`/`maps/contrib` markup). Ratings were extracted from the live markup: all 5 except Leslie = 4 and Dominic Anderson = 1.

```ts
export const reviewsSummary = { rating: 4.6, count: 85 };

export type Review = {
  name: string; avatar: string; profileUrl: string;
  rating: number; time: string; text: string;
};
export const reviews: Review[] = [
  { name: "John Gallo", avatar: "/images/ChIJT35locmWcKMRgykID0Xc2Vo_44e964bc48926e05964972e6c042257c.jpg", profileUrl: "https://www.google.com/maps/contrib/116983263166051036588/reviews", rating: 5, time: "3 years ago", text: "Bailey is amazing! Great job! Attention to detail and always on time! Definitely recommend Ivy Cleans and Bailey." },
  { name: "Thomas Jagger", avatar: "/images/ChIJT35locmWcKMRgykID0Xc2Vo_336b91c4074d8ba6be3c75cb1fbe3538.jpg", profileUrl: "https://www.google.com/maps/contrib/109118372626663494252/reviews", rating: 5, time: "3 years ago", text: "The house is spotless and never looked better." },
  { name: "Gaye Davies", avatar: "/images/ChIJT35locmWcKMRgykID0Xc2Vo_463c35959d5dbbd33f15d6ef7858cd18.jpg", profileUrl: "https://www.google.com/maps/contrib/113271163054114668536/reviews", rating: 5, time: "3 years ago", text: "I scheduled cleaning with Ivy Cleans from Seattle for my sister in Minneapolis. That process alone was so friendly and efficient! My sister said the cleaning job by Ivy was one of her best birthday presents. Thanks for the great service!" },
  { name: "Betsy Williams", avatar: "/images/ChIJT35locmWcKMRgykID0Xc2Vo_56247593c8630ce7a36d64aff55ab241.jpg", profileUrl: "https://www.google.com/maps/contrib/106318371325454578442/reviews", rating: 5, time: "3 years ago", text: "Keyshawn did an excellentvery thorough job cleaning my house today. She covered all the bases & I am very much enjoying my clean house now. Well done, lady! 😊" },
  { name: "Kevin Cruz", avatar: "/images/ChIJT35locmWcKMRgykID0Xc2Vo_26c0418afaf76eae62c81a42683725ff.jpg", profileUrl: "https://www.google.com/maps/contrib/117808354740956090882/reviews", rating: 5, time: "3 years ago", text: "Meredith was awesome! Thank you!" },
  { name: "Julianna Reads", avatar: "/images/ChIJT35locmWcKMRgykID0Xc2Vo_51b83e9a17d78c72d5a00c5714507752.jpg", profileUrl: "https://www.google.com/maps/contrib/112515177655094014396/reviews", rating: 5, time: "3 years ago", text: "Ivy Cleans did a great job! We needed furniture moved for a deep clean. I called 5 companies and this was the only one that could accommodate our needs and they were able to get a crew out here the next day! The cleaners did a great job and were friendly." },
  { name: "Jessica Wojcik", avatar: "/images/ChIJT35locmWcKMRgykID0Xc2Vo_b6f41b6f1e06107b29211a5aeb0c6878.jpg", profileUrl: "https://www.google.com/maps/contrib/108244891461006610483/reviews", rating: 5, time: "3 years ago", text: "Bailey did my move-out deep clean and did an AMAZING job! …" }, // full text from content-dump line 200
  { name: "Leslie", avatar: "/images/ChIJT35locmWcKMRgykID0Xc2Vo_db464bae7301c38f8607cd4ff2652a30.jpg", profileUrl: "https://www.google.com/maps/contrib/113022993948940942098/reviews", rating: 4, time: "3 years ago", text: "First, I did appreciate the job they did, it couldn't have been fun. …" }, // full text from line 200
  { name: "Dominic Anderson", avatar: "/images/ChIJT35locmWcKMRgykID0Xc2Vo_1d694dba7949954b92bc22ef5a96f457.jpg", profileUrl: "https://www.google.com/maps/contrib/100149646051404358932/reviews", rating: 1, time: "3 years ago", text: "DO NOT use this company. …" }, // full text from line 200, including the Update: sentence
];
```

- [ ] **Step 6: Create `src/data/faqs.ts`** — all 10 Q&A pairs; the code below is already complete and verbatim (cross-check against the `elementor-tab-title`/`elementor-tab-content` markup in `ivycleans.html` if in doubt):

```ts
export type Faq = { q: string; a: string };
export const faqs: Faq[] = [
  { q: "What types of services are available for household cleaning purposes?", a: "Our selection of cleaning services is extensive, encompassing general household cleaning, thorough cleaning, relocation-related cleaning, as well as home organization." },
  { q: "What is the pricing structure for your residential cleaning services?", a: "The rates we offer are flexible and are determined by factors such as the size and condition of your residence, alongside the specific services you require. We offer complimentary estimates and are more than willing to provide you with a personalized quote that caters to your individual needs." },
  { q: "What does your maid service encompass?", a: "Our house cleaning service encompasses overall tidying within all areas, including the removal of dust, vacuuming, and floor polishing. To enhance customer satisfaction, we also provide supplementary amenities like laundry assistance and window washing." },
  { q: "What is the recommended frequency for booking home cleaning services?", a: "The frequency at which you would like your home to be cleaned relies on your specific requirements and personal inclinations. Certain individuals opt for weekly or bi-weekly cleanings, while others prefer monthly or one-time arrangements." },
  { q: "What does the term “deep cleaning service” refer to?", a: "A comprehensive cleaning service is an extensive cleansing of your residence that surpasses routine cleaning. It encompasses the sanitization and purification of all surfaces, meticulous attention to baseboards and blinds, as well as the cleaning of interior windows and other intricate details that are not typically addressed during regular upkeep." },
  { q: "What does your move-out cleaning service encompass?", a: "Our move-out cleaning package encompasses a comprehensive cleaning of every room, encompassing both the interiors and exteriors of bathrooms, kitchens, and bedrooms. Our objective is to restore the house to its original state of cleanliness when it was initially constructed." },
  { q: "What does your home organization services encompass?", a: "Our range of home organization services entails the decluttering, rearranging, and organizing of both your living areas and storage spaces. We collaborate extensively with our clients to establish living spaces that are both practical and aesthetically appealing." },
  { q: "What is the process for scheduling your services?", a: "To secure our services, you have the option of reaching out to us via telephone or email. Alternatively, you may select a tailored service to accommodate your specific requirements at this location:. We will collaborate with you to arrange a cleaning appointment that aligns with your schedule." },
  { q: "Are disinfection services offered by your company?", a: "Certainly, we offer disinfection services. Our team will employ high-quality products to ensure thorough sanitization and disinfection of every area and surface within the premises, encompassing bathrooms, kitchens, and bedrooms." },
  { q: "What is the procedure for managing payment?", a: "We authorize a range of payment methods, such as debit cards and all forms credit cards. Full payment is only required after the completion of the service." },
];
```

- [ ] **Step 7: Create `src/data/posts.ts`**

```ts
export type Post = { title: string; href: string; image: string; alt: string };
export const posts: Post[] = [
  { title: "Do I Need to Be Home During a Deep Cleaning Service", href: "https://ivycleans.com/do-i-need-to-be-home-during-a-deep-cleaning-service/", image: "/images/image-12.webp", alt: "deep cleaning" },
  { title: "10 Questions to Ask House Cleaning Services: A Comprehensive Guide", href: "https://ivycleans.com/10-questions-to-ask-house-cleaning-services-a-comprehensive-guide/", image: "/images/image-8.webp", alt: "house cleaning services" },
  { title: "What Is Included In A Deep Cleaning Of A House", href: "https://ivycleans.com/what-is-included-in-a-deep-cleaning-of-a-house/", image: "/images/image-15.webp", alt: "deep cleaning" },
];
```

- [ ] **Step 8: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: no errors. Then spot-check no `…` markers survived: `grep -rn "…" src/data/ | grep -v "’"` should return only legitimate ellipses that exist in the live copy (there are none — expect empty output).

- [ ] **Step 9: Commit**

```bash
git add src/data
git commit -m "feat: verbatim homepage content as typed data files"
```

---

### Task 3: TopBar and Header (with mobile menu)

**Files:**
- Create: `src/components/TopBar.tsx`, `src/components/Header.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `site` from `@/data/site` (Task 2).
- Produces: `<TopBar />`, `<Header />` — no props; rendered in the root layout above `{children}`.

- [ ] **Step 1: Create `src/components/TopBar.tsx`** (server component — the bar above the header with phone/email)

```tsx
import Image from "next/image";
import Link from "next/link";
import { site } from "@/data/site";

export default function TopBar() {
  return (
    <div className="bg-white">
      <div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link href="/">
          <Image src="/images/Logo.png" alt="Ivy Cleans" width={309} height={149} className="h-auto w-[180px]" fetchPriority="high" loading="eager" />
        </Link>
        <div className="flex items-center gap-8">
          <div>
            <h3 className="text-[1.6rem] font-bold">Prefer to call? We’re available now.</h3>
            <p><a href={site.phoneHref} className="text-rust font-semibold">{site.phone}</a></p>
          </div>
          <div className="hidden md:block">
            <h3 className="text-[1.6rem] font-bold">Email</h3>
            <p>{site.email}</p>
          </div>
          <Link href={site.bookingUrl} className="bg-rust border-rust border px-6 py-3 text-[1.8rem] leading-[1.2em] text-white transition-colors hover:bg-white hover:text-rust">
            SET AN APPOINTMENT 👈
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/Header.tsx`** (client component — nav bar with dropdown + hamburger). On the live site "Deep Cleaning Minneapolis" and "Minneapolis Move Out Cleaning Services" sit in a dropdown under "Cleaning Services".

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { site } from "@/data/site";

const topLevel = site.nav.filter(
  (n) =>
    n.label !== "Deep Cleaning Minneapolis" &&
    n.label !== "Minneapolis Move Out Cleaning Services"
);
const dropdown = site.nav.filter(
  (n) =>
    n.label === "Deep Cleaning Minneapolis" ||
    n.label === "Minneapolis Move Out Cleaning Services"
);

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="bg-brand sticky top-0 z-50">
      <div className="mx-auto max-w-[1140px] px-4">
        {/* desktop nav */}
        <nav className="hidden items-center lg:flex">
          {topLevel.map((item) =>
            item.label === "Cleaning Services" ? (
              <div key={item.href} className="group relative">
                <Link href={item.href} className="block px-5 py-4 font-semibold text-white hover:opacity-80">
                  {item.label}
                </Link>
                <div className="absolute left-0 top-full z-50 hidden min-w-[260px] bg-white shadow-lg group-hover:block">
                  {dropdown.map((d) => (
                    <Link key={d.href} href={d.href} className="hover:text-rust block px-5 py-3 text-black">
                      {d.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link key={item.href} href={item.href} className="block px-5 py-4 font-semibold text-white hover:opacity-80">
                {item.label}
              </Link>
            )
          )}
        </nav>
        {/* mobile bar */}
        <div className="flex items-center justify-between py-3 lg:hidden">
          <span className="font-semibold text-white">Menu</span>
          <button aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)} className="flex h-10 w-10 flex-col items-center justify-center gap-1.5">
            <span className="h-0.5 w-6 bg-white" />
            <span className="h-0.5 w-6 bg-white" />
            <span className="h-0.5 w-6 bg-white" />
          </button>
        </div>
      </div>
      {open && (
        <nav className="bg-brand lg:hidden">
          {site.nav.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block border-t border-white/20 px-5 py-3 text-white">
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
```

- [ ] **Step 3: Add both to the root layout** — in `src/app/layout.tsx`, import and render inside `<body>`:

```tsx
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
// …
      <body>
        <TopBar />
        <Header />
        {children}
      </body>
```

- [ ] **Step 4: Verify in dev**

Run: `pnpm dev &` then `curl -s http://localhost:3000 | grep -o "SET AN APPOINTMENT" | head -1` and `curl -s http://localhost:3000 | grep -c "Deep Cleaning Minneapolis"`
Expected: `SET AN APPOINTMENT` present; nav labels present (count ≥ 1). Leave the dev server running for later tasks.

- [ ] **Step 5: Commit**

```bash
git add src/components/TopBar.tsx src/components/Header.tsx src/app/layout.tsx
git commit -m "feat: top bar and sticky header with dropdown and mobile menu"
```

---

### Task 4: Shared CTA components

**Files:**
- Create: `src/components/CtaButton.tsx`, `src/components/CtaBand.tsx`

**Interfaces:**
- Consumes: `site` from `@/data/site`.
- Produces:
  - `CtaButton({ size?: "base" | "lg" })` — the rust "SET AN APPOINTMENT 👈" link button.
  - `CtaBand({ heading?: boolean })` — full-width rust band over `bg.jpg`; with `heading` (default true) it shows the H2 "Ready For a Sparkling Clean House? Book Your Cleaning Service Minneapolis"; `heading={false}` renders the compact variant (button + "Prefer to call?" + phone only) used mid-page.

- [ ] **Step 1: Create `src/components/CtaButton.tsx`**

```tsx
import Link from "next/link";
import { site } from "@/data/site";

export default function CtaButton({ size = "base" }: { size?: "base" | "lg" }) {
  return (
    <Link
      href={site.bookingUrl}
      className={`bg-rust border-rust inline-block border leading-[1.2em] text-white transition-colors hover:bg-white hover:text-rust ${
        size === "lg" ? "px-10 py-5 text-[2.4rem]" : "px-8 py-4 text-[1.8rem]"
      }`}
    >
      SET AN APPOINTMENT 👈
    </Link>
  );
}
```

- [ ] **Step 2: Create `src/components/CtaBand.tsx`**

```tsx
import { site } from "@/data/site";
import CtaButton from "./CtaButton";

export default function CtaBand({ heading = true }: { heading?: boolean }) {
  return (
    <section
      className="bg-rust bg-cover bg-center py-16 text-center text-white"
      style={{ backgroundImage: "url(/images/bg.jpg)" }}
    >
      <div className="mx-auto max-w-[1140px] px-4">
        {heading && (
          <h2 className="mb-8 text-[2.8rem] leading-tight md:text-[4rem] lg:text-[4.5rem]">
            Ready For a Sparkling Clean House? Book Your Cleaning Service Minneapolis
          </h2>
        )}
        <CtaButton size="lg" />
        <p className="mt-6 text-[1.8rem]">Prefer to call? We’re available now.</p>
        <h3 className="mt-2 text-[2.6rem] font-bold md:text-[3rem] lg:text-[3.6rem]">
          <a href={site.phoneHref}>{site.phone}</a>
        </h3>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/CtaButton.tsx src/components/CtaBand.tsx
git commit -m "feat: shared CTA button and CTA band components"
```

---

### Task 5: Hero and FeaturedIn; start composing the page

**Files:**
- Create: `src/components/Hero.tsx`, `src/components/FeaturedIn.tsx`
- Modify: `src/app/page.tsx` (replace the create-next-app boilerplate entirely)

**Interfaces:**
- Consumes: `heroParagraphs` from `@/data/services`, `site`, `CtaButton`.
- Produces: `<Hero />`, `<FeaturedIn />`; `src/app/page.tsx` becomes the section-composition file that later tasks append to.

- [ ] **Step 1: Create `src/components/Hero.tsx`** — H1 at 7.2rem in `#37745F` over the `sec01-bgg.jpg` background, hero copy, CTA + phone, with the `woman-holding-spray-cleaner-1.png` cutout on the right (desktop only):

```tsx
import Image from "next/image";
import { site } from "@/data/site";
import { heroParagraphs } from "@/data/services";
import CtaButton from "./CtaButton";

export default function Hero() {
  return (
    <section className="bg-peach bg-cover bg-center" style={{ backgroundImage: "url(/images/sec01-bgg.jpg)" }}>
      <div className="mx-auto grid max-w-[1140px] gap-8 px-4 py-16 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h1 className="text-herogreen text-[3rem] leading-[1em] font-bold md:text-[4rem] lg:text-[7.2rem]">
            Cleaning Services Minneapolis
          </h1>
          <div className="mt-8 space-y-4 text-[1.05rem] leading-relaxed">
            {heroParagraphs.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
          <div className="mt-8">
            <CtaButton size="lg" />
            <p className="mt-4 text-[1.4rem] font-semibold">Prefer to call? We’re available now.</p>
            <p className="text-rust text-[1.8rem] font-bold">
              <a href={site.phoneHref}>{site.phone}</a>
            </p>
          </div>
        </div>
        <div className="relative hidden lg:block">
          <Image src="/images/woman-holding-spray-cleaner-1.png" alt="" fill className="object-contain object-bottom" fetchPriority="high" loading="eager" sizes="(min-width: 1024px) 40vw, 0vw" />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `src/components/FeaturedIn.tsx`** — "FEATURED IN:" + the press-logo strip (`Group-5.png` on desktop, `logo-mbl1.png`/`logo-mbl2.png` stacked on mobile):

```tsx
import Image from "next/image";

export default function FeaturedIn() {
  return (
    <section className="bg-white py-10">
      <div className="mx-auto max-w-[1140px] px-4 text-center">
        <h3 className="mb-6 text-[1.4rem] font-bold tracking-wide">FEATURED IN:</h3>
        <Image src="/images/Group-5.png" alt="" width={1824} height={51} className="hidden h-auto w-full md:block" />
        <div className="space-y-4 md:hidden">
          <Image src="/images/logo-mbl1.png" alt="" width={800} height={51} className="h-auto w-full" />
          <Image src="/images/logo-mbl2.png" alt="" width={800} height={42} className="h-auto w-full" />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Replace `src/app/page.tsx`**

```tsx
import Hero from "@/components/Hero";
import FeaturedIn from "@/components/FeaturedIn";

export default function Home() {
  return (
    <main>
      <Hero />
      <FeaturedIn />
    </main>
  );
}
```

- [ ] **Step 4: Verify**

Run: `curl -s http://localhost:3000 | grep -c "Cleaning Services Minneapolis"` and `pnpm exec tsc --noEmit`
Expected: count ≥ 1; tsc clean. Also eyeball `http://localhost:3000` — hero heading is huge (≈115px) and dark green; that matches the live site.

- [ ] **Step 5: Commit**

```bash
git add src/components/Hero.tsx src/components/FeaturedIn.tsx src/app/page.tsx
git commit -m "feat: hero and featured-in sections"
```

---

### Task 6: Intro, ServiceTypes, first CTA band

**Files:**
- Create: `src/components/Intro.tsx`, `src/components/ServiceTypes.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `serviceIntro`, `services` from `@/data/services`; `CtaBand`.
- Produces: `<Intro />`, `<ServiceTypes />` appended to the page, followed by `<CtaBand />`.

- [ ] **Step 1: Create `src/components/Intro.tsx`** — overline H2 "Your Happiness is our Priority", main H2 "Professional Cleaning Services Minneapolis, MN", and the five intro paragraphs:

```tsx
import { serviceIntro } from "@/data/services";

export default function Intro() {
  return (
    <section className="bg-peach py-16">
      <div className="mx-auto max-w-[1140px] px-4 text-center">
        <h2 className="text-brand text-[1.8rem] font-semibold">Your Happiness is our Priority</h2>
        <h2 className="mt-2 text-[2.8rem] leading-tight font-bold md:text-[4rem] lg:text-[4.5rem]">
          Professional Cleaning Services Minneapolis, MN
        </h2>
        <div className="mt-8 space-y-4 text-left leading-relaxed">
          {serviceIntro.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `src/components/ServiceTypes.tsx`** — the five image cards (Dusting … Upholstery Cleaning), image left / text right alternating is NOT used on the live site; they are stacked cards in a grid:

```tsx
import Image from "next/image";
import { services } from "@/data/services";

export default function ServiceTypes() {
  return (
    <section className="bg-peach pb-16">
      <div className="mx-auto grid max-w-[1140px] gap-8 px-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <article key={s.title} className="bg-white p-6 shadow-sm">
            <Image src={s.image} alt={s.alt} width={s.width} height={s.height} className="h-auto w-full" />
            <h3 className="mt-4 text-[1.8rem] md:text-[2.2rem]">{s.title}</h3>
            <p className="mt-2 leading-relaxed">{s.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Append to `src/app/page.tsx`** — after `<FeaturedIn />`:

```tsx
import Intro from "@/components/Intro";
import ServiceTypes from "@/components/ServiceTypes";
import CtaBand from "@/components/CtaBand";
// … inside <main> after <FeaturedIn />:
      <Intro />
      <ServiceTypes />
      <CtaBand />
```

- [ ] **Step 4: Verify**

Run: `curl -s http://localhost:3000 | grep -c "Upholstery Cleaning"` → ≥ 1, and `curl -s http://localhost:3000 | grep -c "Ready For a Sparkling Clean House"` → ≥ 1.

- [ ] **Step 5: Commit**

```bash
git add src/components/Intro.tsx src/components/ServiceTypes.tsx src/app/page.tsx
git commit -m "feat: intro, service-type cards, first CTA band"
```

---

### Task 7: Packages grid and compact CTA

**Files:**
- Create: `src/components/Packages.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `packagesIntro`, `packages` from `@/data/packages`; `CtaBand`.
- Produces: `<Packages />` then `<CtaBand heading={false} />` appended to the page.

- [ ] **Step 1: Create `src/components/Packages.tsx`**

```tsx
import Image from "next/image";
import { packages, packagesIntro } from "@/data/packages";

export default function Packages() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-[1140px] px-4 text-center">
        <h2 className="text-[2.8rem] leading-tight font-bold md:text-[4rem] lg:text-[4.5rem]">
          Our Cleaning Service Packages
        </h2>
        <p className="mx-auto mt-6 max-w-4xl leading-relaxed">{packagesIntro}</p>
        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {packages.map((p) => (
            <div key={p.title}>
              <Image src={p.icon} alt="" width={156} height={156} className="mx-auto h-[110px] w-[110px]" />
              <h3 className="mt-4 text-[1.8rem] leading-snug md:text-[2.2rem] md:leading-snug">{p.title}</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Append to `src/app/page.tsx`** after the first `<CtaBand />`:

```tsx
import Packages from "@/components/Packages";
// …
      <Packages />
      <CtaBand heading={false} />
```

- [ ] **Step 3: Verify**

Run: `curl -s http://localhost:3000 | grep -c "Maid Service"` → ≥ 1.

- [ ] **Step 4: Commit**

```bash
git add src/components/Packages.tsx src/app/page.tsx
git commit -m "feat: cleaning service packages grid"
```

---

### Task 8: ServiceArea and Values

**Files:**
- Create: `src/components/ServiceArea.tsx`, `src/components/Values.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `areas` from `@/data/areas`; `CtaBand`.
- Produces: `<ServiceArea />`, `<Values />`, then `<CtaBand />` appended to the page.

- [ ] **Step 1: Create `src/components/ServiceArea.tsx`** — overline H3 + H2 "Areas We Serve" + 24 area links in a 4-column grid, over the `cleaning-bg2.jpg` background:

```tsx
import Link from "next/link";
import { areas } from "@/data/areas";

export default function ServiceArea() {
  return (
    <section className="bg-cover bg-center py-16" style={{ backgroundImage: "url(/images/cleaning-bg2.jpg)" }}>
      <div className="mx-auto max-w-[1140px] px-4 text-center">
        <h3 className="text-[1.6rem] font-semibold">House Cleaning Services Near Me in Minneapolis, MN</h3>
        <h2 className="mt-2 text-[2.8rem] leading-tight font-bold md:text-[4rem] lg:text-[4.5rem]">Areas We Serve</h2>
        <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 text-left sm:grid-cols-3 lg:grid-cols-4">
          {areas.map((a) => (
            <li key={a.name}>
              <Link href={a.href} className="hover:text-rust font-medium underline-offset-2 hover:underline">
                {a.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `src/components/Values.tsx`** — H2 "Our Values & Guarantee", `guarantee-icon-1.png`, two paragraphs (content-dump lines 163–164, full verbatim text):

```tsx
import Image from "next/image";

export default function Values() {
  return (
    <section className="bg-brand py-16 text-white">
      <div className="mx-auto grid max-w-[1140px] items-center gap-10 px-4 lg:grid-cols-[300px_1fr]">
        <Image src="/images/guarantee-icon-1.png" alt="" width={299} height={298} className="mx-auto h-auto w-[220px]" />
        <div>
          <h2 className="text-[2.8rem] leading-tight font-bold md:text-[4rem] lg:text-[4.5rem]">
            Our Values &amp; Guarantee
          </h2>
          <p className="mt-6 leading-relaxed">
            To be brief, Ivy cleans offers the highest quality cleaning services in Minneapolis. {/* full line 163 text */}
          </p>
          <p className="mt-4 leading-relaxed">
            We continually change our techniques, tools, and products to find what works best for us and our customers. {/* full line 164 text */}
          </p>
        </div>
      </div>
    </section>
  );
}
```

(Use the COMPLETE paragraphs from content-dump lines 163–164 — the comments mark where the rest of each verbatim string continues.)

- [ ] **Step 3: Append to `src/app/page.tsx`**:

```tsx
import ServiceArea from "@/components/ServiceArea";
import Values from "@/components/Values";
// …
      <ServiceArea />
      <Values />
      <CtaBand />
```

- [ ] **Step 4: Verify**

Run: `curl -s http://localhost:3000 | grep -c "Vadnais Heights"` → ≥ 1; `curl -s http://localhost:3000 | grep -c "Our Values"` → ≥ 1.

- [ ] **Step 5: Commit**

```bash
git add src/components/ServiceArea.tsx src/components/Values.tsx src/app/page.tsx
git commit -m "feat: areas-we-serve and values sections"
```

---

### Task 9: BeforeAfter gallery and Reviews carousel

**Files:**
- Create: `src/components/BeforeAfter.tsx`, `src/components/Reviews.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `reviews`, `reviewsSummary`, `site` from data; `CtaBand`.
- Produces: `<BeforeAfter />`, `<CtaBand heading={false} />`, `<Reviews />` appended to the page.

- [ ] **Step 1: Create `src/components/BeforeAfter.tsx`** (server component — two labeled images):

```tsx
import Image from "next/image";

export default function BeforeAfter() {
  return (
    <section className="bg-peach py-16">
      <div className="mx-auto max-w-[1140px] px-4 text-center">
        <h2 className="text-[2.8rem] leading-tight font-bold md:text-[4rem] lg:text-[4.5rem]">
          Our Cleaning Work In Action
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <figure>
            <Image src="/images/before.jpg" alt="" width={555} height={417} className="h-auto w-full" />
            <figcaption className="mt-3 text-[1.8rem] font-bold uppercase text-white [text-shadow:0_1px_2px_rgba(0,0,0,.4)]">
              <h3 className="bg-rust inline-block px-6 py-1 uppercase">before</h3>
            </figcaption>
          </figure>
          <figure>
            <Image src="/images/after.jpg" alt="" width={555} height={417} className="h-auto w-full" />
            <figcaption className="mt-3">
              <h3 className="bg-brand inline-block px-6 py-1 text-[1.8rem] font-bold uppercase text-white">after</h3>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `src/components/Reviews.tsx`** (client component — replica of the Google Reviews widget: summary header + arrow-paged card slider, 3 cards per view on desktop, 1 on mobile):

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { reviews, reviewsSummary } from "@/data/reviews";
import { site } from "@/data/site";

function Stars({ rating, size = 18 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${rating} stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(rating) ? "#f8af0d" : "#d8d8d8"}>
          <path d="M12 2l2.9 6.26 6.6.63-5 4.45 1.5 6.66L12 16.9 5.9 20l1.5-6.66-5-4.45 6.6-.63L12 2z" />
        </svg>
      ))}
    </span>
  );
}

export default function Reviews() {
  const [start, setStart] = useState(0);
  const prev = () => setStart((s) => (s - 1 + reviews.length) % reviews.length);
  const next = () => setStart((s) => (s + 1) % reviews.length);
  const visible = [0, 1, 2].map((o) => reviews[(start + o) % reviews.length]);

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-[1140px] px-4">
        <h2 className="text-center text-[2.8rem] leading-tight font-bold md:text-[4rem] lg:text-[4.5rem]">
          What Our Satisfied Clients Are Saying
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <a href={site.googleMapsUrl} target="_blank" rel="nofollow noopener" className="font-bold">
              Ivy Cleans Minneapolis
            </a>
            <div className="flex items-center gap-2">
              <span className="text-[1.4rem] font-bold">{reviewsSummary.rating}</span>
              <Stars rating={reviewsSummary.rating} />
            </div>
            <p className="text-sm text-gray-600">Based on {reviewsSummary.count} reviews</p>
          </div>
          <a href={site.writeReviewUrl} target="_blank" rel="nofollow noopener" className="rounded bg-[#3c6df0] px-5 py-2.5 font-semibold text-white">
            review us on Google
          </a>
        </div>
        <div className="relative mt-8">
          <button onClick={prev} aria-label="Previous reviews" className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow">‹</button>
          <div className="grid gap-6 md:grid-cols-3">
            {visible.map((r, i) => (
              <article key={r.name} className={`rounded bg-[#fafafa] p-6 ${i > 0 ? "hidden md:block" : ""}`}>
                <div className="flex items-center gap-3">
                  <Image src={r.avatar} alt={`${r.name} profile picture`} width={50} height={50} className="rounded-full" />
                  <div>
                    <a href={r.profileUrl} target="_blank" rel="nofollow noopener" className="font-semibold">{r.name}</a>
                    <p className="text-sm text-gray-500">{r.time}</p>
                  </div>
                </div>
                <div className="mt-2"><Stars rating={r.rating} size={16} /></div>
                <p className="mt-3 line-clamp-6 text-sm leading-relaxed">{r.text}</p>
              </article>
            ))}
          </div>
          <button onClick={next} aria-label="Next reviews" className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow">›</button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Append to `src/app/page.tsx`**:

```tsx
import BeforeAfter from "@/components/BeforeAfter";
import Reviews from "@/components/Reviews";
// …
      <BeforeAfter />
      <CtaBand heading={false} />
      <Reviews />
```

- [ ] **Step 4: Verify**

Run: `curl -s http://localhost:3000 | grep -c "Based on 85 reviews"` → ≥ 1. In the browser: arrows advance the reviews; card 1 visible on narrow viewport.

- [ ] **Step 5: Commit**

```bash
git add src/components/BeforeAfter.tsx src/components/Reviews.tsx src/app/page.tsx
git commit -m "feat: before/after gallery and Google reviews carousel"
```

---

### Task 10: FAQ accordion, blog previews, footer; finish composition

**Files:**
- Create: `src/components/Faq.tsx`, `src/components/BlogPreview.tsx`, `src/components/Footer.tsx`
- Modify: `src/app/page.tsx`, `src/app/layout.tsx`

**Interfaces:**
- Consumes: `faqs`, `posts`, `site` from data; `CtaBand`.
- Produces: page order completed: `<Faq />`, `<CtaBand />`, `<BlogPreview />`; `<Footer />` added to the root layout after `{children}`.

- [ ] **Step 1: Create `src/components/Faq.tsx`** (client — one item open at a time, matching live behavior; section sits over `faq-bg.jpg`):

```tsx
"use client";

import { useState } from "react";
import { faqs } from "@/data/faqs";

export default function Faq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <section className="bg-cover bg-center py-16" style={{ backgroundImage: "url(/images/faq-bg.jpg)" }}>
      <div className="mx-auto max-w-[1140px] px-4">
        <h2 className="text-center text-[2.8rem] leading-tight font-bold md:text-[4rem] lg:text-[4.5rem]">
          Frequently Asked Questions
        </h2>
        <p className="mt-4 text-center">If you need further assistance, please do not hesitate to contact us.</p>
        <div className="mx-auto mt-10 max-w-4xl">
          {faqs.map((f, i) => (
            <div key={f.q} className="mb-3 bg-white shadow-sm">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                aria-expanded={openIdx === i}
                className="flex w-full items-center justify-between px-6 py-4 text-left text-[1.15rem] font-semibold"
              >
                {f.q}
                <span className="text-rust ml-4 text-2xl">{openIdx === i ? "−" : "+"}</span>
              </button>
              {openIdx === i && <p className="px-6 pb-5 leading-relaxed">{f.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `src/components/BlogPreview.tsx`**:

```tsx
import Image from "next/image";
import { posts } from "@/data/posts";

export default function BlogPreview() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-[1140px] px-4 text-center">
        <h3 className="text-[1.4rem] font-semibold tracking-wide">NEWS AND CLEANING TIPS</h3>
        <h2 className="mt-2 text-[2.8rem] leading-tight font-bold md:text-[4rem] lg:text-[4.5rem]">
          Latest From The Ivy Cleans Blog
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {posts.map((p) => (
            <article key={p.href} className="text-left">
              <a href={p.href}>
                <Image src={p.image} alt={p.alt} width={300} height={200} className="h-auto w-full object-cover" />
                <h3 className="mt-4 text-[1.3rem] font-bold leading-snug">{p.title}</h3>
              </a>
              <a href={p.href} className="text-rust mt-2 inline-block font-semibold">Read More »</a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create `src/components/Footer.tsx`** — dark footer with logo (`Logo-footer.png`), Contact column, Quick Links, social icons (white via CSS invert):

```tsx
import Image from "next/image";
import Link from "next/link";
import { site } from "@/data/site";

export default function Footer() {
  return (
    <footer className="bg-black py-14 text-white">
      <div className="mx-auto grid max-w-[1140px] gap-10 px-4 md:grid-cols-4">
        <div>
          <Image src="/images/Logo-footer.png" alt="Ivy Cleans" width={165} height={84} className="h-auto w-[165px]" />
        </div>
        <div>
          <h3 className="mb-4 text-[1.4rem] font-bold">Contact</h3>
          <ul className="space-y-2">
            <li><a href={site.phoneHref}>{site.phone}</a></li>
            <li><a href={`mailto:${site.email}`}>{site.email.toLowerCase()}</a></li>
            <li>{site.address}</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-[1.4rem] font-bold">Quick Links</h3>
          <ul className="space-y-2">
            <li><Link href="/">Home</Link></li>
            <li><Link href="/blog">Blog</Link></li>
            <li><Link href="/contact">Contact</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-[1.4rem] font-bold">Get In Touch</h3>
          <div className="flex flex-wrap gap-3">
            {site.socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener" aria-label={s.label} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/25">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.icon} alt="" width={18} height={18} className="invert" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Finish `src/app/page.tsx`** — final order inside `<main>`:

```tsx
      <Hero />
      <FeaturedIn />
      <Intro />
      <ServiceTypes />
      <CtaBand />
      <Packages />
      <CtaBand heading={false} />
      <ServiceArea />
      <Values />
      <CtaBand />
      <BeforeAfter />
      <CtaBand heading={false} />
      <Reviews />
      <Faq />
      <CtaBand />
      <BlogPreview />
```

And add `<Footer />` after `{children}` in `src/app/layout.tsx`.

- [ ] **Step 5: Verify full page**

Run: `pnpm lint && pnpm build`
Expected: clean lint, successful static build. Then `pnpm start &` and `curl -s http://localhost:3000 | grep -c "Frequently Asked Questions"` → ≥ 1, and confirm the word "Vavada" does NOT appear: `curl -s http://localhost:3000 | grep -ci vavada` → 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/Faq.tsx src/components/BlogPreview.tsx src/components/Footer.tsx src/app/page.tsx src/app/layout.tsx
git commit -m "feat: FAQ accordion, blog previews, footer; complete homepage composition"
```

---

### Task 11: Pixel-fidelity pass against the live site

**Files:**
- Modify: any component/`globals.css` as needed (styling fixes only — no content changes)

**Interfaces:**
- Consumes: the complete page from Tasks 1–10; reference files in `docs/superpowers/reference/ivycleans-live/`.
- Produces: the verified pixel-accurate homepage.

- [ ] **Step 1: Capture screenshots of both sites**

```bash
pnpm build && (pnpm start &) && sleep 5
mkdir -p /tmp/fidelity
pnpm dlx playwright install chromium
pnpm dlx playwright screenshot --viewport-size=1440,900 --full-page https://ivycleans.com/ /tmp/fidelity/live-1440.png
pnpm dlx playwright screenshot --viewport-size=1440,900 --full-page http://localhost:3000 /tmp/fidelity/local-1440.png
pnpm dlx playwright screenshot --viewport-size=390,844 --full-page https://ivycleans.com/ /tmp/fidelity/live-390.png
pnpm dlx playwright screenshot --viewport-size=390,844 --full-page http://localhost:3000 /tmp/fidelity/local-390.png
```

(The live host is slow — add `--wait-for-timeout 15000` if screenshots come back incomplete.)

- [ ] **Step 2: Compare section by section** — view live vs local at each width, top to bottom (Read the PNG files). For every visible difference (spacing, size, color, background, alignment, weight), find the exact value: locate the section's `elementor-element-XXXXXXX` id in `ivycleans.html`, grep that id in `post-2035.css`, and copy the real padding/margin/font-size/color into the component. Typical fixes expected: section paddings, hero grid proportions, packages grid column count, which sections use `peach` vs white backgrounds, CTA band overlay darkness, exact button padding.

- [ ] **Step 3: Re-screenshot and iterate** until no visible differences remain at both widths.

- [ ] **Step 4: Interactive checks** — mobile menu opens/closes and links navigate; FAQ opens one item at a time; reviews arrows cycle; all `tel:`/`mailto:`/social hrefs correct (`curl -s http://localhost:3000 | grep -o 'href="tel:[^"]*"' | sort -u` → only `tel:6124240391`).

- [ ] **Step 5: Final verification**

Run: `pnpm lint && pnpm build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix: pixel-fidelity adjustments to match live site"
```
