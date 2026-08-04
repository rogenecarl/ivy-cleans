import Link from "next/link";
import { moveHero } from "@/data/move-out";

/*
 * Section 8e7126c (post-241.css): out-bg1.jpg (top center / no-repeat /
 * cover) with padding 6/3/2rem on top and zero bottom padding at every
 * breakpoint. h1 (72b9aa8) is centered, uppercase, herogreen, 7.2/4/3rem,
 * with a -2rem widget margin at mobile only. First paragraph (52f5c93) is
 * centered, max-w 120rem, 2/1.9/1.7rem font-light; CTA (d3dbf9e) sits
 * directly below it with a 3rem top margin (0 at mobile).
 *
 * The remaining four paragraphs live in inner section 9683b22 — a WHITE
 * card pushed down 28rem (7rem tablet / 1rem mobile) so the kitchen art
 * shows through above it. Its column (e188474) is padded
 * 6rem 7.4rem / 3rem / 2rem, and the text widget (29455cb) is left-aligned
 * 2/1.9/1.7rem font-light.
 */
export default function MoveHero() {
  const [first, ...rest] = moveHero.paragraphs;
  /*
   * live markup: `Minneapolis Move Out <br> Cleaning Services`. The theme
   * hides every <br> below 768px, hence max-md:hidden.
   */
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
            href="/book"
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
