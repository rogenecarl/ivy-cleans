import type { SiteData } from "@/data/site";
import type { TokenSource } from "@/content/interpolate";
import { t } from "@/content/interpolate";
import CtaButton from "./CtaButton";
import { PhoneIcon } from "./Icons";

// live markup: `<p>As a local and insured business, <strong>Ivy Cleans</strong> is
// thrilled to be...` — only the mid-sentence "Ivy Cleans" in the first paragraph is
// individually wrapped; the string bytes in src/data/services.ts stay untouched, this
// wraps the exact substring at render time (same pattern round 2 used for Values).
function boldIvyCleans(text: string) {
  const parts = text.split("Ivy Cleans");
  return parts.flatMap((part, i) =>
    i === 0 ? [part] : [<strong key={i}>Ivy Cleans</strong>, part],
  );
}

export default function Hero({
  site,
  heroParagraphs,
  bits,
}: {
  site: SiteData["site"];
  heroParagraphs: string[];
  bits: TokenSource;
}) {
  return (
    <section
      className="relative bg-cover bg-top py-[1rem] md:py-[3rem]"
      style={{ backgroundImage: "url(/images/sec01-bgg.jpg)" }}
    >
      {/* the live hero paints the model as a bottom-right background overlay,
          hidden below 1024px */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden bg-[url(/images/woman-holding-spray-cleaner-1.png)] bg-[length:auto] bg-right-bottom bg-no-repeat lg:block"
      />
      {/*
        post-2035.css gives the hero's text column (616760b) real elementor
        percentages of the 132rem container, and the column — not this container —
        owns the 10px widget-wrap padding:
          >=1441  54.848%   (probe @1920: h1 = 54.848% x 1320 - 20 = 703.99)
          1025-1440  50%    (probe @1440: 50% x 1098.23 - 20 = 529.11)
          <=1024    100%
      */}
      <div className="relative mx-auto max-w-[132rem]">
        <div className="p-[10px] lg:w-[50%] 2xl:w-[54.848%]">
          {/* 6e13d81: 7.2rem, 4rem at <=1024 (live probe @1024: 40px), 3rem at <=767 */}
          <h1 className="text-herogreen mb-[2rem] text-[3rem] leading-[1em] font-bold md:text-[4rem] lg:text-[7.2rem]">
            {t("Cleaning Services {city}", bits)}
          </h1>
          {/* 2018238: 1.9rem, 1.8rem at <=1024, 1.6rem at <=767 */}
          <div className="text-[1.6rem] leading-[1.5em] font-light md:text-[1.8rem] lg:text-[1.9rem]">
            {heroParagraphs.map((p, i) => (
              <p key={p.slice(0, 40)} className="mb-[2rem] last:font-bold">
                {i === 0 ? boldIvyCleans(p) : p}
              </p>
            ))}
          </div>
          <div className="mb-[2rem]">
            <CtaButton site={site} />
          </div>
          {/* live 985f4a8: widget-container margin-bottom -3.5rem cancels most of the
              kit's 2rem widget spacing — probe gap to the phone line is 4.1px @1440 /
              5px @390, i.e. 0.5rem */}
          <p className="mb-[0.5rem] text-[1.6rem] leading-[1.5em] font-bold md:text-[1.8rem] lg:text-[2rem]">
            Prefer to call? We&rsquo;re available now.
          </p>
          {/* a div, not a <p>: globals.css `p { line-height: 1.5 }` is unlayered and
              would beat the leading-[1.2em] utility that post-2035.css f29432c wants.
              Icon box is --e-icon-list-icon-size:3rem with a 25% right margin. */}
          <div className="flex items-center text-[3rem] leading-[1.2em]">
            <PhoneIcon className="mr-[0.75rem] h-[3rem] w-[3rem]" />
            <a href={site.phoneHref}>{site.phone}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
