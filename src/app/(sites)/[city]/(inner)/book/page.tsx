import type { Metadata } from "next";
import Breadcrumbs from "@/components/inner/Breadcrumbs";
import { breadcrumbs } from "@/data/breadcrumbs";
import { cityFromParams, type CityParams } from "@/content/city-param";
import { citySlug } from "@/content/interpolate";
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
