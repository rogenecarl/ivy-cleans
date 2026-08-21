import Image from "next/image";
import Link from "next/link";
import { CheckItemIcon } from "@/components/Icons";
import type { DeepCleaningData } from "@/data/deep-cleaning";

/*
 * Section ada1bba ("deep-sec03"): deep-bg3.jpg (top center / no-repeat /
 * cover) is what makes the white heading/checklist text legible; padding
 * 6/3/2rem. Heading (6bde336) centered white 4.5/4/2.8rem, 1rem bottom
 * margin at desktop only. Inner section eaa3b3e (margin-top 1rem, 0 at
 * mobile): 50/50 columns — image (d0c112e, 586x613) in column 4bec5f9
 * (padding-right 1rem; padding-bottom 1rem at mobile), listIntro (bc7b0ff,
 * 2/1.9/1.7rem font-BOLD white) + checklist (c1f51fd) in column 9219e61,
 * which is vertically centred and takes padding-left 1rem plus a further
 * margin-left 2rem above 1024px (3rem combined).
 *
 * Icon list c1f51fd matches 43f5286 except that both icon and text are
 * #FFFFFF and the icon's padding-inline-end is 1rem rather than the 8px
 * default.
 *
 * Section 8822d40 (note/contact/CTA) uses deep-bg4.jpg with padding
 * 8rem 0 60rem / 3rem 0 24rem / 2rem 0 11rem — the huge bottom padding
 * exposes the art. Black text (9a171df h3 2.9/2.5/2rem font-light,
 * 576efa4 paragraph 2/1.9/1.7rem font-light) and a centered button whose
 * top margin is 1rem at desktop, 3rem at tablet, 0 at mobile.
 *
 * Special case: on the live page the anchor
 * <a href="https://ivycleans.com/how-to-clean-a-bathroom/"> does not wrap
 * the bathroom item's text — it wraps the ENTIRE following <li> ("Cleaning
 * and disinfecting of kitchen appliances..."), icon included. Reproduced
 * as-is via deepServicesLinkedItemIndex rather than "fixed."
 */
export default function DeepServices({
  deepServices,
  deepServicesLinkHref,
  deepServicesLinkedItemIndex,
  bookHref,
}: {
  deepServices: DeepCleaningData["deepServices"];
  deepServicesLinkHref: DeepCleaningData["deepServicesLinkHref"];
  deepServicesLinkedItemIndex: DeepCleaningData["deepServicesLinkedItemIndex"];
  /* innerSite.bookUrl — "/book", or "/<cityKey>/book" inside a draft preview. */
  bookHref: string;
}) {
  return (
    <>
      <section className="bg-[url(/images/deep-bg3.jpg)] bg-top bg-cover bg-no-repeat py-[2rem] md:py-[3rem] lg:py-[6rem]">
        <div className="ec">
          <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-white md:text-[4rem] lg:mb-[3rem] lg:text-[4.5rem]">
            {deepServices.h2}
          </h2>
          <div className="flex flex-wrap items-center md:pt-[1rem]">
            <div className="w-full pb-[1rem] md:w-[50%] md:pr-[1rem] md:pb-0">
              <Image
                src={deepServices.image}
                alt=""
                width={586}
                height={613}
                className="h-auto w-full"
              />
            </div>
            <div className="w-full pt-[1rem] md:w-[50%] md:pt-0 md:pl-[1rem] lg:pl-[3rem]">
              <div className="flow-root mb-0 lg:mb-[2rem]">
                <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-bold text-white md:text-[1.9rem] lg:text-[2rem]">
                  {deepServices.listIntro}
                </p>
              </div>
              <ul>
                {deepServices.items.map((item, i) => {
                  const row = (
                    <>
                      <span className="mt-[1px] flex w-[2.125rem] shrink-0 md:w-[2.375rem] lg:w-[2.5rem]">
                        <CheckItemIcon className="h-[1.7rem] w-[1.7rem] text-white md:h-[1.9rem] md:w-[1.9rem] lg:h-[2rem] lg:w-[2rem]" />
                      </span>
                      <span className="text-[1.7rem] leading-[1.4em] font-light text-white md:text-[1.9rem] lg:text-[2rem]">
                        {item}
                      </span>
                    </>
                  );
                  return (
                    <li key={item} className="mb-[1.5rem] last:mb-0">
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

      <section className="bg-[url(/images/deep-bg4.jpg)] bg-top bg-cover bg-no-repeat pt-[2rem] pb-[11rem] text-center md:pt-[3rem] md:pb-[24rem] lg:pt-[8rem] lg:pb-[60rem]">
        <div className="ec">
          <h3 className="mb-[2rem] text-[2rem] leading-[1.2em] font-light text-black md:text-[2.5rem] lg:mb-[3rem] lg:text-[2.9rem]">
            {deepServices.note}
          </h3>
          <div className="flow-root mb-0 lg:mb-[2rem]">
            <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light text-black md:text-[1.9rem] lg:text-[2rem]">
              {deepServices.contact}
            </p>
          </div>
          <Link
            href={bookHref}
            className="bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[1px] px-[30px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white md:mt-[3rem] lg:mt-[1rem]"
          >
            Set an appointment 👈
          </Link>
        </div>
      </section>
    </>
  );
}
