import Link from "next/link";
import { site } from "@/data/site";

export default function CtaButton({ size = "base" }: { size?: "base" | "lg" }) {
  return (
    <Link
      href={site.bookingUrl}
      className={`bg-rust border-rust inline-block border leading-[1.2em] text-white transition-colors hover:bg-white hover:text-rust ${
        size === "lg" ? "px-10 py-5 text-[2.4rem]" : "px-8 py-4 text-[1.8rem]"
      }`}
    >
      SET AN APPOINTMENT 👈
    </Link>
  );
}
