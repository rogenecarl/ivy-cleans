import Image from "next/image";
import Link from "next/link";
import { whyMoveOut } from "@/data/move-out";

/*
 * Section ebf286a (post-241.css): bg #F9FFFD, padding 6/3/2rem. Heading
 * (2977147) centered black, 2.8/4/4.5rem. Two alternating image/text rows,
 * matching the live DOM exactly:
 *   - Row 1 (inner section d25e9c0): out-img1.jpg (column 5828e94, left,
 *     47.674% at >=768px) + paragraphs 41-42 (column 51cf507/widget
 *     63c8400, right, 52.326%).
 *   - Row 2 (inner section c34f37e, elementor-reverse-mobile): paragraphs
 *     43-44 (column 10e25f6/widget a96318f, left at >=768px) + out-img2.jpg
 *     (column d42746d/widget 71fc621, right, 47.674%) — "reverse-mobile"
 *     puts the image above the text on mobile, reproduced here via
 *     order-1/order-2.
 * The CTA button (608ce98) sits at the end of the section, after row 2 —
 * the live page's third "Set an appointment 👈" → /book body CTA.
 */
export default function WhyMoveOut() {
  return (
    <section className="pt-[2rem] pb-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <h2 className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-black md:text-[4rem] lg:text-[4.5rem]">
          {whyMoveOut.h2}
        </h2>

        <div className="flex flex-wrap items-center gap-y-[2rem]">
          <div className="w-full md:w-[47.674%]">
            <Image
              src={whyMoveOut.row1.image}
              alt=""
              width={703}
              height={486}
              className="h-auto w-full"
            />
          </div>
          <div className="w-full md:w-[52.326%] md:pl-[2rem]">
            {whyMoveOut.row1.paragraphs.map((p) => (
              <p
                key={p.slice(0, 40)}
                className="mb-[1rem] text-[1.7rem] leading-[1.5em] font-light last:mb-0 md:text-[1.9rem] lg:text-[2rem]"
              >
                {p}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-[2rem] flex flex-wrap items-center gap-y-[2rem]">
          <div className="order-2 w-full md:order-1 md:w-[52.326%] md:pr-[2rem]">
            {whyMoveOut.row2.paragraphs.map((p) => (
              <p
                key={p.slice(0, 40)}
                className="mb-[1rem] text-[1.7rem] leading-[1.5em] font-light last:mb-0 md:text-[1.9rem] lg:text-[2rem]"
              >
                {p}
              </p>
            ))}
          </div>
          <div className="order-1 w-full md:order-2 md:w-[47.674%]">
            <Image
              src={whyMoveOut.row2.image}
              alt=""
              width={703}
              height={563}
              className="h-auto w-full"
            />
          </div>
        </div>

        <div className="mt-[3rem] text-center">
          <Link
            href="/book"
            className="bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[1px] px-[30px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white"
          >
            Set an appointment 👈
          </Link>
        </div>
      </div>
    </section>
  );
}
