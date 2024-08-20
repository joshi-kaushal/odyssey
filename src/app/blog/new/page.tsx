import { getBlogBySlug } from "@/lib/prisma/blog/blog";
import AddBlog from "@/app/blog/_components/add-blog";
import { fetchCategories } from "@/lib/prisma/blog/category";
import { fetchTags } from "@/lib/prisma/blog/tags";
import { ManagePageProps } from "@/types/common";

export default async function Page({
  params,
  searchParams,
}: ManagePageProps) {
  const blog = searchParams?.edit && typeof searchParams.edit === "string"
    ? await getBlogBySlug(searchParams.edit)
    : undefined;
  const tags = await fetchTags();
  const categories = await fetchCategories();

  return (
    <main className="mt-16 flex flex-col gap-4 lg:w-6/12 mx-auto">
      <h1 className="text-3xl font-bold font-serif">Add a new blog ✍️</h1>
      <AddBlog tags={tags} categories={categories} blog={blog?.data} />
    </main>
  );
}
