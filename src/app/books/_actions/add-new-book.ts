"use server";

import { BookSchema } from "@/lib/zod/Books";
import { getBookByName } from "./add-new-genre";
import { ZodError } from "zod";
import { addNewBookToDB } from "@/lib/prisma/books/books";
import prisma from "@/lib/prisma/blog/prisma";

export default async function addNewBook(prevState: any, formData: any): Promise<any> {
    const name = formData.get("name") as string || ""
    const authors = formData.getAll("authors") as string[]
    const genre = formData.get("genre") as string || ""
    const status = formData.get("status") as string || ""
    const own = formData.get("own") as string || ""
    const language = formData.get("language") as string || ""
    const review = formData.get("review") as string || ""
    const date = formData.get("date") as Date

    if (!name || !authors || !genre || !status || !own || !language || !date) {
        return {
            success: false,
            errors: "All fields except review are mandatory",
            data: undefined
        }
    }

    const doesBookAlreadyExist = await getBookByName(name)

    try {
        BookSchema.parse({
            name,
            authors,
            review,
            genre,
            language,
            own,
            status,
            date
        })

        try {
            // If blog already exists, we want to edit it.
            if (doesBookAlreadyExist?.success && !doesBookAlreadyExist?.errors) {
                // deleteBookByName(name)
            }

            const response = await addNewBookToDB({
                name,
                authors,
                review,
                genre,
                language,
                own,
                status,
                date
            })

            return {
                success: true,
                errors: undefined,
                fieldValues: response,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.error!,
            };
        }
    } catch (err) {
        const zodError = err as ZodError;
        const errors = zodError.flatten().fieldErrors;

        return {
            success: false,
            errors: {
                id: "",
                name: errors["name"]?.[0] ?? "",
                status: errors["status"]?.[0] ?? "",
                orn: errors["own "]?.[0] ?? "",
                date: errors["date"]?.[0] ?? "",
                authors: errors["authors"]?.[0] ?? "",
                language: errors["language"]?.[0] ?? "",
                genre: errors["genre"]?.[0] ?? "",
                review: errors["review"]?.[0] ?? "",
            }
        }
    }
}