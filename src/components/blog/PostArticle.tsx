import Image from "next/image";
import type { ArticleBlock, Inline, PostArticleData } from "@/data/posts/types";

// post-952.css: section 4fed1c62, column 4f183490, h1 70712646, post-info 1329edf, content 32c6aca7.
// Body sizes measured off the live posts at 1440/390.
const SHARE_LINKS: { label: string; icon: string; bg: string }[] = [
  { label: "Facebook", icon: "/icons/facebook.svg", bg: "#3b5998" },
  { label: "Twitter", icon: "/icons/x.svg", bg: "#1da1f2" },
  { label: "LinkedIn", icon: "/icons/linkedin.svg", bg: "#0077b5" },
  { label: "Pinterest", icon: "/icons/pinterest.svg", bg: "#bd081c" },
];

// floated figures cap at the column minus their 1rem gutter
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

// `bolder`: 700 in a paragraph, 900 in a heading, like the live stylesheet
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
  // switch so the h1|h2|h3 discriminant narrows
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
      // a pinned inline height stays fixed while max-width squeezes the width; everything else scales
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

// live links the avatar and name to an author archive; a tenant has none, so href "" renders the same box unlinked
function AuthorLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  if (href === "") return <span className={className}>{children}</span>;
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export type PostHero = { src: string; width: number; height: number; alt: string; external?: true };

// The post template around any body: file-based posts pass blocks, blog-tool posts pass sanitized HTML.
export function PostShell({
  h1,
  heroImage,
  info,
  authorBox,
  children,
}: {
  h1: string;
  heroImage?: PostHero;
  info: PostArticleData["info"];
  authorBox: PostArticleData["authorBox"];
  children: React.ReactNode;
}) {
  // 50px section margin is top-only here; CommentFormDisplay carries the bottom
  return (
    <section className="mt-[50px] mb-0 bg-white">
      <div className="mx-auto max-w-[119rem]">
        <article className="p-0 md:p-[60px] md:pb-0">
          {/* 30px widget margin + 2rem widget spacing as one value so they don't collapse */}
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
          {/* featured image is a 2.277:1 crop; posts without one render no hero */}
          {heroImage && (
            <Image
              src={heroImage.src}
              alt={heroImage.alt}
              width={heroImage.width}
              height={heroImage.height}
              unoptimized={heroImage.external}
              className="mb-[2rem] aspect-[870/382] w-full object-cover"
            />
          )}
          {/* flow-root widget around a plain container: absorbs the last block's margin and contains the floats, like live */}
          <div className="mb-[2rem] flow-root">
            <div className="text-[18px] leading-[2.1em] text-[#374151]">{children}</div>
          </div>

          {/* share buttons 59aa5822: 5-col grid, 10px gap, 40px tall; display-only like live */}
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

          {/* author box 4afee07d */}
          <div className="mt-[2rem] flex items-center rounded-b-[6px] bg-[#f2f2f2] p-[35px_45px]">
            {/* block link around an inline img: 2px/3px taller than the image, like live */}
            <AuthorLink href={authorBox.href} className="mr-[45px] h-[40px] shrink-0 md:h-[102px]">
              <Image
                src={authorBox.avatar}
                alt={`Picture of ${authorBox.name}`}
                width={100}
                height={100}
                className="h-[37px] w-[37px] rounded-full object-cover md:h-[100px] md:w-[100px]"
              />
            </AuthorLink>
            <div>
              <AuthorLink href={authorBox.href}>
                <h4 className="text-link mt-[0.5rem] mb-[5px] text-[18px] leading-[1.2em] font-bold uppercase">
                  {authorBox.name}
                </h4>
              </AuthorLink>
              {/* the empty bio div still takes its 12px margin on live */}
              <div className="mb-[12px]" />
              {authorBox.href !== "" && (
                <a
                  href={authorBox.href}
                  className="inline-block rounded-[5px] text-[15px] leading-[18px] font-thin text-[#3f444b] uppercase"
                >
                  All Posts &raquo;
                </a>
              )}
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

export default function PostArticle({ post }: { post: PostArticleData }) {
  const { h1, heroImage, info, authorBox, blocks } = post;
  return (
    <PostShell h1={h1} heroImage={heroImage} info={info} authorBox={authorBox}>
      {/* fixed content list; index is a stable key */}
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </PostShell>
  );
}
