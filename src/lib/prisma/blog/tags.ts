"use server";

import kebabCase from "lodash.kebabcase";
import prisma from "@/lib/prisma/prisma";
import { Tags } from "@/types/tags";

export async function addTag(label: string) {
  const value = kebabCase(label);
  return prisma.tags.create({
    data: {
      value,
      label,
    },
  });
}

export async function findTag(value: string) {
  return prisma.tags.findFirst({
    where: {
      value,
    },
  });
}

export async function fetchTags() {
  return prisma.tags.findMany({});
}

export async function findTagsById(tags: string[]) {
  const response: (Tags | null)[] = await Promise.all(
    tags.map(async (tagID) => {
      return await prisma.tags.findFirst({
        where: {
          id: tagID,
        },
      });
    })
  );
  return response;
}
