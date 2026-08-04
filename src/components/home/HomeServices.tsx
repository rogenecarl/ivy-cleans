import Image from "next/image";
import { serviceIntro, services } from "@/data/services";
import { innerSite } from "@/data/site";

/*
 * Section 6cbc7976 (post-8.css): padding 6rem/3rem/2rem. Heading 176e9adf is
 * 4.5/4/2.8rem; the intro 70c713c2 is 2/1.9/1.7rem capped at 112rem with a
 * 3rem desktop bottom margin. Cards are three 33.33% image boxes with a 2rem
 * (1rem below 1024) widget padding — the 4th and 5th (7b8a2c27 / 5f81c296)
 * carry the extra 6rem/3rem/1rem top padding that starts their second row.
 * The section closes on the centred "Call Us Now!" button aeb05a4.
 */
export default function HomeServices() {
  return (
    <section className="bg-white py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <h2 className="mb-[-1rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-0 md:text-[4rem] lg:text-[4.5rem]">
          Professional Cleaning Services Minneapolis, MN
        </h2>
        <div className="mx-auto max-w-[112rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:mb-[3rem] lg:text-[2rem]">
          {serviceIntro.map((p) => (
            <p key={p.slice(0, 40)} className="mb-[2rem]">
              {p}
            </p>
          ))}
        </div>
        <div className="flex flex-wrap justify-center">
          {services.map((s, i) => (
            <article
              key={s.title}
              className={`w-full p-[1rem] text-center lg:w-1/3 lg:p-[2rem] ${
                i >= 3 ? "md:pt-[3rem] lg:pt-[6rem]" : ""
              }`}
            >
              <Image
                src={s.image}
                alt={s.alt}
                width={s.width}
                height={s.height}
                className="mb-[1rem] h-auto w-full"
              />
              <h3 className="mb-[10px] text-[2rem] leading-[1.2em] font-bold uppercase md:text-[2.2rem] lg:text-[2.7rem]">
                {s.title}
              </h3>
              <p className="text-[1.6rem] leading-[1.5em] font-light">{s.text}</p>
            </article>
          ))}
        </div>
        <div className="text-center lg:mt-[3rem]">
          <a
            href={innerSite.phoneHref}
            className="bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[1px] px-[20px] py-[17px] text-[1.8rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white lg:px-[30px] lg:text-[1.9rem]"
          >
            Call Us Now!
          </a>
        </div>
      </div>
    </section>
  );
}
