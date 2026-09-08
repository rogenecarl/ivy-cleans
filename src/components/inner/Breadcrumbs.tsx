import Link from "next/link";
import { breadcrumbListJsonLd, type Crumb } from "@/data/breadcrumbs";

/*
 * The visible trail and its BreadcrumbList JSON-LD, from one array. See
 * src/data/breadcrumbs.ts for the shapes and why every inner page carries
 * one.
 *
 * The live site has no breadcrumbs, so there is no reference CSS to trace —
 * this is the one inner-page element with no Elementor id behind it. Sizes
 * are on the site's rem ladder (globals.css), the colours are the kit's
 * body grey and the nav's rust hover, and it sits in the standard `.ec`
 * container directly under the sticky header so it reads as chrome, not
 * content.
 *
 * The last crumb is the current page: rendered as text with
 * aria-current="page", not as a link to itself. The JSON-LD keeps an `item`
 * for it anyway — Google allows it on the last element and some consumers
 * want it.
 */
export default function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  if (trail.length < 2) return null;
  const last = trail.length - 1;

  /*
   * A "</script>" inside a post title would end the tag early and turn the
   * rest of the JSON into markup. JSON.stringify leaves "<" alone, so escape
   * it here — "<" is still the same string once parsed.
   */
  const json = JSON.stringify(breadcrumbListJsonLd(trail)).replace(/</g, "\\u003c");

  return (
    <nav aria-label="Breadcrumb" className="bg-white">
      <ol className="ec flex flex-wrap items-center gap-x-[0.8rem] gap-y-[0.4rem] py-[1.2rem] text-[1.4rem] leading-[1.2em] text-[#555]">
        {trail.map((crumb, i) => (
          <li key={crumb.href} className="flex items-center gap-x-[0.8rem]">
            {i > 0 && (
              <span aria-hidden="true" className="text-[#999]">
                &rsaquo;
              </span>
            )}
            {i === last ? (
              <span aria-current="page" className="font-semibold text-[#374151]">
                {crumb.label}
              </span>
            ) : (
              <Link href={crumb.href} className="hover:text-rust">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
    </nav>
  );
}
