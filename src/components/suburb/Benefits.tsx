import Link from "next/link";
import type { SuburbData } from "@/data/suburb";

// post-664.css 6890e115: deep-bg2.jpg (CSS default position/repeat), padding 6/3/2rem. Heading 156617a3 mb 2rem/3rem;
// paragraphs 6abbf289 mb 0/2rem (kit floor shows through since the follower has no margin-top).
export default function Benefits({
  benefits,
  bookHref,
}: {
  benefits: SuburbData["benefits"];
  /* innerSite.bookUrl — "/book", or "/<cityKey>/book" inside a draft preview. */
  bookHref: string;
}) {
  return (
    <section className="bg-[url(/images/deep-bg2.jpg)] py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-black md:text-[4rem] lg:mb-[3rem] lg:text-[4.5rem]">
          {benefits.heading}
        </h2>
        <div className="flow-root mb-0 lg:mb-[2rem]">
          {benefits.paragraphs.map((p) => (
            <p
              key={p.slice(0, 40)}
              className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]"
            >
              {p}
            </p>
          ))}
        </div>

        {/* the benefits list and eco line that sat here were cut: identical on every area page */}
        <div className="text-center">
          <Link
            href={bookHref}
            className="bg-rust border-rust hover:text-rust inline-block lg:mt-[1rem] rounded-[5px] border-[1px] px-[30px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white"
          >
            Set an appointment 👈
          </Link>
        </div>
      </div>
    </section>
  );
}
