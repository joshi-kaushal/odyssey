import { getBlogBySlug } from "@/lib/prisma/blog";
import { NextPage } from "next";
import Image from "next/image";
import Link from "next/link";

interface BlogSlugPageProps {
  params: { slug: string };
}
export default async function Page({ params }: BlogSlugPageProps) {
  const { errors, success, data: blog } = await getBlogBySlug(params.slug);
  if (!blog || !success) {
    return (
      <section className="flex items-center flex-col gap-4 justify-center min-h-screen">
        <h1 className="text-3xl font-bold text-red-500">
          The slug is incorrect.
        </h1>

        <Link
          href="/blog"
          className="text-blue-500 font-semibold text-lg hover:text-blue-500/80 transition-all duration-300 ease-in-out"
        >
          Go to blog
        </Link>
      </section>
    );
  }

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(blog.date);

  return (
    <section>
      <h1>{blog.title}</h1>
      <p>
        Published on <time>{formattedDate}</time>
      </p>
      <p>Category: {blog.category?.label}</p>
      <div>
        <p>Tags: </p>
        {blog.tags?.map((tag: any) => (
          <p key={tag.id}>{tag.label}</p>
        ))}
      </div>

      <Image src={blog.thumbnail} alt={blog.title} width={1080} height={729} />
    </section>
  );
}
