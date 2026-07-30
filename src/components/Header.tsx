"use client";

import { useState } from "react";
import Link from "next/link";
import { site } from "@/data/site";

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

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="bg-brand sticky top-0 z-50">
      <div className="mx-auto max-w-[1140px] px-4">
        {/* desktop nav */}
        <nav className="hidden items-center lg:flex">
          {topLevel.map((item) =>
            item.label === "Cleaning Services" ? (
              <div key={item.href} className="group relative">
                <Link href={item.href} className="block px-5 py-4 font-semibold text-white hover:opacity-80">
                  {item.label}
                </Link>
                <div className="absolute left-0 top-full z-50 hidden min-w-[260px] bg-white shadow-lg group-hover:block">
                  {dropdown.map((d) => (
                    <Link key={d.href} href={d.href} className="hover:text-rust block px-5 py-3 text-black">
                      {d.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link key={item.href} href={item.href} className="block px-5 py-4 font-semibold text-white hover:opacity-80">
                {item.label}
              </Link>
            )
          )}
        </nav>
        {/* mobile bar */}
        <div className="flex items-center justify-between py-3 lg:hidden">
          <span className="font-semibold text-white">Menu</span>
          <button aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)} className="flex h-10 w-10 flex-col items-center justify-center gap-1.5">
            <span className="h-0.5 w-6 bg-white" />
            <span className="h-0.5 w-6 bg-white" />
            <span className="h-0.5 w-6 bg-white" />
          </button>
        </div>
      </div>
      {open && (
        <nav className="bg-brand lg:hidden">
          {site.nav.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block border-t border-white/20 px-5 py-3 text-white">
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
