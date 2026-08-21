import type { Metadata } from "next";
import { cityFromParams, type CityParams } from "@/content/city-param";
import { citySlug } from "@/content/interpolate";
import { bookData } from "@/data/book";
import BookNowSection from "@/components/book/BookNowSection";

// live /book-now has no <meta name="description"> — bookNowMeta carries
// only a title, so no description key is set here (see src/data/book.ts).
// bookNowMeta carries no city text today, but the city must never be
// resolved at MODULE scope — it comes from this request's [city] param
// (async) — same generateMetadata() shape as the sibling pages.
export async function generateMetadata({
  params,
}: {
  params: CityParams;
}): Promise<Metadata> {
  const { bookNowMeta } = bookData(await cityFromParams(params));
  return {
    title: bookNowMeta.title,
  };
}

/*
 * book-now.html uses header/footer templates 2338/2342 (grep-verified:
 * `data-elementor-id="2338"` on <header>, `"2342"` on <footer>), which are
 * the exact templates src/components/{TopBar,Header,Footer}.tsx already
 * clone — i.e. this route belongs in the `(front)` group, per the task
 * brief. /book uses different templates (47/186) and lives in `(inner)`
 * instead — see src/app/(sites)/[city]/(inner)/book/page.tsx.
 */
export default async function BookNowPage({ params }: { params: CityParams }) {
  const c = await cityFromParams(params);
  const { bookFields, bookSubmitLabel, comingSoon } = bookData(c);
  return (
    <BookNowSection
      bookFields={bookFields}
      bookSubmitLabel={bookSubmitLabel}
      comingSoon={comingSoon}
      cityKey={citySlug(c.city)}
    />
  );
}
