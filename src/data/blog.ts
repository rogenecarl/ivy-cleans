// Verbatim copy from docs/superpowers/reference/ivycleans-live/blog.html (listing
// cards, per-<article> parse) and blog-post.html / blog-post-content-dump.txt
// (single post body). Typos, mid-sentence excerpt cutoffs, and the "Breakfrom
// your routine" missing-space quirk are preserved exactly as on the live site.
//
// SPAM EXCLUSION: the live listing's first card ("Maintaining a Clean Gaming
// Environment: Vavada Casino's Approach to Digital Hygiene", /vavada-casino/)
// is injected spam and is intentionally NOT reproduced here — blogCards has 8
// entries, not 9.

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
  thumb?: { src: string; width: number; height: number; alt: string };
};

export const blogCards: BlogCard[] = [
  {
    title: "How to Clean Bathroom Walls",
    href: "/how-to-clean-bathroom-walls",
    excerpt:
      "Cleaning bathroom walls is an essential task to maintain cleanliness and hygiene in your bathroom. Whether you have ceramic tile walls, painted walls, or wallpapered",
    date: "September 11, 2023",
    comments: "No Comments",
    category: "House Cleaning",
    author: "aj",
    thumb: { src: "/images/image-21-300x200.webp", width: 300, height: 200, alt: "how to clean bathroom walls" },
  },
  {
    title: "How to Clean Cabinets Before Painting",
    href: "/how-to-clean-cabinets-before-painting",
    excerpt:
      "Cleaning cabinets before painting is an essential step in achieving a professional and long-lasting finish. Properly cleaning the cabinets ensures that the paint adheres properly,",
    date: "September 9, 2023",
    comments: "No Comments",
  },
  {
    title: "How to Clean Bathroom Countertops",
    href: "/how-to-clean-bathroom-countertops",
    excerpt:
      "Maintaining a clean bathroom is essential for hygiene and overall cleanliness. Cleaning bathroom countertops not only helps remove dirt and germs but also keeps the",
    date: "September 6, 2023",
    comments: "No Comments",
  },
  {
    title: "How to Clean Smoke Detectors: Essential Maintenance Tips for Home Safety",
    href: "/how-to-clean-smoke-detectors",
    excerpt:
      "How to Clean Smoke Detectors: Essential Maintenance Tips for Home Safety Cleaning your smoke detectors is crucial to maintaining home safety. Over time, dirt and",
    date: "January 31, 2024",
    comments: "No Comments",
    category: "House Cleaning",
    author: "aj",
    thumb: {
      src: "/images/how-to-clean-smoke-detectors-1-300x171.jpg",
      width: 300,
      height: 171,
      alt: "how to clean smoke detectors",
    },
  },
  {
    title: "What To Do in St. Louis Park, MN: Top Attractions and Activities",
    href: "/what-to-do-in-st-louis-park-mn",
    excerpt:
      "St. Louis Park, MN is a hidden treasure full of fascinating attractions that cater to different tastes and interests. Breakfrom your routine with serene walks",
    date: "January 31, 2024",
    comments: "No Comments",
    category: "Uncategorized",
    author: "aj",
    thumb: {
      src: "/images/what-to-do-in-st-louis-park-mn-300x171.jpg",
      width: 300,
      height: 171,
      alt: "what to do in st louis park mn. ST. LOUIS PARK CLEANING SERVICES",
    },
  },
  {
    title: "The Ultimate Guide to Basement Cleaning Services Near You",
    href: "/guide-to-basement-cleaning-services-near-you",
    excerpt:
      "The Ultimate Guide to Basement Cleaning Services Near You In the land of ten thousand lakes, where the winters are as long as the memories",
    date: "March 2, 2024",
    comments: "1 Comment",
  },
  {
    title: "Cleaning & Co: Redefining Cleaning Standards",
    href: "/cleaning-co-redefining-cleaning-standards",
    excerpt:
      "The Ultimate Guide to Cleaning & Co: Redefining Cleaning Standards In an era where cleanliness transcends mere aesthetics to embody a core component of well-being",
    date: "March 2, 2024",
    comments: "No Comments",
  },
  {
    title: "When You Hire A Company For Deep Cleaning Your House, Do You Tip The Workers Too?",
    href: "/when-you-hire-a-company-for-deep-cleaning-your-house-do-you-tip-the-workers-too",
    excerpt:
      "When hiring a professional company for deep cleaning your house, it’s natural to wonder about the etiquette of tipping the workers. Deep cleaning involves a",
    date: "March 18, 2024",
    comments: "1 Comment",
    category: "Deep Cleaning",
    author: "aj",
    thumb: {
      src: "/images/image-2-300x200.png",
      width: 300,
      height: 200,
      alt: "tip in deep cleaning your house, cleaning checklist",
    },
  },
];

/*
 * The single post that used to live here (its copy, its blocks and its
 * ArticleBlock type) now sits in src/data/posts/, one module per slug, so
 * every post the site links to renders through the same template instead of
 * one hardcoded route. See src/data/posts/index.ts.
 */
