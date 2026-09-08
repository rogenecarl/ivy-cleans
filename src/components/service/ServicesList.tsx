import Image from "next/image";
import Link from "next/link";
import { CheckItemIcon } from "@/components/Icons";
import type { ServiceContent } from "@/data/service-types";

// ada1bba: deep-bg3.jpg, padding 6/3/2rem; heading 6bde336 white. Inner eaa3b3e 50/50: image d0c112e, bold white intro bc7b0ff + list c1f51fd
// (white, 1rem icon end padding), text column centred with 1rem + 2rem left above 1024.
// 8822d40: deep-bg4.jpg, padding 8rem 0 60rem / 3rem 0 24rem / 2rem 0 11rem; h3 9a171df, paragraph 576efa4, centred button.
// Live quirk kept: the bathroom link wraps the ENTIRE next <li> (servicesLinkedItemIndex).
export default function ServicesList({
  services,
  servicesLinkHref,
  servicesLinkedItemIndex,
  bookHref,
}: {
  services: ServiceContent["services"];
  servicesLinkHref: ServiceContent["servicesLinkHref"];
  servicesLinkedItemIndex: ServiceContent["servicesLinkedItemIndex"];
  /* innerSite.bookUrl — "/book", or "/<cityKey>/book" inside a draft preview. */
  bookHref: string;
}) {
  return (
    <>
      <section className="bg-[url(/images/deep-bg3.jpg)] bg-top bg-cover bg-no-repeat py-[2rem] md:py-[3rem] lg:py-[6rem]">
        <div className="ec">
          <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-white md:text-[4rem] lg:mb-[3rem] lg:text-[4.5rem]">
            {services.h2}
          </h2>
          <div className="flex flex-wrap items-center md:pt-[1rem]">
            <div className="w-full pb-[1rem] md:w-[50%] md:pr-[1rem] md:pb-0">
              <Image
                src={services.image}
                alt=""
                width={586}
                height={613}
                className="h-auto w-full"
              />
            </div>
            <div className="w-full pt-[1rem] md:w-[50%] md:pt-0 md:pl-[1rem] lg:pl-[3rem]">
              <div className="flow-root mb-0 lg:mb-[2rem]">
                <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-bold text-white md:text-[1.9rem] lg:text-[2rem]">
                  {services.listIntro}
                </p>
              </div>
              <ul>
                {services.items.map((item, i) => {
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
                      {i === servicesLinkedItemIndex &&
                      servicesLinkHref !== "" ? (
                        <a
                          href={servicesLinkHref}
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
            {services.note}
          </h3>
          <div className="flow-root mb-0 lg:mb-[2rem]">
            <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light text-black md:text-[1.9rem] lg:text-[2rem]">
              {services.contact}
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
