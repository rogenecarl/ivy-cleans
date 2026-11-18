import type { Metadata } from "next";
import { canonicalFor } from "@/site/data/seo";
import { cache } from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Breadcrumbs from "@/site/components/inner/Breadcrumbs";
import { breadcrumbs } from "@/site/data/breadcrumbs";
import { cityFromParams } from "@/site/city-param";
import { cityKeyOf } from "@/server/content/interpolate";
import { postBySlug } from "@/server/blog/store";
import { postDate } from "@/server/blog/format";
import { PostShell } from "@/site/components/blog/PostShell";
import HtmlBody from "@/site/components/blog/HtmlBody";
import { cleanArticleHtml, postOwnHosts } from "@/server/blog/html";
import { postAreaLinks } from "@/site/data/blog";

// Blog-tool posts live under /blog/<slug>; the file-based posts keep their root slugs. Rendered on demand: a post
// published after the last deploy must not 404 until the next one.
export const dynamicParams = true;

type Params = Promise<{ city: string; slug: string }>;

// metadata and page both need the post: one query per render, not two
const loadPost = cache((cityKey: string, slug: string) => postBySlug(cityKey, slug).catch(() => null));

async function resolvePost(params: Params) {
  const c = await cityFromParams(params);
  const { slug } = await params;
  const post = await loadPost(cityKeyOf(c), slug);
  if (post === null) notFound();
  return { c, post };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { c, post } = await resolvePost(params);
  return {
    title: post.metaTitle ?? `${post.title} - Ivy Cleans`,
    description: post.metaDescription ?? post.excerpt,
    ...canonicalFor(c, `/blog/${post.slug}`),
  };
}

export default async function ToolPostPage({ params }: { params: Params }) {
  const { c, post } = await resolvePost(params);
  // posts saved before their host was known keep absolute links to it: re-clean them for the host serving them now
  const html = cleanArticleHtml(post.html, post.title, c, postOwnHosts((await headers()).get("host"), process.env.VERCEL_PROJECT_PRODUCTION_URL));
  const areas = postAreaLinks(c, post.slug);
  return (
    <>
      <Breadcrumbs trail={breadcrumbs(c, { kind: "post", title: post.title, slug: post.slug })} />
      <PostShell
        h1={post.title}
        heroImage={
          post.imageUrl ? { src: post.imageUrl, width: 870, height: 382, alt: post.imageAlt ?? post.title, external: true } : undefined
        }
        info={{ date: postDate(post.publishedAt), commentCount: "No Comments" }}
        authorBox={{ name: "Ivy Cleans", avatar: "/images/avatar-aj.jpg", href: "" }}
      >
        <HtmlBody html={html} />
        {areas.length > 0 && (
          <p className="mb-[2rem] leading-[1.5]">
            Ivy Cleans cleans homes across {c.city} and nearby, including{" "}
            {areas.map((a, i) => (
              <span key={a.href}>
                <a href={a.href} className="text-[#cc3366] no-underline">
                  {a.name}
                </a>
                {i < areas.length - 2 ? ", " : i === areas.length - 2 ? " and " : ""}
              </span>
            ))}
            .
          </p>
        )}
      </PostShell>
    </>
  );
}
