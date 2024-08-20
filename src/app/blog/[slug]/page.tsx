import { getBlogBySlug } from "@/lib/prisma/blog/blog";
import { NextPage } from "next";
import Image from "next/image";
import Link from "next/link";

interface BlogSlugPageProps {
  params: { slug: string };
}
export default async function Page({ params }: BlogSlugPageProps) {
  const data = await getBlogBySlug(params.slug);
  if (!data?.data || !data.success) {
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
  }).format(data?.data.date);

  return (
    <section>
      <h1>{data?.data.title}</h1>
      <p>
        Published on <time>{formattedDate}</time>
      </p>
      <p>Category: {data?.data.category?.label}</p>
      <div>
        <p>Tags: </p>
        {data?.data.tags?.map((tag: any) => (
          <p key={tag.id}>{tag.label}</p>
        ))}
      </div>

      <Image src={data?.data.thumbnail} alt={data?.data.title} width={1080} height={729} />
    </section>
  );
}
