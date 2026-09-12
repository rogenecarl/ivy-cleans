import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/inner/Breadcrumbs";
import { breadcrumbs } from "@/data/breadcrumbs";
import { cityFromParams } from "@/content/city-param";
import { cityKeyOf } from "@/content/interpolate";
import { postBySlug } from "@/blog/store";
import { postDate } from "@/blog/format";
import { PostShell } from "@/components/blog/PostArticle";
import HtmlBody from "@/components/blog/HtmlBody";

// Blog-tool posts live under /blog/<slug>; the file-based posts keep their root slugs. Rendered on demand: a post
// published after the last deploy must not 404 until the next one.
export const dynamicParams = true;

type Params = Promise<{ city: string; slug: string }>;

async function resolvePost(params: Params) {
  const c = await cityFromParams(params);
  const { slug } = await params;
  const post = await postBySlug(cityKeyOf(c), slug).catch(() => null);
  if (post === null) notFound();
  return { c, post };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { post } = await resolvePost(params);
  return {
    title: post.metaTitle ?? `${post.title} - Ivy Cleans`,
    description: post.metaDescription ?? post.excerpt,
  };
}

export default async function ToolPostPage({ params }: { params: Params }) {
  const { c, post } = await resolvePost(params);
  return (
    <>
      <Breadcrumbs trail={breadcrumbs(c, { kind: "post", title: post.title, slug: post.slug, path: `/blog/${post.slug}` })} />
      <PostShell
        h1={post.title}
        heroImage={
          post.imageUrl ? { src: post.imageUrl, width: 870, height: 382, alt: post.imageAlt ?? post.title, external: true } : undefined
        }
        info={{ date: postDate(post.publishedAt), commentCount: "No Comments" }}
        authorBox={{ name: "Ivy Cleans", avatar: "/images/avatar-aj.jpg", href: "" }}
      >
        <HtmlBody html={post.html} />
      </PostShell>
    </>
  );
}
