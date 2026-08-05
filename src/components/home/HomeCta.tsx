import { innerSite } from "@/data/site";

/* live layout: the "Do you have any Questions?" H3 sits inside the FAQ
   section (between the "Frequently Asked Questions" H2 and the static Q/A
   text) — per home-content-dump.txt lines 128–130 — so it lives in
   HomeFaqStatic.tsx. This component renders only the "Trust Us..." CTA that
   follows the FAQ text on the live page (dump lines 150–151).

   Section 6774f01c: cleaning-bg3.jpg `top center / cover`, padding 6rem 0 6rem
   at >=1280, 3rem 0 3rem at 768–1024 and 2rem 0 2rem at <=767. Heading
   77760a30 is 4.5/4/2.8rem, wrapped in a live `<b>` that computes to
   font-weight 900 (the kit's own h3 weight is 600; box geometry is identical
   either way), with the standard 2rem widget bottom margin. The button
   5572535 is 1.9rem at every width with 17px/30px padding (17px/20px and
   left-aligned at <=767) and its container adds a 3rem top margin only at
   >=1280. */
export default function HomeCta() {
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
