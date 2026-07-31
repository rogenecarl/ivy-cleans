import Link from "next/link";
import { heroParagraphs } from "@/data/services";
import { innerSite } from "@/data/site";

export default function HomeHero() {
  return (
    <section className="bg-white py-[2rem] md:py-[3rem] lg:py-[8rem]">
      <div className="ec">
        <h1 className="text-herogreen mb-[2rem] text-center text-[3rem] leading-[1.2em] font-bold uppercase md:text-[4rem] lg:text-[7.2rem]">
          Cleaning Services Minneapolis
        </h1>
        <div className="text-[1.6rem] leading-[1.5em] font-light md:text-[1.8rem] lg:text-[1.9rem]">
          {heroParagraphs.map((p) => (
            <p key={p.slice(0, 40)} className="mb-[2rem]">
              {p}
            </p>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-[1rem]">
          <Link
            href="/book"
            className="bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[0.1rem] px-[2.4rem] py-[1.1rem] text-[1.8rem] leading-[1.2em] font-bold text-white uppercase transition-colors hover:bg-white"
          >
            Book A Cleaning 👉
          </Link>
          <a
            href={innerSite.phoneHref}
            className="border-rust text-rust hover:bg-rust inline-block rounded-[5px] border-[0.1rem] px-[2.4rem] py-[1.1rem] text-[1.8rem] leading-[1.2em] font-bold uppercase transition-colors hover:text-white"
          >
            Call Us Now!
          </a>
        </div>
      </div>
    </section>
  );
}
