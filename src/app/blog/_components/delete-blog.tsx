"use client";

import { Button } from "@/components/ui/button";
import { deleteBlogByID } from "@/lib/prisma/blog/blog";
import { toast } from "sonner";

export default function DeleteBlogButton({ id }: { id: string }) {
  const deleteBlog = async (id: string) => {
    const shouldDelete = confirm("Do you really want to delete this blog?");

    if (shouldDelete) {
      const deleteBlog = await deleteBlogByID(id);

      if (deleteBlog?.success) {
        toast.success("Blog is deleted successfully!");
      } else {
        toast.error("Something went wrong while deleting this blog.");
      }
    }
  };

  return (
    <Button size="sm" variant="destructive" onClick={() => deleteBlog(id)}>
      Delete
    </Button>
  );
}
