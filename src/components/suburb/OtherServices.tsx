import Image from "next/image";
import Link from "next/link";
import { CheckItemIcon } from "@/components/Icons";
import type { SuburbData } from "@/data/suburb";

// post-664.css 207a70b: deep-bg3.jpg, padding 6/3/2rem; heading 19bdefd1 white, mb 2/3/4rem (kit 2rem + row margin + own 1rem).
// Inner 4481d252: image column 7d12dfb7 with deep-img2.jpg squashed to 329px tall at every width (live quirk, kept);
// text column 3df54a87, bold white intro 63667a00, icon list 77ead619 with 1rem end padding. Every item links.
export default function OtherServices({
  otherServices,
}: {
  otherServices: SuburbData["otherServices"];
}) {
  return (
    <section className="bg-[url(/images/deep-bg3.jpg)] bg-top bg-cover bg-no-repeat py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-white md:mb-[3rem] md:text-[4rem] lg:mb-[4rem] lg:text-[4.5rem]">
          {otherServices.heading}
        </h2>
        <div className="mt-0 flex flex-wrap items-center md:mt-[1rem]">
          <div className="w-full pb-[1rem] md:w-[50%] md:pr-[1rem] md:pb-0">
            <Image
              src="/images/deep-img2.jpg"
              alt=""
              width={586}
              height={613}
              className="h-[329px] w-full max-w-[458px] xl:max-w-none"
            />
          </div>
          <div className="w-full pt-[1rem] md:w-[50%] md:pt-0 md:pl-[1rem] lg:pl-[3rem]">
            <div className="flow-root mb-0 lg:mb-[2rem]">
              <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-bold text-white md:text-[1.9rem] lg:text-[2rem]">
                {otherServices.intro}
              </p>
            </div>
            <ul>
              {otherServices.links.map((link) => (
                <li key={link.label} className="mb-[1.5rem] last:mb-0">
                  <Link href={link.href} className="flex items-start gap-[1rem]">
                    <span className="mt-[1px] flex w-[2.125rem] shrink-0 md:w-[2.375rem] lg:w-[2.5rem]">
                      <CheckItemIcon className="h-[1.7rem] w-[1.7rem] text-white md:h-[1.9rem] md:w-[1.9rem] lg:h-[2rem] lg:w-[2rem]" />
                    </span>
                    <span className="text-[1.7rem] leading-[1.4em] font-light text-white md:text-[1.9rem] lg:text-[2rem]">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
