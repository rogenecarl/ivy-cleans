import type { Metadata } from "next";
import { postMeta, postArticle } from "@/data/blog";
import PostArticle from "@/components/blog/PostArticle";
import CommentFormDisplay from "@/components/blog/CommentFormDisplay";

export const metadata: Metadata = {
  title: postMeta.title,
  description: postMeta.description,
};

export default function DeepCleaningPostPage() {
  return (
    <>
      <PostArticle
        h1={postArticle.h1}
        heroImage={postArticle.heroImage}
        meta={postArticle.meta}
        blocks={postArticle.blocks}
      />
      <CommentFormDisplay />
    </>
  );
}
