import Image from "next/image";
import Link from "next/link";
import { site } from "@/data/site";

export default function TopBar() {
  return (
    <div className="bg-white">
      <div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link href="/">
          <Image src="/images/Logo.png" alt="Ivy Cleans" width={309} height={149} className="h-auto w-[180px]" fetchPriority="high" loading="eager" />
        </Link>
        <div className="flex items-center gap-8">
          <div>
            <h3 className="text-[1.6rem] font-bold">Prefer to call? We're available now.</h3>
            <p><a href={site.phoneHref} className="text-rust font-semibold">{site.phone}</a></p>
          </div>
          <div className="hidden md:block">
            <h3 className="text-[1.6rem] font-bold">Email</h3>
            <p>{site.email}</p>
          </div>
          <Link href={site.bookingUrl} className="bg-rust border-rust border px-6 py-3 text-[1.8rem] leading-[1.2em] text-white transition-colors hover:bg-white hover:text-rust">
            SET AN APPOINTMENT 👈
          </Link>
        </div>
      </div>
    </div>
  );
}
