"use client";

import { Button } from "@/components/ui/button";
import { DeleteBlogByName } from "@/lib/prisma/books/books";
import { toast } from "sonner";

export default function DeleteBookButton({ name }: { name: string }) {
    const deleteBook = async (name: string) => {
        const shouldDelete = confirm("Do you really want to delete this book?");

        if (shouldDelete) {
            const deleteBook = await DeleteBlogByName(name);

            if (deleteBook?.success) {
                toast.success("Book is deleted successfully!");
                window?.location?.reload()
            } else {
                toast.error("Something went wrong while deleting this book.");
            }
        }
    };

    return (
        <Button size="sm" variant="destructive" onClick={() => deleteBook(name)}>
            Delete
        </Button>
    );
}
