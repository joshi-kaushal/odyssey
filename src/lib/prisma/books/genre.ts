"use server"

import prisma from "@/lib/prisma/prisma"

export default async function addNewGenreToDB(data: any) {
    try {
        const res = await prisma.genre.create({
            data: {
                value: data.value,
                label: data.label,
                description: data.description,
                ...(data.parent && { parent: { connect: { id: data.parent } } })
            }
        })

        return {
            success: true,
            errors: undefined,
            data: res,
        };
    } catch (error) {
        return {
            success: false,
            errors: error,
            data: undefined,
        };
    }
}

export async function fetchAllGenres() {
    try {
        const res = await prisma.genre.findMany({})
        return {
            success: true,
            errors: undefined,
            data: res
        }
    } catch (error) {
        return { success: false, errors: error, data: undefined }
    }
}