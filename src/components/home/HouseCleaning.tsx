import Link from "next/link";
import { houseCleaning } from "@/data/home";

/*
 * Section 71b51dd4 (post-8.css): cleaning-bg2.jpg `top center / cover` with
 * padding 6rem 0 6rem (>=1280), 3rem 0 1rem (768–1024), 2rem 0 0 (<=767).
 * Heading 2ddd8298 and body 11f8346 are both #FFFFFF over the artwork.
 * The h2 widget's `margin-bottom:2rem` and the body's trailing paragraph
 * margin are both kept by elementor's flex widget-wrap — hence `flex flex-col`.
 */
export default function HouseCleaning() {
  return (
    <section
      className="bg-cover bg-top bg-no-repeat pt-[2rem] pb-0 text-white md:pt-[3rem] md:pb-[1rem] lg:py-[6rem]"
      style={{ backgroundImage: "url(/images/cleaning-bg2.jpg)" }}
    >
      <div className="ec flex flex-col">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:text-[4rem] lg:text-[4.5rem]">
          House Cleaning Services Minneapolis
        </h2>
        <div className="text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
          {houseCleaning.map((p) => (
            <p key={p.slice(0, 40)} className="mb-[2rem]">
              {p}
            </p>
          ))}
          <p className="mb-[2rem]">
            In addition to our main services, We also offer{" "}
            <Link href="/deep-cleaning-minneapolis" className="font-normal underline">
              Deep Cleaning in Minneapolis
            </Link>{" "}
            and{" "}
            <Link href="/minneapolis-move-out-cleaning-services" className="font-normal underline">
              Move-out cleaning Minneapolis
            </Link>
            , if you&rsquo;re interested.
          </p>
        </div>
      </div>
    </section>
  );
}
