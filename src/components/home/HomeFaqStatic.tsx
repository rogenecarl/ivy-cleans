import { faqs } from "@/data/faqs";

/*
 * /home renders the FAQ as static text, not the accordion the front page
 * uses. Live markup (sections ecb4a05 + dd80b53 in home.html): a centered h2
 * "Frequently Asked Questions" (0375685, 2.8/4/4.5rem) alone in its own
 * zero-padding section, then a second zero-padding section holding a centered
 * h3 "Do you have any Questions?" (9f5994c, 2/2.6/3rem) followed by a single
 * text-editor widget (6b12b8c, 1.7/1.9/2rem font-weight 300) whose content is
 * just <p><strong>Q</strong></p><p>A</p> pairs repeated ten times — no
 * button/aria-expanded markup at all.
 *
 * Widget rhythm from the live probe: the h2's container adds 1rem at >=768
 * (0 below) and the section seam adds 10+10px of widget gutter; the h3 widget
 * has `margin-bottom:2rem` plus the same 1rem container margin at >=768.
 */
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
