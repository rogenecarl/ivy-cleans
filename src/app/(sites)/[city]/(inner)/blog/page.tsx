import type { Metadata } from "next";
import { blogMeta, blogCards } from "@/data/blog";
import BlogCardGrid from "@/components/blog/BlogCardGrid";
import Pagination from "@/components/blog/Pagination";

export const metadata: Metadata = {
  title: blogMeta.title,
  ...(blogMeta.description ? { description: blogMeta.description } : {}),
};

/*
 * blog.html: heading section (elementor-element-ca03b5d) is the same
 * #EEF7F4 band + padding steps as PlansHeader's, carrying the "BLOGS"
 * eyebrow (elementor-element-6a04ca1, rust, 1.6rem uppercase) above the
 * "Ivy Cleans news" H2 (elementor-element-aa875ed, herogreen, 3.6/2.8/2.5rem).
 * The posts section (elementor-element-aff2ced) is white with a 95px
 * top/bottom margin at tablet+desktop (dropped to 0 at mobile) and a
 * padding-bottom that steps 8.6rem -> 3rem -> 1rem (post-32.css).
 */
export default function BlogPage() {
  return (
    <>
      <section className="bg-[#EEF7F4] pt-[2rem] pb-[1rem] md:pt-[3rem] md:pb-[2rem] lg:pt-[8.6rem] lg:pb-[3.8rem]">
        <div className="ec">
          {/*
            elementor-element-6a04ca1's widget container carries
            `margin:05rem 0rem -0.5rem 0rem`. CSS parses the leading zero
            away, so that top margin is 5rem — confirmed on live at 41.6px
            (1440, root 8.32px) and 50px (390, root 10px). The -0.5rem
            bottom nets against Elementor's 2rem widget spacing, leaving a
            1.5rem eyebrow-to-H2 gap (12px live at 1440, 15px at 390).
          */}
          <h3 className="text-rust mt-[5rem] mb-[1.5rem] text-[1.6rem] leading-[1.2em] font-semibold uppercase">
            BLOGS
          </h3>
          <h2 className="text-herogreen text-[2.5rem] leading-[1.2em] font-semibold md:text-[2.8rem] lg:text-[3.6rem]">
            Ivy Cleans news
          </h2>
        </div>
      </section>
      <section className="mt-0 mb-0 bg-white pt-[1rem] pb-[1rem] md:mt-[95px] md:mb-[95px] md:pt-0 md:pb-[3rem] lg:pb-[8.6rem]">
        <div className="ec">
          <BlogCardGrid cards={blogCards} />
          <Pagination />
        </div>
      </section>
    </>
  );
}
