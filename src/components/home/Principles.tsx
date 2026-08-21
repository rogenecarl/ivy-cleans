/*
 * Live splits this into two top-level sections, and the split is load-bearing:
 * 2fad378 holds only the heading (padding 4rem 0 0 at every breakpoint, widget
 * 0935ef1 with a 1rem container margin at >=768 and 0 below), then b092bd1
 * holds only the body f34e879 with zero section padding. Because each section
 * carries its own widget-wrap gutter, the heading and the copy are 10+10px
 * further apart than a single section would put them.
 * Heading is 4.5/4/2.8rem; the body is 2/1.9/1.7rem at weight 300.
 */
export default function Principles({ principles }: { principles: string[] }) {
  return (
    <>
      <section className="bg-white pt-[4rem]">
        <div className="ec flex flex-col">
          <h2 className="text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[1rem] md:text-[4rem] lg:text-[4.5rem]">
            Our Principles And Assurance
          </h2>
        </div>
      </section>
      <section className="bg-white">
        <div className="ec flex flex-col">
          <div className="text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
            {principles.map((p) => (
              <p key={p.slice(0, 40)} className="mb-[2rem]">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
