import Link from "next/link";
import type { SiteData } from "@/data/site";
import { tiers } from "@/data/cleaning-services";

/*
 * The `.package` section: its container carries the table's top border and
 * 4px top radius (post-30.css "Start custom CSS"). Columns are 40/20/20/20 at
 * every width — the table never stacks — but below 768 live renders only the
 * "Packages" cell: the three tier columns and their Book Now buttons are
 * hidden, leaving a 55px-tall strip (measured @390).
 *
 * `.ec`'s 10px padding is deliberately not used here: live's table spans the
 * container edge to edge (x=225..1215 @1440, x=10..380 @390), so the wrapper
 * is the bare 119rem container and only the section keeps its 1rem gutter.
 */
export default function PackagesBar({
  innerSite,
}: {
  innerSite: SiteData["innerSite"];
}) {
  return (
    <>
      {/* "Most Popular" tab strip (its own section on the live page) */}
      <div className="hidden bg-[#EEF7F4] px-[1rem] md:block">
        <div className="mx-auto flex max-w-[119rem]">
          <div className="w-[40%]" />
          <div className="w-[20%]" />
          <div className="w-[20%]">
            <div className="bg-rust rounded-t-[4px] p-[1rem_1.6rem] text-center">
              <h4 className="text-[1.4rem] leading-[1.2em] font-semibold text-white">
                Most Popular
              </h4>
            </div>
          </div>
          <div className="w-[20%]" />
        </div>
      </div>
      <section
        className="px-[1rem]"
        style={{ backgroundImage: "linear-gradient(180deg, #EEF7F4 55%, #FFFFFF 45%)" }}
      >
        <div className="mx-auto flex max-w-[119rem] rounded-t-[4px] border-t border-r border-l border-[rgb(134,198,176)] bg-white">
          <div className="flex w-full items-center p-[1.2rem_2.4rem] md:w-[40%]">
            <h2 className="text-herogreen w-full text-[2.5rem] leading-[1.2em] font-semibold md:text-[2.8rem] lg:text-[3.6rem]">
              Packages
            </h2>
          </div>
          {tiers.map((tier) => (
            <div key={tier} className="hidden w-[20%] p-[1.2rem_1.6rem] text-center md:block">
              <h3 className="text-herogreen mb-[1rem] text-[2.2rem] leading-[1.2em] font-semibold md:text-[2.3rem] lg:text-[2.4rem]">
                {tier}
              </h3>
              <Link
                href={innerSite.bookUrl}
                className="inline-block border-[0.1rem] border-[#397963] bg-[#397963] px-[1.2rem] py-[1rem] text-[1.4rem] leading-[1.2em] font-bold text-white uppercase transition-colors hover:bg-white hover:text-[#397963]"
              >
                Book Now
              </Link>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
