"use server"

import kebabCase from "lodash.kebabcase"
import prisma from "@/lib/prisma/prisma";

export async function addNewAuthor(label: string) {
    const value = kebabCase(label)

    return prisma.author.create({
        data: {
            value,
            label,
        },
    });
}

export async function fetchAllAuthors() {
    try {
        const res = await prisma.author.findMany({})
        return {
            success: true,
            errors: undefined,
            data: res
        }
    } catch (error) {
        return { success: false, errors: error, data: undefined }
    }
}