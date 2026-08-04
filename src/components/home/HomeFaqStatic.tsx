import { faqs } from "@/data/faqs";

/*
 * /home renders the FAQ as static text, not the accordion the front page
 * uses. Live markup (sections ecb4a05 + dd80b53 in home.html): a centered h2
 * "Frequently Asked Questions" (0375685, 2.8/4/4.5rem) then a centered h3
 * "Do you have any Questions?" (9f5994c, 2/2.6/3rem) followed by a single
 * text-editor widget (6b12b8c, 1.7/1.9/2rem font-weight 300) whose content is
 * just <p><strong>Q</strong></p><p>A</p> pairs repeated ten times — no
 * button/aria-expanded markup at all. Neither section has a CSS override in
 * post-8.css, so (matching the Locations/WorkCarousel convention elsewhere in
 * this codebase) there's no section padding beyond the widgets' own margins.
 */
export default function HomeFaqStatic() {
  return (
    <section className="bg-white">
      <div className="ec">
        <h2 className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:text-[4rem] lg:text-[4.5rem]">
          Frequently Asked Questions
        </h2>
        <h3 className="mb-[2rem] text-center text-[2rem] leading-[1.2em] font-bold md:text-[2.6rem] lg:text-[3rem]">
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
  );
}
