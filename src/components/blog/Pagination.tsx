// blog.html .elementor-pagination. Pages 2-5 linked to ivycleans.com/blog/N/ on live; no tenant serves them, so they are text.
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
        <span key={n} className="text-link mx-[0.5rem] first:ml-0 last:mr-0">
          <span className="sr-only">Page</span>
          {n}
        </span>
      ))}
    </nav>
  );
}
