// One blog post on the shared post template (page 952). Body copy is inline runs so bold/italic/links survive.
export type Inline =
  | string
  // <strong>/<b>: live resolves these with `font-weight: bolder`, so the same
  // tag renders 700 inside a paragraph and 900 inside a heading.
  | { b: Inline[] }
  | { i: Inline[] }
  | { a: Inline[]; href: string };

export type ArticleBlock =
  | { type: "h1" | "h2" | "h3"; text: Inline[] }
  | { type: "p"; text: Inline[] }
  | { type: "ul" | "ol"; items: Inline[][] }
  | {
      type: "img";
      src: string;
      // the editor's width (inline style, else the attribute); height follows the file's own aspect
      width: number;
      height: number;
      alt: string;
      // wp-block-image alignment class; "none" is a bare wp-block-image.
      align: "left" | "center" | "right" | "none";
      // set when the inline style pinned a height: kept while max-width squeezes the width
      fixedHeight?: true;
    };

export type PostArticleData = {
  slug: string;
  meta: { title: string; description: string };
  h1: string;
  // Absent on the four posts that have no featured image — Elementor renders
  // no hero widget at all for those, it does not render an empty one.
  heroImage?: { src: string; width: number; height: number; alt: string };
  // The four elementor-post-info items live shows: author, date, time, comments.
  info: { author?: string; date?: string; time?: string; commentCount?: string };
  authorBox: { name: string; avatar: string; href: string };
  // Elementor only renders the comment list when the post has one; in this set
  // that is always a single pingback, never a human reply.
  responses?: { heading: string; items: { prefix: string; text: string; href: string }[] };
  blocks: ArticleBlock[];
};
