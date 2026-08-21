import Image from "next/image";
import Link from "next/link";
import type { MoveOutData } from "@/data/move-out";

/*
 * Section ebf286a (post-241.css): bg #F9FFFD, padding 6/3/2rem. Heading
 * (2977147) centered black, 4.5/4/2.8rem — bottom margin 1rem desktop,
 * 0 tablet, -1rem mobile. Two alternating image/text rows, matching the live
 * DOM exactly:
 *   - Row 1 (inner section d25e9c0): out-img1.jpg (column 5828e94, left,
 *     47.674% at >=768px) + paragraphs 41-42 (column 51cf507/widget
 *     63c8400, right, 52.326%, padding 1rem all round, vertically centred).
 *     The image widget (357c257) carries margin 0 2rem 0 -12rem above
 *     1280px, so the photo bleeds left of the container.
 *   - Row 2 (inner section c34f37e, elementor-reverse-mobile): paragraphs
 *     43-44 (column 10e25f6/widget a96318f, left at >=768px, padding 1rem)
 *     + out-img2.jpg (column d42746d/widget 71fc621, right, 47.674%, margin
 *     0 -12rem 0 2rem above 1280px) — "reverse-mobile" puts the image above
 *     the text on mobile, reproduced here via order-1/order-2.
 * The CTA button (608ce98) is a sibling of the two inner sections (a direct
 * child of column f95a6f3), so it centres across the whole container rather
 * than within the right column — the live page's third "Set an
 * appointment 👈" → /book body CTA — with a top margin of 5rem desktop /
 * 3rem tablet / 0 mobile.
 */
export default function WhyMoveOut({
  whyMoveOut,
  bookHref,
}: {
  whyMoveOut: MoveOutData["whyMoveOut"];
  /* innerSite.bookUrl — "/book", or "/<cityKey>/book" inside a draft preview. */
  bookHref: string;
}) {
  return (
    <section className="bg-[#F9FFFD] py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <h2 className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-black md:mb-[2rem] md:text-[4rem] lg:mb-[3rem] lg:text-[4.5rem]">
          {whyMoveOut.h2}
        </h2>

        <div className="flex flex-wrap items-center">
          <div className="w-full md:w-[47.674%]">
            <div className="p-[10px]">
              <div className="min-[1281px]:mr-[2rem] min-[1281px]:ml-[-12rem]">
                <Image
                  src={whyMoveOut.row1.image}
                  alt=""
                  width={703}
                  height={486}
                  className="h-auto w-full"
                />
              </div>
            </div>
          </div>
          <div className="w-full md:w-[52.326%]">
            <div className="p-[1rem]">
              <div className="flow-root mb-[-2rem] lg:mb-0">
                {whyMoveOut.row1.paragraphs.map((p) => (
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

        <div className="flex flex-wrap items-center">
          <div className="order-2 w-full md:order-1 md:w-[52.326%]">
            <div className="p-[1rem]">
              <div className="flow-root md:mb-[-2rem] lg:mb-0">
                {whyMoveOut.row2.paragraphs.map((p) => (
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
          <div className="order-1 w-full md:order-2 md:w-[47.674%]">
            <div className="p-[10px]">
              <div className="min-[1281px]:mr-[-12rem] min-[1281px]:ml-[2rem]">
                <Image
                  src={whyMoveOut.row2.image}
                  alt=""
                  width={703}
                  height={563}
                  className="h-auto w-full"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link
            href={bookHref}
            className="bg-rust border-rust hover:text-rust inline-block md:mt-[3rem] lg:mt-[5rem] rounded-[5px] border-[1px] px-[30px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white"
          >
            Set an appointment 👈
          </Link>
        </div>
      </div>
    </section>
  );
}
