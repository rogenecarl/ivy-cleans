import type { Metadata } from "next";
import { canonicalFor } from "@/site/data/seo";
import Breadcrumbs from "@/site/components/inner/Breadcrumbs";
import { breadcrumbs } from "@/site/data/breadcrumbs";
import { cityFromParams, type CityParams } from "@/site/city-param";
import { citySlug } from "@/server/content/interpolate";
import { bookData } from "@/site/data/book";
import BookSection from "@/site/components/book/BookSection";

export async function generateMetadata({
  params,
}: {
  params: CityParams;
}): Promise<Metadata> {
  const c = await cityFromParams(params);
  const { bookMeta } = bookData(c);
  return {
    title: bookMeta.title,
    description: bookMeta.description,
    ...canonicalFor(c, "/book"),
  };
}

// book.html uses the inner templates (47/186); /book-now uses the front ones and lives in (front)
export default async function BookPage({ params }: { params: CityParams }) {
  const c = await cityFromParams(params);
  const { bookHeader, bookLeadIn, bookCallNow, bookFields, bookSubmitLabel, comingSoon } =
    bookData(c);
  return (
    <>
      <Breadcrumbs trail={breadcrumbs(c, { kind: "page", label: "Book Now", path: "/book" })} />
      <BookSection
        bookHeader={bookHeader}
        bookLeadIn={bookLeadIn}
        bookCallNow={bookCallNow}
        bookFields={bookFields}
        bookSubmitLabel={bookSubmitLabel}
        comingSoon={comingSoon}
        cityKey={citySlug(c.city)}
      />
    </>
  );
}
