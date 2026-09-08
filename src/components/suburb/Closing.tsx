import Link from "next/link";
import type { SuburbData } from "@/data/suburb";

// post-664.css 202a0f88: deep-bg4.jpg, padding 8/3/2rem top, 60/24/11rem bottom. Heading 7e11ad40 font-light 2.9/2.5/2rem,
// mb 2rem/3rem; paragraph 763de813 mb 0/2rem; button 2ea2c822 mt 3rem md / 1rem lg.
export default function Closing({
  closing,
  bookHref,
}: {
  closing: SuburbData["closing"];
  /* innerSite.bookUrl — "/book", or "/<cityKey>/book" inside a draft preview. */
  bookHref: string;
}) {
  return (
    <section className="bg-[url(/images/deep-bg4.jpg)] bg-top bg-cover bg-no-repeat pt-[2rem] pb-[11rem] text-center md:pt-[3rem] md:pb-[24rem] lg:pt-[8rem] lg:pb-[60rem]">
      <div className="ec">
        <h3 className="mb-[2rem] text-[2rem] leading-[1.2em] font-light text-black md:text-[2.5rem] lg:mb-[3rem] lg:text-[2.9rem]">
          {closing.heading}
        </h3>
        <div className="flow-root mb-0 lg:mb-[2rem]">
          <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light text-black md:text-[1.9rem] lg:text-[2rem]">
            {closing.paragraph}
          </p>
        </div>
        {/* closing.ctaLabel present-but-unused — see SuburbHero.tsx's comment. */}
        <Link
          href={bookHref}
          className="bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[1px] px-[30px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white md:mt-[3rem] lg:mt-[1rem]"
        >
          Set an appointment 👈
        </Link>
      </div>
    </section>
  );
}
