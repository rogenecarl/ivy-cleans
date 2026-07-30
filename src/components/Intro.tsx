import { serviceIntro } from "@/data/services";

export default function Intro() {
  return (
    <>
      {/* live: its own #F7F7F7 band, 7rem vertical padding */}
      <section className="bg-[#f7f7f7] py-[1rem] md:py-[2rem] lg:py-[7rem]">
        <div className="ec text-center">
          <h2 className="text-[2.8rem] leading-[1.2em] font-bold md:text-[4rem] lg:text-[4.5rem]">
            Your Happiness is our Priority
          </h2>
        </div>
      </section>
      {/* live: white band, 6rem vertical padding, shared with the service cards */}
      <section className="bg-white pt-[1rem] md:pt-[2rem] lg:pt-[6rem]">
        <div className="ec">
          <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:text-[4rem] lg:text-[4.5rem]">
            Professional Cleaning Services Minneapolis, MN
          </h2>
          {/* live: the text-editor widget carries the kit's 2rem bottom spacing */}
          <div className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:mx-[4rem] lg:text-[2rem]">
            {serviceIntro.map((p) => (
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
