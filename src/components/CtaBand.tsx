import type { SiteData } from "@/data/site";
import { t } from "@/content/interpolate";
import type { TokenSource } from "@/content/interpolate";
import CtaButton from "./CtaButton";
import { PhoneIcon } from "./Icons";

/** Compact variant: button + "Prefer to call?" + phone, inside the host section. */
export function CtaCompact({
  site,
  light = false,
  variant = "band",
}: {
  site: SiteData["site"];
  light?: boolean;
  variant?: "band" | "packages";
}) {
  const tone = light ? "text-white" : "text-black";
  // lead/trail gaps: 1rem/3rem in CtaBand and BeforeAfter, 5rem/2rem in Packages (7d490e5)
  const buttonBox =
    variant === "packages" ? "pt-[2rem] mb-[2rem] md:pt-[5rem]" : "mb-[3rem] pt-[1rem]";
  return (
    <div className={`text-center ${tone}`}>
      <div className={buttonBox}>
        <CtaButton size="lg" site={site} />
      </div>
      {/* icon-list line 2.6rem/1.2em with margin-bottom -1.5rem */}
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

export default function CtaBand({
  site,
  bits,
}: {
  site: SiteData["site"];
  bits: TokenSource;
}) {
  return (
    <section
      className="bg-cover bg-top py-[1rem] md:py-[2rem] lg:py-[5rem]"
      style={{ backgroundImage: "url(/images/bg.jpg)" }}
    >
      <div className="ec">
        {/* b165434/022049e/24e2e95: widget-container margin-bottom -1rem below 768px */}
        {/* a <p>: this band repeats on the front page */}
        <p className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-white md:mb-[2rem] md:text-[4rem] lg:text-[4.5rem]">
          {t("Ready For a Sparkling Clean House? Book Your Cleaning Service {city}", bits)}
        </p>
        <CtaCompact site={site} light />
      </div>
    </section>
  );
}
