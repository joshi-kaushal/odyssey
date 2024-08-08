import { fetchAllBlogs, getBlogBySlug } from "@/lib/prisma/blog/blog";
import { notFound } from "next/navigation";
import AddBlog from "../_components/add-blog";
import { fetchCategories } from "@/lib/prisma/blog/category";
import { fetchTags } from "@/lib/prisma/blog/tags";

interface BlogSManagePageProps {
  params: { edit: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function Page({
  params,
  searchParams,
}: BlogSManagePageProps) {
  const blog = searchParams?.edit && typeof searchParams.edit === "string"
    ? await getBlogBySlug(searchParams.edit)
    : undefined;
  const tags = await fetchTags();
  const categories = await fetchCategories();
  return (
    <main className="flex flex-col gap-4 w-6/12 mx-auto justify-center min-h-screen">
      <AddBlog tags={tags} categories={categories} blog={blog?.data} />
    </main>
  );
}
