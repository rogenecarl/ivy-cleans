import Link from "next/link";
import type { TokenSource } from "@/content/interpolate";
import { t } from "@/content/interpolate";

// post-8.css 71b51dd4: uploads/2023/06/cleaning-bg2.jpg — not the 2023/11 file of the same name BeforeAfter uses.
// Padding 6rem / 3rem 0 1rem / 2rem 0 0. Heading 2ddd8298 and body 11f8346 are white.
export default function HouseCleaning({
  houseCleaning,
  bits,
  deepHref,
  moveOutHref,
}: {
  houseCleaning: string[];
  bits: TokenSource;
  // hrefs arrive built by the page (cityHref); labels are token-built
  deepHref: string;
  moveOutHref: string;
}) {
  return (
    <section
      className="bg-cover bg-top bg-no-repeat pt-[2rem] pb-0 text-white md:pt-[3rem] md:pb-[1rem] lg:py-[6rem]"
      style={{ backgroundImage: "url(/images/cleaning-bg2-2023-06.jpg)" }}
    >
      <div className="ec flex flex-col">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:text-[4rem] lg:text-[4.5rem]">
          {t("House Cleaning Services {city}", bits)}
        </h2>
        <div className="text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
          {houseCleaning.map((p) => (
            <p key={p.slice(0, 40)} className="mb-[2rem]">
              {p}
            </p>
          ))}
          <p className="mb-[2rem]">
            In addition to our main services, We also offer{" "}
            <Link href={deepHref} className="font-normal underline">
              {t("Deep Cleaning in {city}", bits)}
            </Link>{" "}
            and{" "}
            <Link href={moveOutHref} className="font-normal underline">
              {t("Move-out cleaning {city}", bits)}
            </Link>
            , if you&rsquo;re interested.
          </p>
        </div>
      </div>
    </section>
  );
}
