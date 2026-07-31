import { site } from "@/data/site";
import CtaButton from "./CtaButton";
import { PhoneIcon } from "./Icons";

/**
 * Compact variant — button + "Prefer to call?" + phone, in the flow of the
 * host section (Packages / BeforeAfter on the live site) so it sits on that
 * section's own background.
 */
export function CtaCompact({ light = false }: { light?: boolean }) {
  const tone = light ? "text-white" : "text-black";
  return (
    <div className={`text-center ${tone}`}>
      {/* live: the button's widget-container adds 1rem above/below on top of the kit's 2rem widget spacing */}
      <div className="mb-[3rem] pt-[1rem]">
        <CtaButton size="lg" />
      </div>
      {/*
        live: the "prefer to call" icon-list sits on a 2.6rem/1.2em line and its widget-container
        carries margin-bottom:-1.5rem, so only 0.5rem of the 2rem widget spacing survives.
      */}
      <p className="mb-[0.5rem] flex items-center justify-center text-[1.8rem] leading-[1.2em]! lg:text-[2.6rem]">
        <PhoneIcon className="mr-[0.5rem] h-[1.8rem] w-[1.8rem] lg:h-[2.2rem] lg:w-[2.2rem]" />
        Prefer to call? We&rsquo;re available now.
      </p>
      <h3 className="text-[2.6rem] leading-[1.2em] font-bold lg:text-[3.6rem]">
        <a href={site.phoneHref}>{site.phone}</a>
      </h3>
    </div>
  );
}

export default function CtaBand() {
  return (
    <section
      className="bg-cover bg-top py-[1rem] md:py-[2rem] lg:py-[5rem]"
      style={{ backgroundImage: "url(/images/bg.jpg)" }}
    >
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-white md:text-[4rem] lg:text-[4.5rem]">
          Ready For a Sparkling Clean House? Book Your Cleaning Service Minneapolis
        </h2>
        <CtaCompact light />
      </div>
    </section>
  );
}
