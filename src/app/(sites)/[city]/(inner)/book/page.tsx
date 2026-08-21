import type { Metadata } from "next";
import { cityFromParams, type CityParams } from "@/content/city-param";
import { bookData } from "@/data/book";
import BookSection from "@/components/book/BookSection";

export async function generateMetadata({
  params,
}: {
  params: CityParams;
}): Promise<Metadata> {
  const { bookMeta } = bookData(await cityFromParams(params));
  return {
    title: bookMeta.title,
    description: bookMeta.description,
  };
}

/*
 * book.html uses header/footer templates 47/186 (grep-verified:
 * `data-elementor-id="47"` on <header>, `"186"` on <footer>) — the inner
 * chrome templates src/components/inner/{InnerHeader,InnerFooter}.tsx
 * clone, per the task brief. /book-now uses the front templates (2338/2342)
 * instead — see src/app/(sites)/[city]/(front)/book-now/page.tsx.
 */
export default async function BookPage({ params }: { params: CityParams }) {
  const c = await cityFromParams(params);
  const { bookHeader, bookLeadIn, bookCallNow, bookFields, bookSubmitLabel, comingSoon } =
    bookData(c);
  return (
    <BookSection
      bookHeader={bookHeader}
      bookLeadIn={bookLeadIn}
      bookCallNow={bookCallNow}
      bookFields={bookFields}
      bookSubmitLabel={bookSubmitLabel}
      comingSoon={comingSoon}
    />
  );
}
