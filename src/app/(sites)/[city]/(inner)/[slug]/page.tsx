import type { Metadata } from "next";
import Breadcrumbs from "@/components/inner/Breadcrumbs";
import { breadcrumbs } from "@/data/breadcrumbs";
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

// Root-level slugs: stored suburb slugs and blog post slugs render here; /deep-cleaning-<city> and
// /<city>-move-out-cleaning-services 308 to /services/... (indexed URLs). Anything else 404s.
// Static sibling routes win because Next matches them first. Posts live at the root on live, hence this segment.
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

// which slug this request addresses, or notFound(); page and generateMetadata both dispatch through here
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

// runs once per city from the parent segment's params. Suburb slugs only when hasSuburbPages; post slugs always.
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
  if (resolved.kind === "post") return <PostPage c={resolved.c} post={resolved.post} />;
  return <SuburbPage c={resolved.c} suburb={resolved.suburb} />;
}

/* The live blog-post template: article, then the comment widget, both inside
   the same Elementor column (see PostArticle / CommentFormDisplay). */
function PostPage({ c, post }: { c: CityContent; post: PostArticleData }) {
  return (
    <>
      <Breadcrumbs
        trail={breadcrumbs(c, { kind: "post", title: post.h1, slug: post.slug })}
      />
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
      <Breadcrumbs trail={breadcrumbs(c, { kind: "area", name: suburb.name, slug: suburb.slug })} />
      <SuburbHero hero={hero} bookHref={innerSite.bookUrl} />
      <HouseCleaning houseCleaning={houseCleaning} />
      <SuburbBenefits benefits={benefits} bookHref={innerSite.bookUrl} />
      <OtherServices otherServices={otherServices} />
      <WorkInAction workInAction={workInAction} />
      <SuburbClosing closing={closing} bookHref={innerSite.bookUrl} />
    </>
  );
}
