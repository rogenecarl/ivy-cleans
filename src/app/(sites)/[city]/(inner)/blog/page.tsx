import type { Metadata } from "next";
import Breadcrumbs from "@/components/inner/Breadcrumbs";
import { breadcrumbs } from "@/data/breadcrumbs";
import { cityFromParams } from "@/content/city-param";
import { blogMeta, blogCardsFor } from "@/data/blog";
import { cityKeyOf } from "@/content/interpolate";
import { listPosts } from "@/blog/store";
import { postCards } from "@/blog/cards";
import BlogCardGrid from "@/components/blog/BlogCardGrid";
import Pagination from "@/components/blog/Pagination";

export const metadata: Metadata = {
  title: blogMeta.title,
  ...(blogMeta.description ? { description: blogMeta.description } : {}),
};

// post-32.css: heading band ca03b5d (eyebrow 6a04ca1, h2 aa875ed), posts section aff2ced
export default async function BlogPage({ params }: { params: Promise<{ city: string }> }) {
  // The cards' hrefs have to be scoped to this tenant — the raw list is
  // root-relative and 404s anywhere but the default host. See blogCardsFor.
  const c = await cityFromParams(params);
  // the store is optional here: a database outage must not take the blog page down
  const toolPosts = await listPosts(cityKeyOf(c)).catch(() => []);
  const blogCards = [...postCards(toolPosts, c), ...blogCardsFor(c)];
  return (
    <>
      <Breadcrumbs trail={breadcrumbs(c, { kind: "page", label: "Blog", path: "/blog" })} />
      <section className="bg-[#EEF7F4] pt-[2rem] pb-[1rem] md:pt-[3rem] md:pb-[2rem] lg:pt-[8.6rem] lg:pb-[3.8rem]">
        <div className="ec">
          {/* 6a04ca1: margin 5rem 0 -0.5rem — nets to a 1.5rem gap to the h2 */}
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
