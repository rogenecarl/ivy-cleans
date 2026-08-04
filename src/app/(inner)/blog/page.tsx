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
          <h3 className="text-rust mb-[1rem] text-[1.6rem] leading-[1.2em] font-semibold uppercase">
            BLOGS
          </h3>
          <h2 className="text-herogreen text-[2.5rem] leading-[1.2em] font-semibold md:text-[2.8rem] lg:text-[3.6rem]">
            Ivy Cleans news
          </h2>
        </div>
      </section>
      <section className="mt-0 mb-0 bg-white px-[1rem] pt-[1rem] pb-[1rem] md:mt-[95px] md:mb-[95px] md:pt-0 md:pb-[3rem] lg:pb-[8.6rem]">
        <div className="ec">
          <BlogCardGrid cards={blogCards} />
          <Pagination />
        </div>
      </section>
    </>
  );
}
