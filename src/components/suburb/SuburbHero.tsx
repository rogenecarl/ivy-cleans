import Link from "next/link";
import type { SuburbData } from "@/data/suburb";

/*
 * Section 3d1cf513 (post-664.css): deep-bg1.jpg (bottom center / no-repeat /
 * cover) with padding 6rem 0 50rem / 3rem 0 30rem / 2rem 0 18rem across
 * desktop / tablet / mobile — byte-identical to DeepHero's own section (same
 * background image, same padding). h1 (275ed2e4) is centered, uppercase,
 * herogreen, 7.2/4/3rem; its OWN per-id widget-container override is -2rem
 * at mobile only (0 at md/lg) — the OPPOSITE sign of DeepHero's single-line
 * h1, because this heading is two lines. But — task-3 fidelity pass finding
 * — that per-id number alone doesn't determine the live gap: post-6.css's
 * kit-wide `.elementor-widget:not(:last-child){margin-block-end:2rem}` rule
 * also applies to widgets with a following sibling; the visible gap between
 * two adjacent widgets is the MAX of the leading widget's own trailing
 * margin (its own per-id override, plus this kit floor if not-last-child)
 * and the following widget's own leading margin — NOT a sum (confirmed by
 * a live probe of this exact section: the h1's follower, the copy block
 * below, has its own margin-top:0 at every width, so the kit floor comes
 * through undiminished here). Net total, confirmed at 1920/1440/1280/1025/
 * 768/390: kit-2rem + this widget's own -2rem cancels to 0 at mobile;
 * kit-2rem alone (own override is 0) from md up. Rendered as flat
 * `mb-0 md:mb-[2rem]`. Copy block (762e0136) is centered, max-w 106rem,
 * 2/1.9/1.7rem font-light, md:mb-[-2rem] lg:mb-0 (identical to DeepHero) —
 * left UNCHANGED: this wrapper's OWN kit-floor entitlement is real (it too
 * has a following sibling, the button) but is completely eclipsed by the
 * MAX rule above, because the button's own margin-top (3rem, next line) is
 * already larger than the wrapper's own kit-floor total (2rem) at every
 * width — confirmed live: gap between the copy block and the button is
 * exactly the button's own 3rem, with no additional contribution measurable
 * from the wrapper. Button (48377b61) margin-top 3rem at md and lg alike
 * (0 at mobile), unchanged.
 *
 * Live markup for the h1 is a literal newline (`Savage, MN\nCleaning
 * Services`), which HTML whitespace-collapses to a plain space — task-2
 * rendered this as a forced `<br />` on the theory that the two-line layout
 * was intentional design (SuburbData.hero.titleLines is a 2-tuple). Task-3
 * fidelity pass correction: a live probe at 1920/1440/1280/1025/768/390
 * shows this assumption is wrong at 768px specifically — "Savage, MN
 * Cleaning Services" (Savage's own city name being short) actually fits on
 * ONE line there (measured h1 box height = exactly one line-height, not
 * two), while every other probed width does wrap to two lines on its own.
 * The forced `<br />` reproduced two lines unconditionally, which is a real
 * mismatch at 768px width — a LONGER suburb name (this template repeats
 * per-suburb) would wrap at a different width still. Rendered as a plain
 * space between the two titleLines, letting the browser's natural reflow
 * decide, matching the live markup exactly.
 */
export default function SuburbHero({
  hero,
  bookHref,
}: {
  hero: SuburbData["hero"];
  /* innerSite.bookUrl — "/book", or "/<cityKey>/book" inside a draft preview. */
  bookHref: string;
}) {
  return (
    <section className="bg-[url(/images/deep-bg1.jpg)] bg-bottom bg-cover bg-no-repeat pt-[2rem] pb-[18rem] text-center md:pt-[3rem] md:pb-[30rem] lg:pt-[6rem] lg:pb-[50rem]">
      <div className="ec">
        <h1 className="text-herogreen mb-0 text-[3rem] leading-[1.2em] font-bold uppercase md:mb-[2rem] md:text-[4rem] lg:text-[7.2rem]">
          {hero.titleLines[0]} {hero.titleLines[1]}
        </h1>
        <div className="mx-auto max-w-[106rem] flow-root md:mb-[-2rem] lg:mb-0">
          {hero.paragraphs.map((p) => (
            <p
              key={p.slice(0, 40)}
              className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]"
            >
              {p}
            </p>
          ))}
        </div>
        {/*
          hero.ctaLabel carries the correct dump-sourced string but, per the
          repo's established convention (CtaButton.tsx, DeepHero.tsx,
          MoveHero.tsx), the CTA text is hardcoded in JSX rather than threaded
          through data — kept here as present-but-unused, same as every other
          "Set an appointment 👈" button in the codebase.
        */}
        <Link
          href={bookHref}
          className="bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[1px] px-[30px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white md:mt-[3rem]"
        >
          Set an appointment 👈
        </Link>
      </div>
    </section>
  );
}
