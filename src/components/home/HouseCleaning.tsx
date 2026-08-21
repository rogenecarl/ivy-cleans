import Link from "next/link";
import type { TokenSource } from "@/content/interpolate";
import { t } from "@/content/interpolate";

/*
 * Section 71b51dd4 (post-8.css): cleaning-bg2.jpg `top center / cover` with
 * padding 6rem 0 6rem (>=1280), 3rem 0 1rem (768–1024), 2rem 0 0 (<=767).
 *
 * The artwork is `uploads/2023/06/cleaning-bg2.jpg` (1920x589, green-tinted
 * living room). WordPress has a *second, unrelated* file with the same
 * basename — `uploads/2023/11/cleaning-bg2.jpg` (1920x972, pale pink texture)
 * — which the front page's 78ce8a9 section uses (BeforeAfter.tsx) and which is
 * what `public/images/cleaning-bg2.jpg` holds. Pointing this section at that
 * one rendered white copy on near-white pink; probe r8 showed geometry already
 * pixel-identical to live (x/width/height/padding/doc-height match at
 * 1920/1440/1024/768/390) with the bg-image URL as the only delta. Hence the
 * date-qualified filename here — do NOT collapse the two.
 * Heading 2ddd8298 and body 11f8346 are both #FFFFFF over the artwork.
 * The h2 widget's `margin-bottom:2rem` and the body's trailing paragraph
 * margin are both kept by elementor's flex widget-wrap — hence `flex flex-col`.
 */
export default function HouseCleaning({
  houseCleaning,
  bits,
  deepHref,
  moveOutHref,
}: {
  houseCleaning: string[];
  bits: TokenSource;
  /*
   * The two service-page hrefs arrive built (page-side cityHref) rather than
   * being t()'d here: only the page knows whether this city is live (public
   * paths) or a draft being previewed under /<cityKey>. The LABELS stay
   * token-built, they carry no path.
   */
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
