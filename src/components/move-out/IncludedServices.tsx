import { CheckItemIcon } from "@/components/Icons";
import type { MoveOutData } from "@/data/move-out";

// post-241.css 86d3a37: out-bg2.jpg (top right on mobile), padding 6rem/9rem, 3rem, 2rem. Heading ebc9f75.
// Column c71099b justify-content flex-end: checklist 54c1f4f (50% / 65% / 100%) sits right. Icons #4D9682, 0.5rem padding, items 2.5rem apart.
export default function IncludedServices({
  included,
}: {
  included: MoveOutData["included"];
}) {
  return (
    <section className="bg-[url(/images/out-bg2.jpg)] bg-[position:top_right] bg-cover bg-no-repeat pt-[2rem] pb-[2rem] md:bg-top md:pt-[3rem] md:pb-[3rem] lg:pt-[6rem] lg:pb-[9rem]">
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-black md:text-[4rem] lg:mb-[4rem] lg:text-[4.5rem]">
          {included.h2}
        </h2>
        <ul className="ml-auto md:w-[65%] lg:w-[50%]">
          {included.items.map((item) => (
            <li
              key={item}
              className="mb-[2.5rem] flex items-start gap-[0.5rem] last:mb-0"
            >
              <span className="mt-[4px] flex w-[2.125rem] shrink-0 md:w-[2.375rem] lg:w-[2.5rem]">
                <CheckItemIcon className="h-[1.7rem] w-[1.7rem] text-[#4D9682] md:h-[1.9rem] md:w-[1.9rem] lg:h-[2rem] lg:w-[2rem]" />
              </span>
              <span className="text-[1.7rem] leading-[1.4em] font-light text-black md:text-[1.9rem] lg:text-[2rem]">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
