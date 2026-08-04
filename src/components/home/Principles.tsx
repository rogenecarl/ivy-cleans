import { principles } from "@/data/home";

/*
 * Section 2fad378: padding 4rem 0 0 at every breakpoint. Heading 39854bec is
 * 4.5/4/2.8rem with a 1rem widget margin (0 below 768); the body f34e879 is
 * 2/1.9/1.7rem at weight 300.
 */
export default function Principles() {
  return (
    <section className="bg-white pt-[4rem]">
      <div className="ec">
        <h2 className="text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[1rem] md:text-[4rem] lg:text-[4.5rem]">
          Our Principles And Assurance
        </h2>
        <div className="text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
          {principles.map((p) => (
            <p key={p.slice(0, 40)} className="mb-[2rem]">
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
