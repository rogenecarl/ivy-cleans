import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cityFromParams } from "@/content/city-param";
import { citySlug, cityHref } from "@/content/interpolate";
import type { CityContent } from "@/content/types";
import { getCity } from "@/content/store";
import { suburbData, type SuburbRef } from "@/data/suburb";
import { siteData } from "@/data/site";
import { posts, postSlugs, type PostArticleData } from "@/data/posts";
import SuburbHero from "@/components/suburb/SuburbHero";
import HouseCleaning from "@/components/suburb/HouseCleaning";
import SuburbBenefits from "@/components/suburb/Benefits";
import OtherServices from "@/components/suburb/OtherServices";
import WorkInAction from "@/components/suburb/WorkInAction";
import SuburbClosing from "@/components/suburb/Closing";
import PostArticle from "@/components/blog/PostArticle";
import CommentFormDisplay from "@/components/blog/CommentFormDisplay";

/*
 * This dynamic segment RENDERS exactly two classes of value, and recognises
 * two more only to redirect them — anything else still 404s, and it must
 * never become a catch-all that swallows typos:
 *
 *   1. any stored suburb slug, c.research.suburbs[].slug — rendered here
 *   2. any blog post slug, src/data/posts — rendered here
 *   3. /deep-cleaning-<citySlug>              — 308 to /services/deep-cleaning
 *   4. /<citySlug>-move-out-cleaning-services — 308 to
 *      /services/move-in-move-out-cleaning
 *
 * Cases 3 and 4 carry the city name IN THE URL; they used to render here,
 * and are kept as permanent redirects because those URLs are indexed (see
 * resolveSlug below). Suburb slugs are looked up by exact match against
 * c.research.suburbs — never derived, since the live site's suburb URL
 * patterns vary (house-cleaning-*, cleaning-services-*, cleaning-service-*,
 * *-cleaning-services, all four appear in the fixtures). The literal sibling
 * routes (blog, book, contact, faq, home, cleaning-services, services) still
 * win because Next matches static segments before dynamic ones.
 *
 * Blog posts live at the ROOT of a site on the live install — the listing
 * links to /how-to-clean-bathroom-walls, not /blog/how-to-clean-bathroom-walls
 * — which is why they resolve through this segment rather than a
 * blog/[slug] one. Next allows only a single dynamic segment per level, so
 * this file is that segment for every root-level slug the site serves.
 *
 * No nav or body link points at cases 3 and 4 any more: src/data/site.ts and
 * src/components/home/HouseCleaning.tsx now link to /services/<slug>. The
 * only links that still land here are suburb links built from stored slugs
 * (src/data/areas.ts, ServiceArea.tsx/Locations.tsx) and post links built
 * from stored post slugs (src/data/blog.ts, src/data/recent-posts.ts), so
 * slugs and hrefs cannot drift.
 */
type SlugParams = Promise<{ city: string; slug: string }>;

function redirectSlugs(c: CityContent) {
  const slug = citySlug(c.city);
  return {
    deep: `deep-cleaning-${slug}`,
    move: `${slug}-move-out-cleaning-services`,
  };
}

type Resolved =
  | { kind: "suburb"; c: CityContent; suburb: SuburbRef }
  | { kind: "post"; c: CityContent; post: PostArticleData };

/**
 * Which slug this request addresses, or `notFound()`. The deep and move
 * slugs no longer render here — they redirect permanently to their
 * /services/... equivalents, since those two URLs are indexed and must
 * keep whatever search ranking they've earned instead of 404ing. Suburb
 * slugs and post slugs are the two that resolve to page content. Both the
 * page and generateMetadata dispatch through here so they can never disagree.
 */
async function resolveSlug(params: SlugParams): Promise<Resolved> {
  const c = await cityFromParams(params);
  const { slug } = await params;
  const redirects = redirectSlugs(c);
  if (slug === redirects.deep) {
    permanentRedirect(cityHref(c, "/services/deep-cleaning"));
  }
  if (slug === redirects.move) {
    permanentRedirect(cityHref(c, "/services/move-in-move-out-cleaning"));
  }
  const suburb = c.research.suburbs.find((s) => s.slug === slug);
  if (suburb !== undefined) return { kind: "suburb", c, suburb };
  const post = posts[slug];
  if (post !== undefined) return { kind: "post", c, post };
  notFound();
}

/*
 * Runs once per city emitted by the parent [city] segment's
 * generateStaticParams, receiving that city in `params` (Next merges parent
 * params into the child call — next/dist/build/static-paths/app.js). Cities
 * are re-read here rather than threaded, because generateStaticParams gets a
 * plain params object, not the request-time Promise.
 *
 * Suburb slugs are only appended when c.hasSuburbPages — a city whose suburb
 * pages are not live yet must not get real routes for slugs Areas We Serve
 * still renders unlinked (src/data/areas.ts / ServiceArea.tsx honour the same
 * flag). Post slugs carry no such flag: the blog listing links to them from
 * every city. dynamicParams below still lets a draft preview reach an
 * un-generated slug on demand.
 */
export async function generateStaticParams({ params }: { params: { city: string } }) {
  const c = await getCity(params.city);
  const { deep, move } = redirectSlugs(c);
  const slugs = [{ slug: deep }, { slug: move }];
  if (c.hasSuburbPages) {
    for (const suburb of c.research.suburbs) slugs.push({ slug: suburb.slug });
  }
  for (const slug of postSlugs) slugs.push({ slug });
  return slugs;
}

// Draft cities are not in the parent's static params, so their pages render
// on demand at /<draftCity>/<slug> — the preview.
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: SlugParams }): Promise<Metadata> {
  const resolved = await resolveSlug(params);
  if (resolved.kind === "post") {
    return { title: resolved.post.meta.title, description: resolved.post.meta.description };
  }
  const { suburbMeta } = suburbData(resolved.c, resolved.suburb);
  return { title: suburbMeta.title, description: suburbMeta.description };
}

export default async function InnerSlugPage({ params }: { params: SlugParams }) {
  const resolved = await resolveSlug(params);
  if (resolved.kind === "post") return <PostPage post={resolved.post} />;
  return <SuburbPage c={resolved.c} suburb={resolved.suburb} />;
}

/* The live blog-post template: article, then the comment widget, both inside
   the same Elementor column (see PostArticle / CommentFormDisplay). */
function PostPage({ post }: { post: PostArticleData }) {
  return (
    <>
      <PostArticle post={post} />
      <CommentFormDisplay responses={post.responses} />
    </>
  );
}

/* New for Plan 5, Task 2 — one page per suburb.slug (c.research.suburbs). */
function SuburbPage({ c, suburb }: { c: CityContent; suburb: SuburbRef }) {
  const { hero, houseCleaning, benefits, otherServices, workInAction, closing } = suburbData(
    c,
    suburb,
  );
  const { innerSite } = siteData(c);
  return (
    <>
      <SuburbHero hero={hero} bookHref={innerSite.bookUrl} />
      <HouseCleaning houseCleaning={houseCleaning} />
      <SuburbBenefits benefits={benefits} bookHref={innerSite.bookUrl} />
      <OtherServices otherServices={otherServices} />
      <WorkInAction workInAction={workInAction} />
      <SuburbClosing closing={closing} bookHref={innerSite.bookUrl} />
    </>
  );
}
