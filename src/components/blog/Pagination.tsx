/*
 * blog.html's `.elementor-pagination`: page 1 is the current, unlinked
 * `<span aria-current="page">`; pages 2-5 are `<a href="https://ivycleans.com/blog/N/">`
 * (live hrefs, dead for now — no /blog/[page] route exists yet). Each item
 * carries a visually-hidden "Page" label ahead of the number
 * (`elementor-screen-only` on the live site, `sr-only` here). Plain `<a>`
 * (not next/link's `Link`) so the trailing slash in `/blog/N/` survives —
 * `Link` normalizes it away under this app's default `trailingSlash: false`,
 * and there's no `/blog/[page]` route for it to prefetch anyway.
 */
const otherPages = [2, 3, 4, 5];

export default function Pagination() {
  return (
    <nav
      aria-label="Pagination"
      className="mt-[3rem] text-center text-[1.8rem] leading-[1.2em] font-normal md:mt-[5rem]"
    >
      {/*
        post-32.css gives `.page-numbers` inner-only gutters —
        `:not(:first-child){margin-left:calc(1rem/2)}` +
        `:not(:last-child){margin-right:calc(1rem/2)}` — so the row has no
        outer margin; `first:ml-0 last:mr-0` reproduces that. The current
        page is plain #374151/400 on live, not a highlighted colour.
      */}
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
