import type { Feature } from "@/data/home";
import type { TokenSource } from "@/content/interpolate";
import { t } from "@/content/interpolate";
import Features from "@/components/home/Features";

// post-8.css 102673a0: move-out-bg.jpg, padding 8rem 0 10rem / 3rem 0 1rem / 2rem 0 0; wraps Features too.
// h2 25a9d3d 3rem net below (2rem mobile); copy 2d274d3f 4rem net from 1280, 2rem below.
export default function NearMe({
  nearMe,
  features,
  featuresOutro,
  bits,
}: {
  nearMe: string[];
  features: Feature[];
  featuresOutro: string;
  bits: TokenSource;
}) {
  return (
    <section
      className="bg-cover bg-top bg-no-repeat pt-[2rem] pb-0 md:pt-[3rem] md:pb-[1rem] lg:pt-[8rem] lg:pb-[10rem]"
      style={{ backgroundImage: "url(/images/move-out-bg.jpg)" }}
    >
      <div className="ec flex flex-col">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[3rem] md:text-[4rem] lg:text-[4.5rem]">
          {t("Cleaning Services Near Me In {city}, {state}", bits)}
        </h2>
        <div className="text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:mb-[2rem] lg:text-[2rem]">
          {nearMe.map((p) => (
            <p key={p.slice(0, 40)} className="mb-[2rem]">
              {p}
            </p>
          ))}
        </div>
        <Features features={features} featuresOutro={featuresOutro} />
      </div>
    </section>
  );
}
