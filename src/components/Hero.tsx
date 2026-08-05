import { site } from "@/data/site";
import { heroParagraphs } from "@/data/services";
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

export default function Hero() {
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
      <div className="ec relative">
        <div className="lg:w-[49%]">
          <h1 className="text-herogreen mb-[2rem] text-[3rem] leading-[1em] font-bold lg:text-[7.2rem]">
            Cleaning Services Minneapolis
          </h1>
          <div className="text-[1.6rem] leading-[1.5em] font-light lg:text-[1.9rem]">
            {heroParagraphs.map((p) => (
              <p key={p.slice(0, 40)} className="mb-[2rem] last:font-bold">
                {boldIvyCleans(p)}
              </p>
            ))}
          </div>
          <div className="mb-[2rem]">
            <CtaButton />
          </div>
          {/* live 985f4a8: widget-container margin-bottom -3.5rem cancels most of the
              kit's 2rem widget spacing — probe gap to the phone line is 4.1px @1440 /
              5px @390, i.e. 0.5rem */}
          <p className="mb-[0.5rem] text-[1.6rem] leading-[1.5em] font-bold lg:text-[2rem]">
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
