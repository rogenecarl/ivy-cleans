import { innerSite } from "@/data/site";

/* live layout: the "Do you have any Questions?" H3 sits inside the FAQ
   section (between the "Frequently Asked Questions" H2 and the accordion) —
   per home-content-dump.txt lines 128–130 — so it's passed into <Faq
   questionsHeading="..." /> instead of living here (see /home's page.tsx).
   This component renders only the "Trust Us..." CTA that follows the FAQ
   accordion on the live page (dump lines 150–151). */
export default function HomeCta() {
  return (
    <section className="bg-white py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec text-center">
        <h3 className="mb-[2rem] text-[2rem] leading-[1.2em] font-bold md:text-[2.6rem] lg:text-[3rem]">
          Trust Us For Your House Cleaning Needs & Give Us A Call!
        </h3>
        <a
          href={innerSite.phoneHref}
          className="bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[0.1rem] px-[2.4rem] py-[1.1rem] text-[1.8rem] leading-[1.2em] font-bold text-white uppercase transition-colors hover:bg-white"
        >
          Call Us Now!
        </a>
      </div>
    </section>
  );
}
