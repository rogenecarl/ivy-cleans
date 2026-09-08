import type { SiteData } from "@/data/site";

// 6774f01c: cleaning-bg3.jpg, padding 6/3/2rem. Heading 77760a30 in a <b> (weight 900); button 5572535 1.9rem, 3rem top from 1280.
// The "Do you have any Questions?" h3 lives in HomeFaqStatic.
export default function HomeCta({ innerSite }: { innerSite: SiteData["innerSite"] }) {
  return (
    <section
      className="bg-cover bg-top bg-no-repeat py-[2rem] md:py-[3rem] lg:py-[6rem]"
      style={{ backgroundImage: "url(/images/cleaning-bg3.jpg)" }}
    >
      <div className="ec flex flex-col text-center">
        <h3 className="mb-[2rem] text-[2.8rem] leading-[1.2em] font-black md:text-[4rem] lg:text-[4.5rem]">
          Trust Us For Your House Cleaning Needs &amp; Give Us A Call!
        </h3>
        <div className="text-left md:text-center lg:mt-[3rem]">
          <a
            href={innerSite.phoneHref}
            className="bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[1px] px-[20px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white md:px-[30px]"
          >
            Call Us Now!
          </a>
        </div>
      </div>
    </section>
  );
}
