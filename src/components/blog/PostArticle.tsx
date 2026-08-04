import Image from "next/image";
import type { ArticleBlock } from "@/data/blog";

/*
 * post-952.css: section elementor-element-4fed1c62 has a flat 50px top/bottom
 * margin at every width; the column elementor-element-4f183490 pads 60px on
 * all four sides, dropping to 0 at <=767 so the article runs edge-to-edge on
 * phones (live measures x=0 / width=390 at a 390px viewport). The column sits
 * in the kit's 119rem boxed container (990px at the 1440 root step), so
 * 990 - 2x60 = the 870px content column live actually renders.
 *
 * H1 (elementor-element-70712646): 60px/600 #000, 30px bottom margin, 33px at
 * <=767. Post-info list (elementor-element-1329edf): dotted 1px #afafaf
 * top/bottom border, 15px vertical padding, 13px/300 #54595f items with
 * 25px/2 side margins (15px/2 at <=767) — reproduced as bullet-separated text
 * per BlogCardGrid's convention, since no font-awesome icon set is installed.
 * Content (elementor-element-32c6aca7): 18px / 2.1em line-height.
 *
 * Values below that post-952.css does not carry were measured off the live
 * page with a Playwright computed-style probe at 1440x900 and 390x844
 * (round-4 fidelity pass): body copy #374151; h2 22px/700 and h3 20px/600,
 * both 0.5rem top / 1rem bottom margin and 1.2 line-height; paragraphs 2rem
 * bottom margin; figures 18px bottom margin with a 1rem side margin on the
 * floated ones; and the share buttons' official brand colours (Elementor's
 * "color-official" skin, whose stylesheet is not in the reference set).
 */
const SHARE_LINKS: { label: string; icon: string; bg: string }[] = [
  { label: "Facebook", icon: "/icons/facebook.svg", bg: "#3b5998" },
  { label: "Twitter", icon: "/icons/x.svg", bg: "#1da1f2" },
  { label: "LinkedIn", icon: "/icons/linkedin.svg", bg: "#0077b5" },
  { label: "Pinterest", icon: "/icons/pinterest.svg", bg: "#bd081c" },
];

