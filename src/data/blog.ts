export const blogMeta: { title: string; description?: string } = {
  title: "Blog - Ivy Cleans",
  description: "BLOGS Ivy Cleans news",
};

export type BlogCard = {
  title: string;
  href: string;
  excerpt: string;
  date: string;
  comments: string;
  category?: string;
  author?: string;
  thumb?: { src: string; width: number; height: number; alt: string; external?: true };
};
