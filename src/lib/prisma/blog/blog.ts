"use server";

import prisma from "@/lib/prisma/prisma";
import { formatISO, parseISO } from "date-fns";
import { findCategoryById } from "./category";
import { findTagsById } from "./tags";

export async function checkIfBlogAlreadyExists(title: string, slug: string, url: string): Promise<boolean> {
  const blog = await prisma.blog.findFirst({
    where: {
      OR: [
        { title },
        { slug },
        { url },
      ],
    },
  });
  return blog !== null;
}

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

export async function getBlogBySlug(slug: string) {
  if (!slug) return undefined;

  try {
    const blog = await prisma.blog.findFirst({
      where: { slug: slug },
    });

    if (blog) {
      const category = await findCategoryById(blog.categoryId);
      const tags = await findTagsById(blog.tagId);
      return {
        success: true,
        errors: undefined,
        data: { ...blog, category, tags },
      };
    } else {
      return {
        success: false,
        errors: "No blog matches the provided slug",
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

export async function deleteBlogByID(id: string) {
  try {
    const deleted = await prisma.blog.delete({
      where: {
        id: id,
      },
    });

    if (deleted.id === id) {
      return {
        success: true,
        errors: undefined,
        data: "Blog deleted successfully!",
      };
    }
  } catch (error) {
    return {
      success: false,
      errors: `Something went wrong while deleting blog with ID ${id}`,
      data: "Failed to delete blog. Mostly it's already deleted.",
    };
  }
}

export async function deleteBlogByURL(url: string) {
  try {
    const deleted = await prisma.blog.delete({
      where: {
        url
      },
    });

    if (deleted.url === url) {
      return {
        success: true,
        errors: undefined,
        data: "Blog deleted successfully!",
      };
    }
  } catch (error) {
    return {
      success: false,
      errors: `Something went wrong while deleting blog with URL ${url}`,
      data: "Failed to delete blog. Mostly it's already deleted.",
    };
  }
}

export async function updateExistingBlogInDB(data: any) {
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

    const res = await prisma.blog.update({
      where: { url: data.url },
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
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