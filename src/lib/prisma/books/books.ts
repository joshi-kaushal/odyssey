"use server"

import { formatISO, parseISO } from "date-fns"
import prisma from "../blog/prisma"

export default async function addNewBookToDB(data: any) {
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