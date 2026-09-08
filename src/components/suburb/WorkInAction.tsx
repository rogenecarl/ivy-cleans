import type { SuburbData } from "@/data/suburb";
import { WorkCarouselGallery } from "@/components/home/WorkCarousel";

// post-664.css 2a36e1a1/6ca850f2: h3 43px flat, kit defaults 600/#374151, 10px margin.
// Gallery 4540d233/777c3582 is the same carousel as /home.
export default function WorkInAction({
  workInAction,
}: {
  workInAction: SuburbData["workInAction"];
}) {
  // no photos: no section, heading included
  if (workInAction.images.length === 0) return null;

  return (
    <>
      <section>
        <div className="ec">
          <h3 className="m-[10px] text-center text-[43px] leading-[1.2em] font-semibold text-[#374151]">
            {workInAction.heading}
          </h3>
        </div>
      </section>
      <WorkCarouselGallery workImages={workInAction.images} />
    </>
  );
}
