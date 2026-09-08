import Link from "next/link";
import type { MoveOutData } from "@/data/move-out";

// post-241.css 8e7126c: out-bg1.jpg, padding 6/3/2rem top. h1 72b9aa8 7.2/4/3rem; paragraph 52f5c93 max-w 120rem; CTA d3dbf9e 3rem top.
// Inner 9683b22: white card pushed down 28rem/7rem/1rem, column e188474 padded 6rem 7.4rem / 3rem / 2rem.
export default function MoveHero({
  moveHero,
  bookHref,
}: {
  moveHero: MoveOutData["moveHero"];
  /* innerSite.bookUrl — "/book", or "/<cityKey>/book" inside a draft preview. */
  bookHref: string;
}) {
  const [first, ...rest] = moveHero.paragraphs;
  // live: `Minneapolis Move Out <br> Cleaning Services`, <br> hidden below 768
  const h1Words = moveHero.h1.split(" ");
  return (
    <section className="bg-[url(/images/out-bg1.jpg)] bg-top bg-cover bg-no-repeat pt-[2rem] pb-0 md:pt-[3rem] lg:pt-[6rem]">
      <div className="ec">
        <h1 className="text-herogreen mb-0 text-center text-[3rem] leading-[1.2em] font-bold uppercase md:mb-[2rem] md:text-[4rem] lg:text-[7.2rem]">
          {h1Words.slice(0, 3).join(" ")} <br className="max-md:hidden" />
          {h1Words.slice(3).join(" ")}
        </h1>
        <div className="mx-auto flow-root max-w-[120rem] text-center md:mb-[-2rem] lg:mb-0">
          <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
            {first}
          </p>
        </div>
        <div className="pb-[2rem] text-center">
          <Link
            href={bookHref}
            className="bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[1px] px-[30px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white md:mt-[3rem]"
          >
            Set an appointment 👈
          </Link>
        </div>

        <div className="mt-[1rem] bg-white md:mt-[7rem] lg:mt-[28rem]">
          <div className="p-[2rem] md:p-[3rem] lg:px-[7.4rem] lg:py-[6rem]">
            <div className="flow-root mb-[-2rem] lg:mb-0">
              {rest.map((p) => (
                <p
                  key={p.slice(0, 40)}
                  className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]"
                >
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
