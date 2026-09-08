import type { MarketReview } from "@/content/types";

/*
 * What people in THIS market said, from the ops block — not a Google widget.
 *
 * Until this component existed in this form, the front page rendered
 * src/data/reviews.ts: a static snapshot of Minneapolis's Google widget —
 * nine named Minneapolis customers with their avatars and profile links, a
 * 4.6 / 85 summary, and a one-star opening "DO NOT use this company" — on
 * EVERY city's front page. Orlando's own reviews, typed into the ops form,
 * went to the prompts and nowhere else.
 *
 * Two rules follow from the data this now reads:
 *
 * 1. NO Google chrome. An ops review is a quote, a first name, an area and
 *    an optional month. It has no star rating, no avatar, no profile URL and
 *    no aggregate score, and dressing it in the widget's stars and wordmark
 *    would be inventing a rating the business never received. Testimonials,
 *    plainly presented, are what the data supports.
 *
 * 2. Nothing below three. One or two quotes under "What Our Satisfied Clients
 *    Are Saying" reads as a business that has barely started; an absent
 *    section reads as nothing. Until a market has three, the honest state of
 *    its front page is no reviews section at all.
 *
 * Server component: there is no carousel, so no client state. The heading is
 * the live site's, verbatim; the section's background and padding match the
 * widget section it replaces so the page rhythm around it is unchanged.
 */
export const MIN_REVIEWS = 3;

/** "2025-06" -> "June 2025"; anything else is the operator's text, verbatim. */
export function reviewDate(date: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(date);
  if (!m) return date;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return date;
  const name = new Date(Date.UTC(2000, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
  return `${name} ${m[1]}`;
}

export default function Reviews({ reviews }: { reviews: readonly MarketReview[] }) {
  if (reviews.length < MIN_REVIEWS) return null;

  return (
    <section className="bg-[#fafafa] py-[1rem] md:py-[2rem] lg:py-[6rem] xl:py-[5rem]">
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:text-[4rem] lg:text-[4.5rem]">
          What Our Satisfied Clients Are Saying
        </h2>
        <ul className="grid list-none gap-[1.6rem] p-0 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r, i) => (
            <li key={i} className="flex h-full flex-col gap-[1.2rem] bg-[#f4f4f4] p-[2.4rem]">
              <blockquote className="m-0 flex-1 text-[1.6rem] leading-[1.6em] text-[#222]">
                &ldquo;{r.quote}&rdquo;
              </blockquote>
              <p className="m-0 text-[1.4rem] leading-[1.5em] text-[#555]">
                <span className="font-bold text-[#374151]">{r.firstName}</span>, {r.area}
                {r.date ? ` · ${reviewDate(r.date)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
