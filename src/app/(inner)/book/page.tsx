import type { Metadata } from "next";
import { bookMeta } from "@/data/book";
import BookSection from "@/components/book/BookSection";

export const metadata: Metadata = {
  title: bookMeta.title,
  description: bookMeta.description,
};

/*
 * book.html uses header/footer templates 47/186 (grep-verified:
 * `data-elementor-id="47"` on <header>, `"186"` on <footer>) — the inner
 * chrome templates src/components/inner/{InnerHeader,InnerFooter}.tsx
 * clone, per the task brief. /book-now uses the front templates (2338/2342)
 * instead — see src/app/(front)/book-now/page.tsx.
 */
export default function BookPage() {
  return <BookSection />;
}
