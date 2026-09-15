import type { Metadata } from "next";
import Breadcrumbs from "@/components/inner/Breadcrumbs";
import { breadcrumbs } from "@/data/breadcrumbs";
import { cityFromParams } from "@/content/city-param";
import { cityHref, cityKeyOf } from "@/content/interpolate";
import { blogMeta } from "@/data/blog";
import { listPosts } from "@/blog/store";
import { postCards } from "@/blog/cards";
import BlogCardGrid from "@/components/blog/BlogCardGrid";
import Pagination from "@/components/blog/Pagination";

export const metadata: Metadata = {
  title: blogMeta.title,
  ...(blogMeta.description ? { description: blogMeta.description } : {}),
};

const PAGE_SIZE = 9;

// post-32.css: heading band ca03b5d (eyebrow 6a04ca1, h2 aa875ed), posts section aff2ced
export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const c = await cityFromParams(params);
  // the store is optional here: a database outage must not take the blog page down
  const posts = await listPosts(cityKeyOf(c)).catch(() => []);
  const pages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const requested = Number((await searchParams).page ?? "1");
  const page = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), pages) : 1;
  const cards = postCards(posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), c);
  const base = cityHref(c, "/blog");
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
          {cards.length > 0 ? (
            <BlogCardGrid cards={cards} />
          ) : (
            <p className="text-center text-[1.8rem] leading-[1.5] text-[#777]">No posts yet. Check back soon.</p>
          )}
          <Pagination page={page} pages={pages} hrefFor={(n) => (n === 1 ? base : `${base}?page=${n}`)} />
        </div>
      </section>
    </>
  );
}
