import Image from "next/image";
import type { Feature } from "@/data/home";

// 1e52af1a inside 102673a0: margin 2rem/7rem, 0/2rem, 0/1rem. Column 7fe05c38 54.76% / 70% / 100%.
// Image boxes: figure 17% + content 100%, both shrinkable; top position below 768. Items 4rem/3rem apart.
export default function Features({
  features,
  featuresOutro,
}: {
  features: Feature[];
  featuresOutro: string;
}) {
  return (
    <>
      <div className="mt-0 mb-[1rem] flex flex-wrap md:mb-[2rem] lg:mt-[2rem] lg:mb-[7rem]">
        <div className="flex w-full flex-col p-[10px] md:w-[70%] lg:w-[54.76%]">
          {features.map((f, i) => (
            <article
              key={f.title}
              className={`text-center md:flex md:text-start ${
                i === features.length - 1 ? "" : "mb-[3rem] md:mb-[4rem]"
              }`}
            >
              <figure className="mx-auto mb-[0.9rem] w-[25%] md:mx-0 md:mr-[2rem] md:mb-0 md:w-[17%]">
                <Image
                  src={f.icon}
                  alt=""
                  width={f.width}
                  height={f.height}
                  className="h-auto max-w-full"
                />
              </figure>
              <div className="w-full">
                <h3 className="mt-[0.5rem] mb-[10px] text-[2rem] leading-[1.2em] font-bold">
                  {f.title}
                </h3>
                <p className="text-[1.4rem] leading-[1.5em] font-light">{f.text}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="h-[1px] w-full md:w-[45.2%] lg:h-auto" />
      </div>
      <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
        {featuresOutro}
      </p>
    </>
  );
}
