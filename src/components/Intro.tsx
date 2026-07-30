import { serviceIntro } from "@/data/services";

export default function Intro() {
  return (
    <section className="bg-peach py-16">
      <div className="mx-auto max-w-[1140px] px-4 text-center">
        <h2 className="text-brand text-[1.8rem] font-semibold">Your Happiness is our Priority</h2>
        <h2 className="mt-2 text-[2.8rem] leading-tight font-bold md:text-[4rem] lg:text-[4.5rem]">
          Professional Cleaning Services Minneapolis, MN
        </h2>
        <div className="mt-8 space-y-4 text-left leading-relaxed">
          {serviceIntro.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
