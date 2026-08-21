import Image from "next/image";
import type { MoveOutData } from "@/data/move-out";

/*
 * Section 5f8003a (post-241.css): padding 6rem 0 6rem desktop, 3rem 0 1rem
 * tablet, 2rem 0 0 mobile. Heading (de63694) centered black, 4.5/4/2.8rem,
 * 1rem bottom margin above 767px. Intro (b715131) left-aligned, font-light
 * 2/1.9/1.7rem.
 *
 * Inner section b8893ba (bottom margin 0 desktop / 2rem tablet / 1rem
 * mobile): qualities column (a8c3534, 54.837% at >=768px) holds the 5
 * elementor-position-left image-box widgets (a672bb6/af8ecb4/75032cf/
 * 6c41eb6/3d3bc44) — icon figure 17% of the box width (25% at mobile) with a
 * 2rem right margin, title 2rem/700/black with a 10px bottom margin,
 * description 1.4rem/300/black. Each widget carries a 2rem bottom margin
 * (1rem at mobile) except the last, which has none. Image column (4f24343,
 * 45.125%) holds out-img3.jpg (692x901), whose widget takes margin
 * 0 -11rem 0 2rem above 1280px so the photo bleeds off the right edge. Neither
 * column overrides align-items, so the shorter image column sits at the top of
 * the row rather than centred.
 */
/*
 * The last two image-box descriptions carry a `<br><br>` paragraph break in
 * the live markup (after "...at the end of the job." and "...ready for the
 * next occupants."). The data strings stay byte-verbatim, so the break is
 * reproduced here by index; without it those two boxes render 2 and 1 lines
 * short of live. The theme hides every <br> below 768px, so at mobile the two
 * descriptions run on as a single paragraph, as they do live.
 */
const descriptionBreakAfter: Record<number, string> = {
  3: "at the end of the job.",
  4: "ready for the next occupants.",
};

function Description({ text, index }: { text: string; index: number }) {
  const marker = descriptionBreakAfter[index];
  const at = marker ? text.indexOf(marker) : -1;
  if (at < 0) return <>{text}</>;
  const cut = at + marker.length;
  return (
    <>
      {text.slice(0, cut)}{" "}
      <br className="max-md:hidden" />
      <br className="max-md:hidden" />
      {text.slice(cut).trimStart()}
    </>
  );
}

export default function WhyIvy({
  whyIvy,
}: {
  whyIvy: MoveOutData["whyIvy"];
}) {
  return (
    <section className="pt-[2rem] pb-0 md:pt-[3rem] md:pb-[1rem] lg:pt-[6rem] lg:pb-[6rem]">
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-black md:mb-[3rem] md:text-[4rem] lg:text-[4.5rem]">
          {whyIvy.h2}
        </h2>
        <div className="flow-root mb-0 lg:mb-[2rem]">
          <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
            {whyIvy.intro}
          </p>
        </div>

        <div className="mb-[1rem] flex flex-wrap items-start md:mb-[2rem] lg:mb-0">
          <div className="order-2 w-full md:order-1 md:w-[54.837%]">
            <div className="p-[10px]">
              {whyIvy.qualities.map((q, i) => (
                <div
                  key={q.title}
                  className={`text-center md:flex md:items-start md:text-left ${
                    i === whyIvy.qualities.length - 1 ? "mb-0" : "mb-[3rem] md:mb-[4rem]"
                  }`}
                >
                  <figure className="inline-block w-[25%] md:mr-[2rem] md:w-[17%]">
                    <Image
                      src={q.icon}
                      alt={q.alt}
                      width={q.width}
                      height={q.height}
                      className="block h-auto max-w-full"
                    />
                  </figure>
                  <div className="w-full">
                    <h3 className="mt-[0.5rem] mb-[10px] text-[2rem] leading-[1.2em] font-bold text-black">
                      {q.title}
                    </h3>
                    <p className="text-[1.4rem] leading-[1.5em] font-light text-black">
                      <Description text={q.text} index={i} />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 w-full md:order-2 md:w-[45.125%]">
            <div className="p-[10px]">
              <div className="min-[1281px]:mr-[-11rem] min-[1281px]:ml-[2rem]">
                <Image
                  src={whyIvy.image}
                  alt=""
                  width={692}
                  height={901}
                  className="h-auto w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
