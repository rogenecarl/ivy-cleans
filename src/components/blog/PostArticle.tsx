import Image from "next/image";
import type { ArticleBlock, Inline, PostArticleData } from "@/data/posts/types";

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
 * pages with the Playwright computed-style probe at 1440x900 and 390x844,
 * across how-to-clean-bathroom-walls (paragraphs, lists, inline runs) and
 * guide-to-basement-cleaning-services-near-you (in-body H1, floated figures):
 *
 *   p       18px/27px 400 #374151, 2rem bottom margin
 *   h1      26px/1.2em 700   |  h2 22px/1.2em 700  |  h3 20px/1.2em 600
 *           all three: 0.5rem top / 1rem bottom margin
 *   ul/ol   margin 0, padding-left 40px, disc / decimal, marker outside;
 *           list items keep the wrapper's 2.1em line-height (37.8px), which
 *           is why the 1.5 above is set on the paragraph and not the wrapper
 *   a       #cc3366, 1.2em, no underline
 *   strong  font-weight: bolder — resolves to 700 inside a paragraph and 900
 *           inside a heading, so it is written as `bolder`, not a fixed weight
 *   figure  18px bottom margin; floats add a 1rem gutter on their inner side
 *
 * and the share buttons' official brand colours (Elementor's "color-official"
 * skin, whose stylesheet is not in the reference set).
 */
const SHARE_LINKS: { label: string; icon: string; bg: string }[] = [
  { label: "Facebook", icon: "/icons/facebook.svg", bg: "#3b5998" },
  { label: "Twitter", icon: "/icons/x.svg", bg: "#1da1f2" },
  { label: "LinkedIn", icon: "/icons/linkedin.svg", bg: "#0077b5" },
  { label: "Pinterest", icon: "/icons/pinterest.svg", bg: "#bd081c" },
];

/*
 * A floated figure is shrink-to-fit, so live caps it at the space left after
 * its own 1rem gutter — 380px inside a 390px column, not 390. The non-floated
 * ones have no side margin and cap at the full column.
 */
const ALIGN_CLASS: Record<"left" | "center" | "right" | "none", string> = {
  left: "float-left mr-[1rem] mb-[18px] max-w-[calc(100%-1rem)]",
  center: "mx-auto mb-[18px] block max-w-full",
  right: "float-right ml-[1rem] mb-[18px] max-w-[calc(100%-1rem)]",
  none: "mb-[18px] block max-w-full",
};

const HEADING_CLASS: Record<"h1" | "h2" | "h3", string> = {
  h1: "mt-[0.5rem] mb-[1rem] text-[26px] leading-[1.2em] font-bold text-[#374151]",
  h2: "mt-[0.5rem] mb-[1rem] text-[22px] leading-[1.2em] font-bold text-[#374151]",
  h3: "mt-[0.5rem] mb-[1rem] text-[20px] leading-[1.2em] font-semibold text-[#374151]",
};

/*
 * Inline runs carry the bold/italic/link markup the live posts use mid-
 * sentence. `bolder` is deliberate: it is what the live stylesheet resolves,
 * and it is the only value that gives 700 in a paragraph and 900 in a heading
 * off the same source tag.
 */
function InlineRuns({ runs }: { runs: Inline[] }) {
  return (
    <>
      {runs.map((run, i) => {
        if (typeof run === "string") return <span key={i}>{run}</span>;
        if ("b" in run) {
          return (
            <strong key={i} className="[font-weight:bolder]">
              <InlineRuns runs={run.b} />
            </strong>
          );
        }
        if ("i" in run) {
          return (
            <em key={i}>
              <InlineRuns runs={run.i} />
            </em>
          );
        }
        return (
          <a key={i} href={run.href} className="text-[#cc3366] leading-[1.2em] no-underline">
            <InlineRuns runs={run.a} />
          </a>
        );
      })}
    </>
  );
}

