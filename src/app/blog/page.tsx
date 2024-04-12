import { Button } from "@/components/ui/button";
import { fetchAllBlogs } from "@/lib/prisma/blog";
import Link from "next/link";
import DeleteBlogButton from "./_components/delete-blog";

export default async function Page() {
  const blogs = await fetchAllBlogs();
  return (
    <>
      <div className="mt">
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col gap-2 md:flex-row md:gap-4 md:items-center">
            <h1 className="text-3xl font-bold">Blogs</h1>{" "}
            <p className="px-2 py-1 border-none rounded-lg bg-green-400/70">
              {blogs.data?.length} blogs
            </p>
          </div>

          <div>
            <Button variant="default">Add new blog</Button>
          </div>
        </div>
      </div>
      <hr className="px-4 my-8 text-gray-600" />

      <div>
        {!blogs.success && (
          <div className="mx-auto">
            <p className="text-center text-red-500">Something went wrong</p>
            <p>{blogs.errors as string}</p>
          </div>
        )}

        {blogs.data?.map((blog) => {
          const formattedDate = new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }).format(blog.date);
          return (
            <div
              className="flex flex-col gap-2 p-4 transition-all duration-300 ease-in-out border-b md:justify-between md:flex-row md:gap-0 hover:bg-slate-100 last:border-none"
              key={blog.id}
            >
              <div>
                <p className="font-semibold">{blog.title}</p>
                <div className="flex gap-2 md:flex-row">
                  <time>{formattedDate}</time>•
                  <p className="capitalize">{blog.platform}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                <Link href={blog.url} target="_blank" rel="noopener noreferrer">
                  <p className="text-primary underline-offset-4 hover:underline">
                    Visit
                  </p>
                </Link>
                <DeleteBlogButton id={blog.id} />
                <Link
                  href={`/blog/manage/${blog.slug}`}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2"
                >
                  Edit
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
