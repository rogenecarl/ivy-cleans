import Link from "next/link";
import type { SuburbData } from "@/data/suburb";
import Linked from "@/components/Linked";

// post-664.css 3d1cf513: deep-bg1.jpg, padding 6rem 0 50rem / 3rem 0 30rem / 2rem 0 18rem. h1 275ed2e4 7.2/4/3rem;
// copy 762e0136 max-w 106rem; button 48377b61 3rem top from md. Title lines joined by a space: live wraps naturally.
export default function SuburbHero({
  hero,
  bookHref,
}: {
  hero: SuburbData["hero"];
  /* innerSite.bookUrl — "/book", or "/<cityKey>/book" inside a draft preview. */
  bookHref: string;
}) {
  return (
    <section className="bg-[url(/images/deep-bg1.jpg)] bg-bottom bg-cover bg-no-repeat pt-[2rem] pb-[18rem] text-center md:pt-[3rem] md:pb-[30rem] lg:pt-[6rem] lg:pb-[50rem]">
      <div className="ec">
        <h1 className="text-herogreen mb-0 text-[3rem] leading-[1.2em] font-bold uppercase md:mb-[2rem] md:text-[4rem] lg:text-[7.2rem]">
          {hero.titleLines[0]} {hero.titleLines[1]}
        </h1>
        <div className="mx-auto max-w-[106rem] flow-root md:mb-[-2rem] lg:mb-0">
          {hero.paragraphs.map((p) => (
            <p
              key={p.slice(0, 40)}
              className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]"
            >
              <Linked text={p} links={hero.links} />
            </p>
          ))}
        </div>
        {/* hero.ctaLabel unused: CTA text is hardcoded like every other button */}
        <Link
          href={bookHref}
          className="bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[1px] px-[30px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white md:mt-[3rem]"
        >
          Set an appointment 👈
        </Link>
      </div>
    </section>
  );
}