const ALIGN_CLASS: Record<"left" | "center" | "right", string> = {
  left: "float-left mr-[1rem] mb-[18px] max-w-[calc(100%-1rem)]",
  center: "mx-auto mb-[18px] block h-auto w-full max-w-full",
  right: "float-right ml-[1rem] mb-[18px] max-w-[calc(100%-1rem)]",
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
  /*
   * The live page runs the article and the comment form down one Elementor
   * column, so the 50px section margin lives on this component's top edge
   * only; CommentFormDisplay carries the matching 50px bottom margin and the
   * 2rem widget gap that separates the two.
   */
  return (
    <section className="mt-[50px] mb-0 bg-white">
      <div className="mx-auto max-w-[119rem]">
        <article className="p-0 md:p-[60px] md:pb-0">
          {/* 30px widget margin + Elementor's 2rem widget spacing; written as one
              value because adjacent sibling margins would otherwise collapse to
              the larger of the two (live measures 46.6px at 1440 / 50px at 390
              between the H1 baseline box and the post-info rule). */}
          <h1 className="mb-[calc(30px+2rem)] text-[33px] leading-[1.2em] font-semibold text-black md:text-[60px]">
            {h1}
          </h1>
          <ul className="mt-0 mb-[2rem] flex flex-wrap items-center gap-x-[7.5px] gap-y-[0.5rem] border-y border-dotted border-[#afafaf] py-[15px] text-[13px] leading-[27px] font-light text-[#54595f] md:gap-x-[12.5px] md:leading-[1.2em]">
            {meta.author && <li>By {meta.author}</li>}
            {meta.author && <li aria-hidden="true">&bull;</li>}
            {meta.date && <li>{meta.date}</li>}
            {meta.date && <li aria-hidden="true">&bull;</li>}
            {meta.time && <li>{meta.time}</li>}
            {meta.time && <li aria-hidden="true">&bull;</li>}
            {meta.commentCount && <li>{meta.commentCount}</li>}
          </ul>
          {/*
            The live featured image is an Elementor "thumbs/" derivative of
            image-12 cropped to 2.277:1 (measured 870x382 at 1440, 390x171 at
            390); the asset mirrored into public/ is the uncropped 600x400
            original, so the same box geometry is reproduced with an explicit
            aspect ratio plus object-cover.
          */}
          <Image
            src={heroImage.src}
            alt={heroImage.alt}
            width={heroImage.width}
            height={heroImage.height}
            className="mb-[2rem] aspect-[870/382] w-full object-cover"
          />
          <div className="text-[18px] leading-[2.1em] text-[#374151] after:block after:clear-both after:content-['']">
            {/* blocks is a fixed, ordered content list (extracted once from
                blog-post.html) that never reorders/inserts/deletes at
                runtime, so the array index is a stable, safe React key. */}
            {blocks.map((block, i) => {
              if (block.type === "h2") {
                return (
                  <h2
                    key={i}
                    className="mt-[0.5rem] mb-[1rem] text-[22px] leading-[1.2em] font-bold text-[#374151]"
                  >
                    {block.text}
                  </h2>
                );
              }
              if (block.type === "h3") {
                return (
                  <h3
                    key={i}
                    className="mt-[0.5rem] mb-[1rem] text-[20px] leading-[1.2em] font-semibold text-[#374151]"
                  >
                    {block.text}
                  </h3>
                );
              }
              if (block.type === "img") {
                /*
                 * The two floated figures carry an explicit
                 * `style="width:NNNpx;height:NNNpx"` in blog-post.html, which
                 * live honours verbatim — the alignright one is squeezed to
                 * the viewport at 390 while keeping its 305px height. Mirror
                 * that with the same inline sizing + max-width:100%. The two
                 * aligncenter figures have no inline size and simply fill the
                 * content column at their natural aspect.
                 */
                const sized = block.align !== "center";
                return (
                  <Image
                    key={i}
                    src={block.src}
                    alt={block.alt}
                    width={block.width}
                    height={block.height}
                    className={ALIGN_CLASS[block.align]}
                    style={sized ? { width: block.width, height: block.height } : undefined}
                  />
                );
              }
              return (
                <p key={i} className="mb-[2rem]">
                  {block.text}
                </p>
              );
            })}
          </div>

          {/* share buttons (elementor-element-59aa5822): skin-flat, view
              icon-text, shape-square, color-official. The live widget is a set
              of non-link, JS-driven share-popup triggers (`role="button"`
              divs, not anchors), reproduced the same way here since this is a
              static display-only clone. Grid is 5 columns x 10px gap
              (--grid-column-gap:10px; the four buttons measure 166px each in
              a 870px column, i.e. a 5-track grid) collapsing to one full-width
              column at <=767. Height 40px (`.elementor-share-btn{font-size:
              calc(0.8px*10);height:5em}`), 36px icon gutter with a 12px
              (1.5em) white glyph, 12px/700 uppercase white label. */}
          <div className="mt-[2rem] grid grid-cols-1 gap-[10px] md:grid-cols-5" role="list">
            {SHARE_LINKS.map((s) => (
              <span
                key={s.label}
                role="button"
                tabIndex={0}
                aria-label={`Share on ${s.label.toLowerCase()}`}
                className="flex h-[40px] items-center text-[12px] leading-[1.2em] font-bold text-white uppercase"
                style={{ backgroundColor: s.bg }}
              >
                <span
                  aria-hidden="true"
                  className="flex h-full w-[36px] shrink-0 items-center justify-center"
                >
                  <span
                    className="block h-[12px] w-[12px] bg-white"
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
                </span>
                {s.label}
              </span>
            ))}
          </div>

          {/* author box (elementor-element-4afee07d): #f2f2f2 widget container,
              35px 45px padding, 0 0 6px 6px radius, avatar 100px desktop /
              37px mobile with a 45px right margin — the live layout stays
              image-left at every width. Name is 18px/700 uppercase in the link
              colour, the "All Posts »" button 15px/100 uppercase #3f444b with
              no border or padding (`border-width:0px;padding:0px`). The live
              bio field is empty, so no bio line is rendered. */}
          <div className="mt-[2rem] flex items-center rounded-b-[6px] bg-[#f2f2f2] p-[35px_45px]">
            <a href="https://ivycleans.com/author/aj/" className="mr-[45px] shrink-0">
              <Image
                src="/images/avatar-aj.jpg"
                alt="Picture of aj"
                width={100}
                height={100}
                className="h-[37px] w-[37px] rounded-full object-cover md:h-[100px] md:w-[100px]"
              />
            </a>
            <div>
              <a href="https://ivycleans.com/author/aj/">
                <h4 className="text-link mb-[11px] text-[18px] leading-[1.2em] font-bold uppercase">
                  aj
                </h4>
              </a>
              <a
                href="https://ivycleans.com/author/aj/"
                className="inline-block rounded-[5px] text-[15px] leading-[1.2em] font-thin text-[#3f444b] uppercase"
              >
                All Posts &raquo;
              </a>
            </div>
          </div>

          {/* divider (elementor-element-5506b00a): 1px dotted #afafaf rule
              centred in 30px of block padding top and bottom. */}
          <div className="mt-[2rem] py-[30px]">
            <div className="border-t border-dotted border-[#afafaf]" />
          </div>
        </article>
      </div>
    </section>
  );
}
