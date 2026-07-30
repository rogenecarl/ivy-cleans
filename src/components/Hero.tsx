import { site } from "@/data/site";
import { heroParagraphs } from "@/data/services";
import CtaButton from "./CtaButton";
import { PhoneIcon } from "./Icons";

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
                {p}
              </p>
            ))}
          </div>
          <div className="mb-[2rem]">
            <CtaButton />
          </div>
          <p className="mb-[2rem] text-[1.6rem] leading-[1.5em] font-bold lg:text-[2rem]">
            Prefer to call? We&rsquo;re available now.
          </p>
          <p className="flex items-center text-[3rem] leading-[1.2em]">
            <PhoneIcon className="mr-[0.5rem] h-[2.4rem] w-[2.4rem]" />
            <a href={site.phoneHref}>{site.phone}</a>
          </p>
        </div>
      </div>
    </section>
  );
}
