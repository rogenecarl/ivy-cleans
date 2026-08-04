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
 * icon set is installed in this project). Content
 * (elementor-element-32c6aca7): 18px font-size / 2.1em line-height.
 */
const SHARE_LINKS: { label: string; icon: string }[] = [
  { label: "Facebook", icon: "/icons/facebook.svg" },
  { label: "Twitter", icon: "/icons/x.svg" },
  { label: "LinkedIn", icon: "/icons/linkedin.svg" },
  { label: "Pinterest", icon: "/icons/pinterest.svg" },
];

const ALIGN_CLASS: Record<"left" | "center" | "right", string> = {
  left: "float-left mr-[2rem] mb-[1rem] max-w-[307px]",
  center: "mx-auto mb-[2.1em] block",
  right: "float-right ml-[2rem] mb-[1rem] max-w-[408px]",
};

export default function PostArticle({
  h1,
  heroImage,
  meta,
  blocks,
}: {
  h1: string;
  heroImage: { src: string; width: number; height: number; alt: string };
  meta: { author?: string; date?: string; category?: string; time?: string; commentCount?: string };
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
            {meta.time && <li>{meta.time}</li>}
            {meta.time && <li aria-hidden="true">&bull;</li>}
            {meta.commentCount && <li>{meta.commentCount}</li>}
          </ul>
          <Image
            src={heroImage.src}
            alt={heroImage.alt}
            width={heroImage.width}
            height={heroImage.height}
            className="mb-[3rem] h-auto w-full"
          />
          <div className="text-[1.8rem] leading-[2.1em] font-light text-black after:block after:clear-both after:content-['']">
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
              if (block.type === "img") {
                return (
                  <Image
                    key={i}
                    src={block.src}
                    alt={block.alt}
                    width={block.width}
                    height={block.height}
                    className={`h-auto w-auto max-w-full rounded-[4px] ${ALIGN_CLASS[block.align]}`}
                  />
                );
              }
              return (
                <p key={i} className="mb-[2.1em]">
                  {block.text}
                </p>
              );
            })}
          </div>

          {/* share buttons (elementor-element-59aa5822): skin-flat, view
              icon-text, shape-square, color-official grid — the live
              widget is a set of non-link, JS-driven share-popup triggers
              (`role="button"` divs, not anchors), reproduced the same way
              here since this is a static display-only clone. Height traces
              to `.elementor-share-btn{height:5em}` at the widget's 8px base
              font-size (`calc(0.8px*10)`) = 40px; icon size 1.5em = 12px;
              `.elementor-share-btn__title{text-transform:uppercase}`. */}
          <div className="mt-[3rem] flex flex-wrap gap-[10px]" role="list">
            {SHARE_LINKS.map((s) => (
              <span
                key={s.label}
                role="button"
                tabIndex={0}
                aria-label={`Share on ${s.label.toLowerCase()}`}
                className="flex h-[40px] items-center gap-[0.8rem] rounded-[2px] border border-[#e5e7eb] px-[1.6rem] text-[1.2rem] font-medium text-[#54595f] uppercase"
              >
                <span
                  aria-hidden="true"
                  className="bg-herogreen block h-[1.2rem] w-[1.2rem] shrink-0"
                  style={{
                    maskImage: `url(${s.icon})`,
                    WebkitMaskImage: `url(${s.icon})`,
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskPosition: "center",
                    maskSize: "contain",
                    WebkitMaskSize: "contain",
                  }}
                />
                {s.label}
              </span>
            ))}
          </div>

          {/* author box (elementor-element-4afee07d): #f2f2f2 background,
              6px bottom radius, 100px/37px (desktop/mobile) avatar, name
              uppercase, "All Posts »" button linking to the live author
              archive (no local /author route exists in this clone). The
              live widget's bio field is empty, so no bio line is rendered. */}
          <div className="mt-[3rem] flex flex-col items-center gap-[2rem] rounded-b-[6px] bg-[#f2f2f2] p-[2rem] text-center md:flex-row md:p-[3.5rem_4.5rem] md:text-left">
            <a href="https://ivycleans.com/author/aj/" className="shrink-0">
              <Image
                src="/images/avatar-aj.jpg"
                alt="Picture of aj"
                width={100}
                height={100}
                className="h-[3.7rem] w-[3.7rem] rounded-full object-cover md:h-[10rem] md:w-[10rem]"
              />
            </a>
            <div>
              <a href="https://ivycleans.com/author/aj/">
                <h4 className="text-[1.6rem] font-semibold text-black uppercase">aj</h4>
              </a>
              <a
                href="https://ivycleans.com/author/aj/"
                className="text-link mt-[1rem] inline-block text-[1.4rem] font-medium"
              >
                All Posts &raquo;
              </a>
            </div>
          </div>

          {/* divider (elementor-element-5506b00a): dotted 1px #afafaf rule,
              30px block padding top/bottom. */}
          <div className="border-t border-dotted border-[#afafaf] py-[30px]" />
        </article>
      </div>
    </section>
  );
}
