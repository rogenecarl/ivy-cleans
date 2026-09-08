import type { Metadata } from "next";
import { cityFromParams, type CityParams } from "@/content/city-param";
import { citySlug } from "@/content/interpolate";
import { bookData } from "@/data/book";
import BookNowSection from "@/components/book/BookNowSection";

// live /book-now has no meta description; the city is resolved per request, never at module scope
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

// book-now.html uses the front templates (2338/2342), hence the (front) group; /book uses 47/186 and lives in (inner)
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
