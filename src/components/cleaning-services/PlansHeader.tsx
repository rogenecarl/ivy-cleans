/*
 * Section 2ad1b48: padding 8.6rem 0 3.8rem, dropping to 3rem 0 2rem at
 * <=1024 and 2rem 0 1rem at <=767 (post-30.css media blocks). The eyebrow
 * 1bfde0d carries a 1rem widget margin below it.
 */
export default function PlansHeader() {
  return (
    <section className="bg-[#EEF7F4] pt-[2rem] pb-[1rem] md:pt-[3rem] md:pb-[2rem] lg:pt-[8.6rem] lg:pb-[3.8rem]">
      <div className="ec">
        <h3 className="text-rust mb-[1rem] text-[1.6rem] leading-[1.2em] font-semibold uppercase">
          CLEANING PLANS
        </h3>
        <h2 className="text-herogreen text-[2.5rem] leading-[1.2em] font-semibold md:text-[2.8rem] lg:text-[3.6rem]">
          Choose a cleaning package
        </h2>
      </div>
    </section>
  );
}
