import Link from "next/link";
import type { SiteData } from "@/data/site";

/**
 * size "base" — hero / top-bar button (1.8rem)
 * size "lg"   — CTA band and in-section CTAs (2rem mobile, 2.4rem desktop)
 */
export default function CtaButton({
  size = "base",
  site,
}: {
  size?: "base" | "lg";
  site: SiteData["site"];
}) {
  return (
    <Link
      href={site.bookingUrl}
      className={`bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[0.1rem] px-[2.4rem] py-[1.1rem] leading-[1.2em] font-bold text-white uppercase transition-colors hover:bg-white ${
        size === "lg" ? "text-[2rem] lg:text-[2.4rem]" : "text-[1.8rem]"
      }`}
    >
      SET AN APPOINTMENT 👈
    </Link>
  );
}
