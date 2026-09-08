import { faqs } from "@/data/faqs";

// home.html ecb4a05 + dd80b53: h2 0375685, h3 9f5994c, then Q/A pairs in one text widget 6b12b8c — no accordion
export default function HomeFaqStatic() {
  return (
    <>
      <section className="bg-white">
        <div className="ec flex flex-col">
          <h2 className="text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[1rem] md:text-[4rem] lg:text-[4.5rem]">
            Frequently Asked Questions
          </h2>
        </div>
      </section>
      <section className="bg-white">
        <div className="ec flex flex-col">
          {/* the kit renders h3 headings at weight 600, not 700 (live probe) */}
          <h3 className="mb-[2rem] text-center text-[2rem] leading-[1.2em] font-semibold md:mb-[3rem] md:text-[2.6rem] lg:text-[3rem]">
            Do you have any Questions?
          </h3>
          <div className="text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
            {faqs.map((f) => (
              <div key={f.q}>
                <p className="mb-[2rem] font-bold">{f.q}</p>
                <p className="mb-[2rem]">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
