import { getBlogBySlug } from "@/lib/prisma/blog";
import { notFound } from "next/navigation";
import AddBlog from "../_components/add-blog";
import { fetchCategories } from "@/lib/prisma/category";
import { fetchTags } from "@/lib/prisma/tags";

interface BlogSManagePageProps {
  params: { manage: string[] };
}

export default async function Page({ params }: BlogSManagePageProps) {
  if (params.manage.length > 2) {
    return notFound();
  }
  const blog = await getBlogBySlug(params.manage[1]);

  if (!blog.success || !blog.data) {
    return notFound();
  }

  const tags = await fetchTags();
  const categories = await fetchCategories();
  return (
    <main className="flex flex-col gap-4 w-6/12 mx-auto justify-center min-h-screen">
      <AddBlog tags={tags} categories={categories} blog={blog.data} />
    </main>
  );
}
