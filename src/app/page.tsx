import AddBlog from "@/components/blog/add-blog";
import DragAndDrop from "@/components/ui/drag-n-drop";
import { fetchAllBlogs } from "@/lib/prisma/blog";
import { fetchCategories } from "@/lib/prisma/category";
import { fetchTags } from "@/lib/prisma/tags";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
export default async function Home() {
  const tags = await fetchTags();
  const categories = await fetchCategories();
  const blogs = await fetchAllBlogs();

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <h1>Odyssey</h1>
      <AddBlog tags={tags} categories={categories} />

      {blogs &&
        blogs.data &&
        blogs.data.map((blog) => {
          const date = new Date(blog.date);

          return (
            <Link href={blog.url} key={blog.id} className="hover:text-blue-800">
              {blog.title} |{" "}
              {blog.date.getDate() +
                "-" +
                blog.date.getMonth() +
                "-" +
                blog.date.getFullYear()}
            </Link>
          );
        })}
    </main>
  );
}
