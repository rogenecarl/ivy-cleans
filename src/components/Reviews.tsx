import type { MarketReview } from "@/content/types";

// The market's own reviews from the ops block. No stars, avatars or Google wordmark: an ops review has no rating,
// so drawing one would invent it. Nothing renders below three.
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
