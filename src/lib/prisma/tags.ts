"use server"

import prisma from "./prisma";
import kebabCase from "lodash.kebabcase"

export async function addTag(label: string) {

    const value = kebabCase(label)
    return prisma.tags.create({
        data: {
            value,
            label
        }
    })
}

export async function findTag(value: string) {
    return prisma.tags.findFirst({
        where: {
            value
        }
    })
}

export async function fetchTags() {
    return prisma.tags.findMany({})
}