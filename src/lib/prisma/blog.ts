"use server";
import prisma from "./prisma";
import { formatISO, parseISO } from "date-fns";

export async function addNewBlogToDB(data: any) {
  try {
    const category = await prisma.category.findFirst({
      where: {
        value: data.category,
      },
    });

    const tags = await prisma.tags.findMany({
      where: {
        value: {
          in: data.tags,
        },
      },
      select: {
        id: true,
      },
    });
    const tagIDs = tags.map((tag) => tag.id);

    const date = formatISO(parseISO(data.date));

    const res = await prisma.blog.create({
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        url: data.url,
        date: date,
        language: data.language,
        platform: data.platform,
        category: {
          connect: {
            id: category?.id,
          },
        },
        thumbnail: data.thumbnail,
        tags: {
          connect: tagIDs.map((id) => ({ id })),
        },
      },
    });

    return {
      success: true,
      error: undefined,
      data: res,
    };
  } catch (error) {
    return {
      success: false,
      error: error,
      data: undefined,
    };
  }
}

export async function fetchAllBlogs() {
  try {
    const blogs = await prisma.blog.findMany({
      orderBy: [{ date: "desc" }],
    });

    return {
      success: true,
      errors: undefined,
      data: blogs,
    };
  } catch (error) {
    return {
      success: false,
      errors: error,
      data: undefined,
    };
  }
}
