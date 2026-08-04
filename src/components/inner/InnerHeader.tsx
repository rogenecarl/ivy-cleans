"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/data/site";
import { CaretDownIcon } from "@/components/Icons";

/*
 * Inner-template header (elementor template 47, section dbb7784):
 * two columns — site logo, then the horizontal nav sitting immediately to its
 * right. Section background is the kit's #C5ECEC; nav links are #37745F and the
 * current item is #BF360C with elementor's e--pointer-underline bar.
 * `elementor-nav-menu--dropdown-mobile` => the burger only replaces the nav at
 * the mobile breakpoint (<=767px), so the horizontal nav survives on tablet.
 */
const topLevel = site.nav.filter(
  (n) =>
    n.label !== "Deep Cleaning Minneapolis" &&
    n.label !== "Minneapolis Move Out Cleaning Services"
);
const dropdown = site.nav.filter(
  (n) =>
    n.label === "Deep Cleaning Minneapolis" ||
    n.label === "Minneapolis Move Out Cleaning Services"
);

/* live @1440: each nav <a> measures h=39 => 1.6rem/1.2em type + 1.4rem of
   vertical padding; every link is exactly 40px wider than its text, i.e. a
   flat 20px horizontal padding rather than a rem-scaled one. */
const linkClass =
  "relative flex items-center gap-[0.6rem] px-[20px] py-[1.4rem] text-[1.6rem] leading-[1.2em] font-semibold";

export default function InnerHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;

  return (
    // live: section padding 1.4rem 0 on top of the column's own 10px (.ec) =>
    // header measures 83px @1440 / 89px @390, logo top edge at y=22 / y=24.
    <header className="sticky top-0 z-50 bg-[#C5ECEC] py-[1.4rem]">
      <div className="ec flex items-center">
        {/* live wraps the logo in a link to the site root, not /home */}
        <Link href="/" className="shrink-0">
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
        <nav className="ml-[6.4rem] hidden md:block">
          <ul className="flex items-center">
            {topLevel.map((item) => {
              const active = isActive(item.href);
              const cls = `${linkClass} ${active ? "text-rust" : "text-herogreen"}`;
              const bar = active ? (
                <span className="bg-rust absolute right-0 bottom-0 left-0 h-[3px]" />
              ) : null;
              return (
                <li key={item.href} className="flex items-center">
                  {item.label === "Cleaning Services" ? (
                    <div className="group relative">
                      <Link href={item.href} className={cls}>
                        {item.label}
                        <CaretDownIcon className="h-[1.2rem] w-[1.2rem]" />
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
          className="ml-auto flex flex-col items-center justify-center gap-[0.4rem] md:hidden"
        >
          <span className="bg-herogreen block h-[2px] w-[2.2rem]" />
          <span className="bg-herogreen block h-[2px] w-[2.2rem]" />
          <span className="bg-herogreen block h-[2px] w-[2.2rem]" />
        </button>
      </div>
      {open && (
        <nav className="bg-[#C5ECEC] md:hidden">
          {site.nav.map((item) => (
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
