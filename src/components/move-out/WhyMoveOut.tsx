import Image from "next/image";
import Link from "next/link";
import type { MoveOutData } from "@/data/move-out";

// post-241.css ebf286a: #F9FFFD, padding 6/3/2rem; heading 2977147 mb 1rem / 0 / -1rem.
// Row 1 d25e9c0: out-img1.jpg (5828e94, 47.674%, bleeds -12rem left above 1280) + text 51cf507/63c8400 52.326%.
// Row 2 c34f37e reverse-mobile: text 10e25f6/a96318f + out-img2.jpg (d42746d/71fc621, bleeds right). Button 608ce98 mt 5/3/0rem.
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
