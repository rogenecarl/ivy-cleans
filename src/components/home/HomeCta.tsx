import { innerSite } from "@/data/site";

/* live layout wraps the FAQ accordion (Task 5) with these two headings — the
   "Do you have any Questions?" subheading precedes it and the "Trust Us..."
   CTA follows it; this component renders both together per the round-2
   page-composition contract, which places a single HomeCta after the FAQ
   placeholder. */
export default function HomeCta() {
  return (
    <section className="bg-white py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec text-center">
        <h3 className="mb-[2rem] text-[2rem] leading-[1.2em] font-bold md:text-[2.6rem] lg:text-[3rem]">
          Do you have any Questions?
        </h3>
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
