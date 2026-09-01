/*
 * Shape of one blog post on the live site's shared post template
 * (elementor-page-952 / post-952.css).
 *
 * Body copy is stored as inline RUNS rather than plain strings because the
 * live posts mark up bold, italic and links mid-sentence — a flat string
 * cannot carry them, and the earlier single-post version of this file had no
 * way to express the 16 in-body links these posts contain.
 */
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
      // The width the editor asked for (inline `style="width:NNNpx"` when
      // present, else the width attribute); height is that width divided by
      // the file's own aspect, which is what live measures — a 600x400 file
      // sized to 841px renders 560.7 tall, not the 561 its attribute claims.
      width: number;
      height: number;
      alt: string;
      // wp-block-image alignment class; "none" is a bare wp-block-image.
      align: "left" | "center" | "right" | "none";
      // Set when the inline style pinned `height:NNNpx`. Live honours it
      // literally, so the figure keeps that height while max-width squeezes
      // its width on mobile. Without it the height scales with the width,
      // which is what `height:auto` and bare width/height attributes both do.
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
