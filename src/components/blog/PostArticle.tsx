import Image from "next/image";
import type { ArticleBlock } from "@/data/blog";

/*
 * post-952.css: elementor-element-4fed1c62 section (50px top/bottom margin,
 * dropping to 0 padding on the elementor-element-4f183490 column at <=767)
 * wraps the article. H1 (elementor-element-70712646): 60px/600 weight,
 * 30px bottom margin, dropping to 33px at <=767. Post-info list
 * (elementor-element-1329edf): dotted 1px #afafaf top/bottom border,
 * 15px vertical padding, 13px/300-weight #54595f items — reproduced as
 * bullet-separated text per BlogCardGrid's convention (no font-awesome
 * icon set is installed in this project). "7:21 pm" / "No Comments" are
 * fixed literal values read off blog-post.html's live post-info list —
 * postArticle.meta only carries author/date, so they're not data-driven.
 * Content (elementor-element-32c6aca7): 18px font-size / 2.1em line-height.
 */
export default function PostArticle({
  h1,
  heroImage,
  meta,
  blocks,
}: {
  h1: string;
  heroImage: { src: string; width: number; height: number; alt: string };
  meta: { author?: string; date?: string; category?: string };
  blocks: ArticleBlock[];
}) {
  return (
    <section className="mt-[2rem] mb-[2rem] bg-white md:mt-[3.5rem] md:mb-[3.5rem] lg:mt-[5rem] lg:mb-[5rem]">
      <div className="ec">
        <article className="mx-auto max-w-[978px] p-0 lg:p-[6rem]">
          <h1 className="mb-[3rem] text-[3.3rem] leading-[1.2em] font-semibold text-black lg:text-[6rem]">
            {h1}
          </h1>
          <ul className="mb-[3rem] flex flex-wrap items-center gap-x-[0.8rem] gap-y-[0.5rem] border-y border-dotted border-[#afafaf] py-[1.5rem] text-[1.3rem] leading-[1.4em] font-light text-[#54595f]">
            {meta.author && <li>By {meta.author}</li>}
            {meta.author && <li aria-hidden="true">&bull;</li>}
            {meta.date && <li>{meta.date}</li>}
            {meta.date && <li aria-hidden="true">&bull;</li>}
            <li>7:21 pm</li>
            <li aria-hidden="true">&bull;</li>
            <li>No Comments</li>
          </ul>
          <Image
            src={heroImage.src}
            alt={heroImage.alt}
            width={heroImage.width}
            height={heroImage.height}
            className="mb-[3rem] h-auto w-full"
          />
          <div className="text-[1.8rem] leading-[2.1em] font-light text-black">
            {/* blocks is a fixed, ordered content list (extracted once from
                blog-post.html) that never reorders/inserts/deletes at
                runtime, so the array index is a stable, safe React key. */}
            {blocks.map((block, i) => {
              if (block.type === "h2") {
                return (
                  <h2
                    key={i}
                    className="mt-[3rem] mb-[1.5rem] text-[2.4rem] leading-[1.3em] font-semibold text-black first:mt-0"
                  >
                    {block.text}
                  </h2>
                );
              }
              if (block.type === "h3") {
                return (
                  <h3
                    key={i}
                    className="mt-[2.5rem] mb-[1.2rem] text-[2rem] leading-[1.3em] font-semibold text-black"
                  >
                    {block.text}
                  </h3>
                );
              }
              return (
                <p key={i} className="mb-[2.1em]">
                  {block.text}
                </p>
              );
            })}
          </div>
        </article>
      </div>
    </section>
  );
}
