import AddBlog from "@/components/blog/add-blog";
import { fetchCategories } from "@/lib/prisma/category";
import { fetchTags } from "@/lib/prisma/tags";
export default async function Home() {
  const tags = await fetchTags();
  const categories = await fetchCategories();

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <h1>Odyssey</h1>
      <AddBlog tags={tags} categories={categories} />
    </main>
  );
}
