import Link from "next/link";
import { breadcrumbListJsonLd, type Crumb } from "@/data/breadcrumbs";

// Visible trail + BreadcrumbList JSON-LD from one array. No live reference: rem ladder sizes, kit colours.
export default function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  if (trail.length < 2) return null;
  const last = trail.length - 1;

  // escape < so a title can't close the script tag
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
