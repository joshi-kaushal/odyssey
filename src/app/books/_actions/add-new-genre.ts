"use server"

import addNewGenreToDB from "@/lib/prisma/books/genre";
import prisma from "@/lib/prisma/blog/prisma";
import { Genre, GenreSchema } from "@/lib/zod/Books";
import { ZodError } from "zod";
import kebabCase from "lodash.kebabcase";

export type FormState = {
	success: boolean | undefined;
	errors: Record<keyof Genre, string> | undefined;
	fieldValues: Genre;
};

export async function addNewGenre(prevState: any,
	formData: any
): Promise<any> {
	const label = formData.get("genre") as string;
	const description = formData.get("description") as string;
	const parent = formData.get("parent") as string || "";
	const value = kebabCase(label);

	if (!label) {
		return {
			success: false,
			errors: "Genre name cannot be blank",
			data: undefined
		}
	}

	const isGenreExists = await prisma.genre.findFirst({
		where: { value }
	})


	if (isGenreExists) {
		return {
			success: false,
			errors: "Genre name already exists",
			data: undefined
		}
	}

	try {
		GenreSchema.parse({ value, label, description, parent })

		try {
			const response = await addNewGenreToDB({
				value, label, description, parent
			})

			return { success: true, errors: undefined, fieldValues: response }

		} catch (error: any) {
			return { success: false, error: error.error!, data: undefined };
		}
	} catch (error: any) {
		const zodError = error as ZodError;
		const errors = zodError.flatten().fieldErrors
		return {
			success: false,
			errors: {
				id: "",
				title: errors["genre"]?.[0] ?? "",
				description: errors["description"]?.[0] ?? "",
				parent: errors["parent"]?.[0] ?? ""
			},
			fieldValues: {
				genre: label,
				description,
				parent
			}
		}
	}
}

export async function fetchAllGenres() {
	try {
		const res = await prisma.genre.findMany({})
		return { success: true, errors: undefined, data: res }
	} catch (error) {
		return { success: true, errors: error, data: undefined }
	}
}

export async function getBookByName(name: string) {
	if (!name) return undefined;

	try {
		const book = await prisma.book.findFirst({
			where: { name: name }
		})

		if (book) {
			// TODO: Give information about author and genre

			return {
				success: true,
				errors: undefined,
				data: { book }
			}
		} else {
			return {
				success: false,
				errors: "No book matches the provided slug",
				data: undefined,
			};
		}
	} catch (error) {
		return {
			success: false,
			errors: error,
			data: undefined,
		};
	}
}
