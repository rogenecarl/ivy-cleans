import { serviceIntro } from "@/data/services";
import IntroVideo from "./IntroVideo";

export default function Intro() {
  return (
    <>
      {/* live: its own #F7F7F7 band, 7rem vertical padding */}
      <section className="bg-[#f7f7f7] py-[1rem] md:py-[2rem] lg:py-[7rem]">
        {/* post-2035.css `.sec03 > .elementor-container{max-width:97rem!important}` —
            807px at the 1440 step of the font-size ladder (live probe: 807) */}
        <div className="ec mx-auto max-w-[min(1098px,97rem)]! text-center">
          {/* e32c6fb: widget-container margin-bottom 1rem base, 0 at <=767 — leads
              straight into the video widget below it in the same column */}
          <h2 className="mb-0 text-[2.8rem] leading-[1.2em] font-bold md:mb-[1rem] md:text-[4rem] lg:text-[4.5rem]">
            Your Happiness is our Priority
          </h2>
          {/* video widget keeps the kit's own 2rem trailing margin even as the
              column's last child (live probe: content-stack sums to container
              height only with this margin included, both @1440 and @390) */}
          <div className="mb-[2rem]">
            <IntroVideo />
          </div>
        </div>
      </section>
      {/* live: white band, 6rem vertical padding, shared with the service cards */}
      <section className="bg-white pt-[1rem] md:pt-[2rem] lg:pt-[6rem]">
        {/* the live column's 10px widget-wrap padding is emitted once for the whole
            band; this half owns only the top half, ServiceTypes owns the bottom */}
        <div className="mx-auto max-w-[1098px] px-[10px] pt-[10px] pb-[1rem] md:pb-[2rem] lg:pb-[5rem]">
          {/* b8a2ade: widget-container margin-bottom -1rem below 768px, so the kit's
              2rem widget spacing collapses to 1rem there */}
          <h2 className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[2rem] md:text-[4rem] lg:text-[4.5rem]">
            Professional Cleaning Services Minneapolis, MN
          </h2>
          {/*
            9ed19e9 widget-container margin-bottom: 3rem desktop / 0 at <=1024 /
            -3rem at <=767, on top of the kit's 2rem widget spacing. Live probe gap
            from the last paragraph to the card row: 41.5px @1440 (5rem), 10px @390.
          */}
          <div className="text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:mx-[4rem] lg:text-[2rem]">
            {serviceIntro.map((p) => (
              <p key={p.slice(0, 40)} className="mb-[2rem] last:mb-0">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
