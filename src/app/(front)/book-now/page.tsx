import type { Metadata } from "next";
import { bookNowMeta } from "@/data/book";
import BookNowSection from "@/components/book/BookNowSection";

// live /book-now has no <meta name="description"> — bookNowMeta carries
// only a title, so no description key is set here (see src/data/book.ts).
export const metadata: Metadata = {
  title: bookNowMeta.title,
};

/*
 * book-now.html uses header/footer templates 2338/2342 (grep-verified:
 * `data-elementor-id="2338"` on <header>, `"2342"` on <footer>), which are
 * the exact templates src/components/{TopBar,Header,Footer}.tsx already
 * clone — i.e. this route belongs in the `(front)` group, per the task
 * brief. /book uses different templates (47/186) and lives in `(inner)`
 * instead — see src/app/(inner)/book/page.tsx.
 */
export default function BookNowPage() {
  return <BookNowSection />;
}
