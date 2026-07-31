import { nearMe } from "@/data/home";
import { innerSite } from "@/data/site";

export default function NearMe() {
  return (
    <section className="bg-[#fafafa] py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <a
          href={innerSite.phoneHref}
          className="bg-rust border-rust hover:text-rust mb-[2rem] inline-block rounded-[5px] border-[0.1rem] px-[2.4rem] py-[1.1rem] text-[1.8rem] leading-[1.2em] font-bold text-white uppercase transition-colors hover:bg-white"
        >
          Call Us Now!
        </a>
        <h2 className="mb-[2rem] text-[2.8rem] leading-[1.2em] font-bold md:text-[4rem] lg:text-[4.5rem]">
          Cleaning Services Near Me In Minneapolis, MN
        </h2>
        <div className="text-[1.6rem] leading-[1.5em] font-light md:text-[1.8rem] lg:text-[1.9rem]">
          {nearMe.map((p) => (
            <p key={p.slice(0, 40)} className="mb-[2rem]">
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
