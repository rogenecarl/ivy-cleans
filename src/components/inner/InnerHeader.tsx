"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SiteData } from "@/data/site";
import { CaretDownIcon } from "@/components/Icons";

// Inner header: template 47, section dbb7784
// live a.elementor-item: padding 13px 20px, 1.6rem/600, line-height 0.5em; the caret sets the row height
const linkClass =
  "relative flex px-[20px] py-[13px] text-[1.6rem] leading-[0.5em] font-semibold";

export default function InnerHeader({
  site,
  cityKey,
  homeHref,
}: {
  site: SiteData["site"];
  cityKey: string;
  /* cityHref(c, "/") — "/" for a live tenant, "/<cityKey>" for a draft preview. */
  homeHref: string;
}) {
  const [open, setOpen] = useState(false);
  // usePathname is /<city>/home on the server and /home in the browser, and a draft
  // city's hrefs carry the prefix too, so normalise both sides
  const rawPathname = usePathname();
  const stripCity = (p: string) =>
    p === `/${cityKey}`
      ? "/"
      : p.startsWith(`/${cityKey}/`)
        ? p.slice(cityKey.length + 1)
        : p;
  const pathname = stripCity(rawPathname);
  const isActive = (href: string) => pathname === stripCity(href);
  // services come from site.serviceNav, not a slice of site.nav
  const dropdown = site.serviceNav;
  const topLevel = site.nav;
  // mobile menu is flat: services go right after Cleaning Services
  const servicesIndex = site.nav.findIndex((n) => n.label === "Cleaning Services");
  const mobileNav =
    servicesIndex === -1
      ? [...site.nav, ...site.serviceNav]
      : [
          ...site.nav.slice(0, servicesIndex + 1),
          ...site.serviceNav,
          ...site.nav.slice(servicesIndex + 1),
        ];

  return (
    // live: section padding 1.4rem 0 on top of the column's own 10px (.ec) =>
    // header measures 83px @1440 / 89px @390, logo top edge at y=22 / y=24.
    <header className="sticky top-0 z-50 bg-[#C5ECEC] py-[1.4rem]">
      {/* columns are flex-start; only the nav widget is self-centred */}
      <div className="ec flex items-start">
        {/* live wraps the logo in a link to the site root, not /home */}
        <Link href={homeHref} className="shrink-0">
          <Image
            src="/images/Logo.png"
            alt="Ivy Cleans"
            width={309}
            height={149}
            className="h-auto w-[8.4rem]"
            fetchPriority="high"
            loading="eager"
          />
        </Link>
        {/* desktop + tablet nav */}
        {/* live: logo ends at x=305 and the first nav link starts at x=358 */}
        <nav className="ml-[6.4rem] hidden self-center md:block">
          {/* items stretch: every <a> takes the row height set by the caret item */}
          <ul className="flex">
            {topLevel.map((item) => {
              const active = isActive(item.href);
              const cls = `${linkClass} ${active ? "text-rust" : "text-herogreen"}`;
              const bar = active ? (
                <span className="bg-rust absolute right-0 bottom-0 left-0 h-[3px]" />
              ) : null;
              return (
                <li key={item.href} className="flex">
                  {item.label === "Cleaning Services" ? (
                    <div className="group relative flex">
                      <Link href={item.href} className={cls}>
                        {item.label}
                        {/* sub-arrow: 18px box whose 1em line-height sets the row height */}
                        <span className="ml-[10px] flex h-[1.6rem] w-[8px] shrink-0 items-center">
                          <CaretDownIcon className="h-[8px] w-[8px]" />
                        </span>
                        {bar}
                      </Link>
                      <div className="absolute top-full left-0 z-50 hidden min-w-[26rem] bg-white shadow-lg group-hover:block">
                        {dropdown.map((d) => (
                          <Link
                            key={d.href}
                            href={d.href}
                            className="text-herogreen hover:text-rust block px-[2rem] py-[1.2rem] text-[1.6rem] leading-[1.2em]"
                          >
                            {d.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Link href={item.href} className={cls}>
                      {item.label}
                      {bar}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
        {/* mobile toggle */}
        <button
          aria-label="Menu Toggle"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="ml-auto flex flex-col items-center justify-center gap-[0.4rem] self-center md:hidden"
        >
          <span className="bg-herogreen block h-[2px] w-[2.2rem]" />
          <span className="bg-herogreen block h-[2px] w-[2.2rem]" />
          <span className="bg-herogreen block h-[2px] w-[2.2rem]" />
        </button>
      </div>
      {open && (
        <nav className="bg-[#C5ECEC] md:hidden">
          {mobileNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block border-b border-black/10 px-[2rem] py-[1.2rem] text-[1.6rem] leading-[1.2em] font-semibold ${
                isActive(item.href) ? "text-rust" : "text-herogreen"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
