import Link from "next/link";

// blog.html .elementor-pagination, post-32.css .page-numbers: inner-only calc(1rem/2) gutters; current page is plain #374151
export default function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (n: number) => string }) {
  if (pages < 2) return null;
  return (
    <nav
      aria-label="Pagination"
      className="mt-[3rem] text-center text-[1.8rem] leading-[1.2em] font-normal md:mt-[5rem]"
    >
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) =>
        n === page ? (
          <span key={n} aria-current="page" className="mx-[0.5rem] text-[#374151] first:ml-0 last:mr-0">
            <span className="sr-only">Page</span>
            {n}
          </span>
        ) : (
          <Link key={n} href={hrefFor(n)} className="text-link mx-[0.5rem] first:ml-0 last:mr-0">
            <span className="sr-only">Page</span>
            {n}
          </Link>
        ),
      )}
    </nav>
  );
}
