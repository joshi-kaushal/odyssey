"use server";

import uploadImage from "@/lib/cloudinary/upload-image";
import { addNewBlogToDB, checkIfBlogAlreadyExists, deleteBlogByID, deleteBlogByURL } from "@/lib/prisma/blog";
import { BlogFields, BlogSchema } from "@/lib/zod/BlogSchema";
import { ZodError } from "zod";

export type FormState = {
  success: boolean | undefined;
  errors: Record<keyof BlogFields, string> | undefined;
  fieldValues: BlogFields;
};

export default async function addNewBlog(
  prevState: any,
  formData: any
): Promise<any> {
  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const url = formData.get("url") as string;
  const date = formData.get("date") as Date;
  const platform = formData.get("platform") as string;
  const language = formData.get("language") as string;
  const category = formData.get("category") as string;
  const tags = formData.getAll("tags") as string[];
  const thumbnail = formData.get("thumbnail") as File;
  let thumbnailURL = "";

   if(!title || !url || !date || !platform) {
    return {
      success: false,
      errors: "Title, URL, published date and platform are mandatory fields",
      data: undefined,
    };
  }
  
  if (thumbnail && thumbnail instanceof File) {
  thumbnailURL = await uploadImage(thumbnail, slug);
  } 
  
  const doesBlogAlreadyExist = await checkIfBlogAlreadyExists(title,slug,url)
  // if(doesBlogAlreadyExist) {
  //    return {
  //     success: false,
  //     errors: "Blog already exists in the database. You are using any of the title, slug or URL again.",
  //     data: undefined,
  //   };
  // }
  
  try {
    BlogSchema.parse({
      title,
      slug,
      description,
      date,
      url,
      platform,
      category,
      language,
      tags,
      thumbnail: thumbnailURL,
    });

    try {
      if(doesBlogAlreadyExist) {
        deleteBlogByURL(url)
      }
      const response = await addNewBlogToDB({
        title,
        slug,
        description,
        language,
        date,
        url,
        platform,
        category,
        tags,
        thumbnail: thumbnailURL,
      });

      return {
        success: true,
        errors: undefined,
        fieldValues: response,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.error!,
      };
    }
  } catch (err) {
    const zodError = err as ZodError;
    const errors = zodError.flatten().fieldErrors;
    return {
      success: false,
      errors: {
        id: "",
        title: errors["title"]?.[0] ?? "",
        slug: errors["slug"]?.[0] ?? "",
        description: errors["description"]?.[0] ?? "",
        date: errors["date"]?.[0] ?? "",
        url: errors["url"]?.[0] ?? "",
        category: errors["category"]?.[0] ?? "",
        platform: errors["platform"]?.[0] ?? "",
        tags: errors["tags"]?.[0] ?? "",
        thumbnail: errors["thumbnail"]?.[0] ?? "",
        language: errors["language"]?.[0] ?? "",
      },
      fieldValues: {
        title,
        slug,
        description,
        date,
        url,
        platform,
        category,
        language,
        tags,
        thumbnail: "",
      },
    };
  }
}
