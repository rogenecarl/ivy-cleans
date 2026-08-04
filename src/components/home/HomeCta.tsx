import { innerSite } from "@/data/site";

/* live layout: the "Do you have any Questions?" H3 sits inside the FAQ
   section (between the "Frequently Asked Questions" H2 and the accordion) —
   per home-content-dump.txt lines 128–130 — so it's passed into <Faq
   questionsHeading="..." /> instead of living here (see /home's page.tsx).
   This component renders only the "Trust Us..." CTA that follows the FAQ
   accordion on the live page (dump lines 150–151).

   Section 6774f01c: cleaning-bg3.jpg `top center / cover`, padding
   6rem 0 6rem (3rem 0 3rem at <=1024). Heading 77760a30 is 4.5/4/2.8rem and
   inherits the kit's h3 weight of 600. */
export default function HomeCta() {
  return (
    <section
      className="bg-cover bg-top bg-no-repeat py-[3rem] lg:py-[6rem]"
      style={{ backgroundImage: "url(/images/cleaning-bg3.jpg)" }}
    >
      <div className="ec text-center">
        <h3 className="mb-[2rem] text-[2.8rem] leading-[1.2em] font-semibold md:text-[4rem] lg:text-[4.5rem]">
          Trust Us For Your House Cleaning Needs & Give Us A Call!
        </h3>
        <a
          href={innerSite.phoneHref}
          className="bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[1px] px-[20px] py-[17px] text-[1.8rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white lg:px-[30px] lg:text-[1.9rem]"
        >
          Call Us Now!
        </a>
      </div>
    </section>
  );
}
