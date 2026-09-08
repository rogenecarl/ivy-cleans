import Image from "next/image";
import Link from "next/link";
import { CheckItemIcon } from "@/components/Icons";
import type { ServiceContent } from "@/data/service-types";

// b30eca6: deep-bg2.jpg (CSS defaults), padding 6/3/2rem. Heading c019ab6; intro 648bcac (live also carries an injected spam paragraph, excluded).
// Inner 878b0c4 50/50: listIntro 045ef5e + list 43f5286 (2/1.9/1.7rem, #5A8E00 icons in a 1.25em box, 1.5rem apart) | deep-bg4.jpg.
// Wrappers are flow-root so paragraph margins don't collapse, as on live. Outro 11ebcf1; button 216a703 1rem top on desktop.
export default function Benefits({
  benefits,
  benefitsBgImage,
  bookHref,
}: {
  benefits: ServiceContent["benefits"];
  benefitsBgImage: ServiceContent["benefitsBgImage"];
  /* innerSite.bookUrl — "/book", or "/<cityKey>/book" inside a draft preview. */
  bookHref: string;
}) {
  return (
    <section className="bg-[url(/images/deep-bg2.jpg)] py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-black md:text-[4rem] lg:mb-[3rem] lg:text-[4.5rem]">
          {benefits.h2}
        </h2>
        <div className="flow-root mb-0 lg:mb-[2rem]">
          {benefits.intro.map((p) => (
            <p
              key={p.slice(0, 40)}
              className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]"
            >
              {p}
            </p>
          ))}
        </div>

        <div className="mb-[2rem] flex flex-wrap items-start md:mb-[4rem]">
          <div className="w-full pb-[1rem] md:w-[50%] md:pr-[1rem] md:pb-0">
            <div className="flow-root mb-0 lg:mb-[2rem]">
              <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
                {benefits.listIntro}
              </p>
            </div>
            <ul>
              {benefits.items.map((item) => (
                <li
                  key={item}
                  className="mb-[1.5rem] flex items-start last:mb-0"
                >
                  <span className="mt-[1px] flex w-[2.125rem] shrink-0 md:w-[2.375rem] lg:w-[2.5rem]">
                    <CheckItemIcon className="h-[1.7rem] w-[1.7rem] text-[#5A8E00] md:h-[1.9rem] md:w-[1.9rem] lg:h-[2rem] lg:w-[2rem]" />
                  </span>
                  <span className="text-[1.7rem] leading-[1.4em] font-light text-black md:text-[1.9rem] lg:text-[2rem]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full pt-[1rem] md:w-[50%] md:pt-0 md:pl-[1rem]">
            <Image
              src={benefitsBgImage}
              alt=""
              width={800}
              height={390}
              className="h-auto w-full"
            />
          </div>
        </div>

        <div className="flow-root mb-0 lg:mb-[2rem]">
          <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
            {benefits.outro}
          </p>
        </div>

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
