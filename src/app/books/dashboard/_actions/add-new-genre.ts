"use server"

import addNewGenreToDB from "@/lib/prisma/books/genre";
import prisma from "@/lib/prisma/prisma";
import { Genre, GenreSchema } from "@/lib/zod/GenreSchema";
import { ZodError } from "zod";

export type FormState = {
    success: boolean | undefined;
    errors: Record<keyof Genre, string> | undefined;
    fieldValues: Genre;
};

export async function addNewGenre(prevState: any,
    formData: any
): Promise<any> {
    console.log(formData)
    const genre = formData.get("genre") as string;
    const description = formData.get("description") as string;
    const parent = formData.get("parent") as string || "";

    if (!genre) {
        return {
            success: false,
            errors: "Genre name cannot be blank",
            data: undefined
        }
    }

    const isGenreExists = await prisma.genre.findFirst({
        where: {
            genre: genre
        }
    })


    if (isGenreExists) {
        return {
            success: false,
            errors: "Genre name already exists",
            data: undefined
        }
    }

    try {
        GenreSchema.parse({
            genre, description, parent
        })

        try {
            const response = await addNewGenreToDB({
                genre, description, parent
            })

            return {
                success: true, errors: undefined, fieldValues: response
            }

        } catch (error: any) {
            return {
                success: false, error: error.error!, data: undefined
            };
        }
    } catch (error: any) {
        const zodError = error as ZodError;
        const errors = zodError.flatten().fieldErrors
        console.log("zoderrors", errors)
        return {
            success: false,
            errors: {
                id: "",
                title: errors["genre"]?.[0] ?? "",
                description: errors["description"]?.[0] ?? "",
                parent: errors["parent"]?.[0] ?? ""
            },
            fieldValues: {
                genre,
                description,
                parent
            }
        }
    }
}
