"use server"

import { formatISO, parseISO } from "date-fns"
import prisma from "../blog/prisma"

export async function addNewBookToDB(data: any) {
	try {
		const genre = await prisma.genre.findFirst({
			where: { value: data.genre }
		})

		const authors = await prisma.author.findMany({
			where: {
				value: {
					in: data.authors
				}
			},
			select: {
				id: true,
			},
		})
		const authorsIDs = authors.map(author => author.id)

		const date = formatISO(parseISO(data.date));
		const response = await prisma.book.create({
			data: {
				name: data.name,
				review: data.review,
				date: date,
				own: data.own,
				status: data.status,
				authors: {
					connect: authorsIDs.map(id => ({ id }))
				},
				genre: {
					connect: { id: genre?.id }
				}
			}
		})
		return {
			success: true,
			errors: undefined,
			data: response
		}
	} catch (error) {
		return {
			success: false,
			error: error,
			data: undefined,
		};
	}
}

export async function fetchAllBooks() {
	try {
		const response = await prisma.book.findMany({
			include: {
				authors: {
					select: { label: true },
				},
				genre: {
					select: { label: true },
				},
			},
		})

		const books = response.map(book => ({
			...book,
			authors: book.authors.map(author => author.label),
			genre: book.genre.label,
		}));

		return {
			success: true,
			errors: undefined,
			data: books
		}
	} catch (error) {
		return {
			success: false,
			errors: `Prisma error while fetching all books: ${error}`,
			data: undefined
		}
	}

}

export async function DeleteBlogByName(name: string) {
	try {
		const book = await prisma.book.findFirst({ where: { name } })
		const deleted = await prisma.book.delete({
			where: { id: book?.id }
		})

		if (deleted.name === name) {
			return {
				success: true,
				errors: undefined,
				data: "Book deleted successfully!",
			};
		}
	} catch (error) {

	}
}