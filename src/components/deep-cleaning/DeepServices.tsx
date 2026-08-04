import Image from "next/image";
import Link from "next/link";
import { CheckItemIcon } from "@/components/Icons";
import {
  deepServices,
  deepServicesLinkHref,
  deepServicesLinkedItemIndex,
} from "@/data/deep-cleaning";

/*
 * Section ada1bba ("deep-sec03"): heading (6bde336) centered white,
 * 2.8/4/4.5rem. The live section carries a deep-bg3.jpg background (not in
 * the round-3 asset set) which is what makes the white heading/checklist
 * text (bc7b0ff, c1f51fd — icon+text both #FFFFFF) legible; herogreen
 * stands in as a placeholder dark background until Task 4 adds the real
 * image. Inner section eaa3b3e: 50/50 columns, image (d0c112e, 586x613)
 * left, listIntro + checklist right (vertically centered, 2rem gutter at
 * desktop).
 *
 * Section 8822d40 (note/contact/CTA): DOES use deep-bg4.jpg — already
 * downloaded — as its own background, with black text (9a171df h3 2.9rem
 * font-light, 576efa4 paragraph 2rem font-light) and a centered button.
 *
 * Special case: on the live page the anchor
 * <a href="https://ivycleans.com/how-to-clean-a-bathroom/"> does not wrap
 * the bathroom item's text — it wraps the ENTIRE following <li> ("Cleaning
 * and disinfecting of kitchen appliances..."), icon included. Reproduced
 * as-is via deepServicesLinkedItemIndex rather than "fixed."
 */
export default function DeepServices() {
  return (
    <>
      <section className="bg-herogreen py-[2rem] md:py-[3rem] lg:py-[6rem]">
        <div className="ec">
          <h2 className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-white md:text-[4rem] lg:text-[4.5rem]">
            {deepServices.h2}
          </h2>
          <div className="flex flex-wrap items-center gap-y-[2rem]">
            <div className="w-full md:w-[50%]">
              <Image
                src={deepServices.image}
                alt=""
                width={586}
                height={613}
                className="h-auto w-full"
              />
            </div>
            <div className="w-full md:w-[50%] md:pl-[2rem]">
              <p className="mb-[1rem] text-[1.7rem] leading-[1.5em] font-bold text-white md:text-[1.9rem] lg:text-[2rem]">
                {deepServices.listIntro}
              </p>
              <ul>
                {deepServices.items.map((item, i) => {
                  const row = (
                    <>
                      <CheckItemIcon className="mt-[0.3rem] h-[1.4rem] w-[1.4rem] shrink-0 text-white" />
                      <span className="text-[1.6rem] leading-[1.5em] text-white">{item}</span>
                    </>
                  );
                  return (
                    <li key={item} className="mb-[0.75rem] last:mb-0">
                      {i === deepServicesLinkedItemIndex ? (
                        <a
                          href={deepServicesLinkHref}
                          className="flex items-start gap-[1rem]"
                        >
                          {row}
                        </a>
                      ) : (
                        <div className="flex items-start gap-[1rem]">{row}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section
        className="bg-[url(/images/deep-bg4.jpg)] bg-cover bg-top bg-no-repeat py-[2rem] text-center md:py-[3rem] lg:py-[6rem]"
      >
        <div className="ec">
          <h3 className="mb-[1rem] text-[1.7rem] leading-[1.4em] font-light text-black md:text-[2rem] lg:text-[2.9rem]">
            {deepServices.note}
          </h3>
          <p className="text-[1.7rem] leading-[1.5em] font-light text-black md:text-[1.9rem] lg:text-[2rem]">
            {deepServices.contact}
          </p>
          <Link
            href="/book"
            className="bg-rust border-rust hover:text-rust mt-[1rem] inline-block rounded-[5px] border-[1px] px-[30px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white"
          >
            Set an appointment 👈
          </Link>
        </div>
      </section>
    </>
  );
}
