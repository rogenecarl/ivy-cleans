import Link from "next/link";
import { innerSite } from "@/data/site";
import { tiers } from "@/data/cleaning-services";

export default function PackagesBar() {
  return (
    <section
      className="px-[1rem]"
      style={{ backgroundImage: "linear-gradient(180deg, #EEF7F4 70%, #FFFFFF 30%)" }}
    >
      <div className="ec">
        <div className="flex flex-wrap items-end">
          <div className="flex w-full items-center bg-white p-[1.2rem_2.4rem] lg:w-[40%]">
            <h2 className="text-herogreen text-[2.5rem] leading-[1.2em] font-semibold md:text-[2.8rem] lg:text-[3.6rem]">
              Packages
            </h2>
          </div>
          {tiers.map((tier) => (
            <div key={tier} className="w-1/3 lg:w-[20%]">
              {tier === "Deep" && (
                <div className="bg-rust rounded-t-[4px] p-[1rem_1.6rem] text-center">
                  <h4 className="text-[1.4rem] leading-[1.2em] font-semibold text-white">Most Popular</h4>
                </div>
              )}
              <div className="bg-white p-[1.2rem_1.6rem] text-center">
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
