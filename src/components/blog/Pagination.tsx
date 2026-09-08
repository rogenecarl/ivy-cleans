// blog.html .elementor-pagination: page 1 is a span, 2-5 are live hrefs (no /blog/[page] route yet).
// Plain <a> so the trailing slash survives.
const otherPages = [2, 3, 4, 5];

export default function Pagination() {
  return (
    <nav
      aria-label="Pagination"
      className="mt-[3rem] text-center text-[1.8rem] leading-[1.2em] font-normal md:mt-[5rem]"
    >
      {/* post-32.css .page-numbers: inner-only calc(1rem/2) gutters; current page is plain #374151 */}
      <span aria-current="page" className="mx-[0.5rem] text-[#374151] first:ml-0 last:mr-0">
        <span className="sr-only">Page</span>1
      </span>
      {otherPages.map((n) => (
        <a
          key={n}
          href={`/blog/${n}/`}
          className="text-link mx-[0.5rem] first:ml-0 last:mr-0 hover:underline"
        >
          <span className="sr-only">Page</span>
          {n}
        </a>
      ))}
    </nav>
  );
}