function Block({ block }: { block: ArticleBlock }) {
  // A switch, not a chain of ifs: the heading member carries a three-literal
  // discriminant ("h1" | "h2" | "h3"), which `if (a || b || c)` does not narrow
  // away for the branches below it.
  switch (block.type) {
    case "h1":
    case "h2":
    case "h3": {
      const Tag = block.type;
      return (
        <Tag className={HEADING_CLASS[block.type]}>
          <InlineRuns runs={block.text} />
        </Tag>
      );
    }
    case "ul":
    case "ol": {
      const Tag = block.type;
      return (
        <Tag
          className={`m-0 list-outside pl-[40px] ${
            block.type === "ul" ? "list-disc" : "list-decimal"
          }`}
        >
          {block.items.map((item, i) => (
            <li key={i}>
              <InlineRuns runs={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case "img":
      /*
       * Live sizes these from the editor's own numbers: a figure whose inline
       * style pins `height:NNNpx` keeps that height while max-width squeezes
       * its width on mobile (fixedHeight), whereas `height:auto` and bare
       * width/height attributes both scale with the width, because the theme
       * sets `img { height: auto }`.
       */
      return (
        <Image
          src={block.src}
          alt={block.alt}
          width={block.width}
          height={block.height}
          className={`${ALIGN_CLASS[block.align]} ${block.fixedHeight ? "" : "h-auto"}`}
          style={
            block.fixedHeight ? { width: block.width, height: block.height } : { width: block.width }
          }
        />
      );
    case "p":
      return (
        <p className="mb-[2rem] leading-[1.5]">
          <InlineRuns runs={block.text} />
        </p>
      );
  }
}

export default function PostArticle({ post }: { post: PostArticleData }) {
  const { h1, heroImage, info, authorBox, blocks } = post;
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
            {info.author && <li>By {info.author}</li>}
            {info.author && <li aria-hidden="true">&bull;</li>}
            {info.date && <li>{info.date}</li>}
            {info.date && <li aria-hidden="true">&bull;</li>}
            {info.time && <li>{info.time}</li>}
            {info.time && <li aria-hidden="true">&bull;</li>}
            {info.commentCount && <li>{info.commentCount}</li>}
          </ul>
          {/*
            The live featured image is an Elementor "thumbs/" derivative cropped
            to 2.277:1 (measured 870x382 at 1440, 390x171 at 390). Four of the
            nine posts have no featured image at all, and live renders no hero
            widget for those rather than an empty one.
          */}
          {heroImage && (
            <Image
              src={heroImage.src}
              alt={heroImage.alt}
              width={heroImage.width}
              height={heroImage.height}
              className="mb-[2rem] aspect-[870/382] w-full object-cover"
            />
          )}
          {/*
            Two boxes, mirroring live: an outer WIDGET carrying Elementor's 2rem
            widget spacing, wrapping a plain block CONTAINER that holds the
            copy. The nesting is not decoration — it decides the gap under the
            article. The container establishes no BFC, so the last block's
            bottom margin collapses out of it; the widget does establish one
            (flow-root), so it absorbs that margin instead of letting it
            collapse away, and it contains the floated figures. That is what
            leaves 2rem of white space under a post ending in a paragraph and
            none under one ending in a list — live behaves the same way in both
            cases. A clearfix here instead of flow-root would only contain the
            margin on the posts that happen to have a float above it.
          */}
          <div className="mb-[2rem] flow-root">
            <div className="text-[18px] leading-[2.1em] text-[#374151]">
              {/* blocks is a fixed, ordered content list (extracted once from
                  the captured post HTML) that never reorders/inserts/deletes
                  at runtime, so the array index is a stable, safe React key. */}
              {blocks.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </div>
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
              bio field is empty on every post in this set, so no bio line is
              rendered. Eight posts are bylined "aj"; the ninth is
              "Support IvyCleans", with its own gravatar and author archive. */}
          <div className="mt-[2rem] flex items-center rounded-b-[6px] bg-[#f2f2f2] p-[35px_45px]">
            {/* The avatar link is a block wrapping an inline <img>, so live
                measures it 2px taller than the image at 1440 and 3px at 390 —
                the inline baseline gap. Pinned explicitly, because Tailwind's
                preflight makes images block and would drop those pixels. */}
            <a href={authorBox.href} className="mr-[45px] h-[40px] shrink-0 md:h-[102px]">
              <Image
                src={authorBox.avatar}
                alt={`Picture of ${authorBox.name}`}
                width={100}
                height={100}
                className="h-[37px] w-[37px] rounded-full object-cover md:h-[100px] md:w-[100px]"
              />
            </a>
            <div>
              <a href={authorBox.href}>
                <h4 className="text-link mt-[0.5rem] mb-[5px] text-[18px] leading-[1.2em] font-bold uppercase">
                  {authorBox.name}
                </h4>
              </a>
              {/* Every post in this set has an empty author bio. Live still
                  renders the empty .elementor-author-box__bio div, and its 12px
                  bottom margin is real space between the name and the button. */}
              <div className="mb-[12px]" />
              <a
                href={authorBox.href}
                className="inline-block rounded-[5px] text-[15px] leading-[18px] font-thin text-[#3f444b] uppercase"
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
