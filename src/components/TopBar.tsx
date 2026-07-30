import Image from "next/image";
import Link from "next/link";
import { site } from "@/data/site";
import { TileIcon } from "./Icons";

export default function TopBar() {
  return (
    <div className="bg-white">
      <div className="ec flex flex-col items-center gap-0 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="py-[1rem] lg:py-0">
          <Image
            src="/images/Logo.png"
            alt="Ivy Cleans"
            width={309}
            height={149}
            className="h-auto w-[100px] lg:w-[137px]"
            fetchPriority="high"
            loading="eager"
          />
        </Link>
        <div className="flex w-full items-start justify-between gap-0 lg:w-auto lg:justify-start lg:gap-[3rem]">
          <div className="flex w-1/2 flex-col items-center text-center lg:w-auto lg:flex-row lg:items-start lg:gap-[1.8rem] lg:text-left">
            <TileIcon kind="phone" />
            <div className="w-full min-w-0 lg:w-auto">
              <h3 className="mt-[0.5rem] text-[1.4rem] leading-[1.2em] font-light">
                <a href={site.phoneHref}>Prefer to call? We&rsquo;re available now.</a>
              </h3>
              <p className="text-[1.8rem] leading-[1.5em] font-medium break-words lg:text-[2rem]">
                <a href={site.phoneHref}>{site.phone}</a>
              </p>
            </div>
          </div>
          <div className="flex w-1/2 flex-col items-center text-center lg:w-auto lg:flex-row lg:items-start lg:gap-[1.8rem] lg:text-left">
            <TileIcon kind="email" />
            <div className="w-full min-w-0 lg:w-auto">
              <h3 className="mt-[0.5rem] text-[1.4rem] leading-[1.2em] font-light">
                <a href={`mailto:${site.email}`}>Email</a>
              </h3>
              <p className="text-[1.8rem] leading-[1.5em] font-medium break-words lg:text-[2rem]">
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </p>
            </div>
          </div>
        </div>
        <div className="py-[1rem] lg:py-0">
          <Link
            href={site.bookingUrl}
            className="bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[0.1rem] px-[2.4rem] py-[1.1rem] text-[1.6rem] leading-[1.2em] font-bold text-white uppercase transition-colors hover:bg-white lg:text-[1.8rem]"
          >
            SET AN APPOINTMENT 👈
          </Link>
        </div>
      </div>
    </div>
  );
}
