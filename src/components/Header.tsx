"use client";

import { useState } from "react";
import Link from "next/link";
import { site } from "@/data/site";
import { CaretDownIcon } from "./Icons";

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

const linkClass =
  "flex items-center gap-[0.5rem] py-[1rem] text-[1.8rem] leading-[1.2em] font-bold uppercase text-white hover:opacity-80";

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="bg-brand sticky top-0 z-50">
      <div className="ec">
        {/* desktop nav */}
        <nav className="hidden lg:block">
          <ul className="flex items-center gap-[2.5rem]">
            {topLevel.map((item, i) => (
              <li key={item.href} className="flex items-center gap-[2.5rem]">
                {i > 0 && <span aria-hidden className="h-[1.8rem] w-[2px] bg-white/60" />}
                {item.label === "Cleaning Services" ? (
                  <div className="group relative">
                    <Link href={item.href} className={linkClass}>
                      {item.label}
                      <CaretDownIcon className="h-[1.4rem] w-[1.4rem]" />
                    </Link>
                    <div className="absolute top-full left-0 z-50 hidden min-w-[26rem] bg-white shadow-lg group-hover:block">
                      {dropdown.map((d) => (
                        <Link
                          key={d.href}
                          href={d.href}
                          className="hover:text-rust block px-[2rem] py-[1.2rem] text-[1.6rem] text-black"
                        >
                          {d.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        {/* mobile toggle — centred white tile, as on the live site */}
        <div className="flex justify-center lg:hidden">
          <button
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="text-brand flex h-[3.3rem] w-[3.3rem] flex-col items-center justify-center gap-[0.4rem] rounded-[0.3rem] bg-white p-[0.55rem]"
          >
            <span className="bg-brand h-[2px] w-[1.9rem]" />
            <span className="bg-brand h-[2px] w-[1.9rem]" />
            <span className="bg-brand h-[2px] w-[1.9rem]" />
          </button>
        </div>
      </div>
      {open && (
        <nav className="bg-white lg:hidden">
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block border-b border-black/10 px-[2rem] py-[1rem] text-[1.8rem] leading-[1.2em] font-bold text-black uppercase"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
