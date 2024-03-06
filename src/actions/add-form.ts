"use server"

import uploadImage from "@/lib/cloudinary/upload-image"
import { addNewBlogToDB } from "@/lib/prisma/blog"
import { BlogFields, BlogSchema } from "@/lib/zod/BlogSchema"
import { ZodError } from "zod"

export type FormState = {
  success: boolean | undefined,
  errors: Record<keyof BlogFields, string> | undefined,
  fieldValues: BlogFields
}

export default async function addNewBlog(
  prevState: any,
  formData: any
): Promise<any> {

  const title = formData.get('title') as string
  const slug = formData.get('slug') as string
  const description = formData.get("description") as string
  const url = formData.get("url") as string
  const date = formData.get("date") as Date
  const platform = formData.get("platform") as string
  const language = formData.get("language") as string
  const category = formData.get("category") as string
  const tags = formData.getAll("tags") as string[]
  const thumbnail = formData.get("thumbnail") as string
  
  const thumbnailURL = await uploadImage(thumbnail)
console.log(date)
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
    })

    try {
      const response = await addNewBlogToDB({title, slug, description, language, date, url, platform, category, tags, thumbnail: thumbnailURL})
      console.log("successfull", response)
    } catch (error:any) {
      return {
        success: false,
        error: error.error!
      }
    }
    return {
      success: true,
      errors: undefined,
      fieldValues: {
        title: "",
        slug: "",
        description: "",
        date: date,
        url: "",
        category: "",
        platform: "",
        tags: [],
        language: "",
        thumbnail: ""
      }
    }
  } catch (err) {
    const zodError = err as ZodError
    const errors = zodError.flatten().fieldErrors
    console.log(errors)
    return {
      success: false,
      errors: {
        id: "",
        title: errors["title"]?.[0] ?? "",
        slug: errors["slug"]?.[0] ?? "",
        description : errors["description"]?.[0] ?? "",
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
        thumbnail:""
      }
    }
  }

  // const result = BlogSchema.safeParse(parsedBlog)
  // if (!result.success) {
  //   let errorMessage = ""
  //   result.error.issues.forEach((issue: any) => {
  //     errorMessage += `${errorMessage} ${issue.path} : ${issue.message} . `
  //   })
  //   console.log(errorMessage)
  //   return { error: errorMessage }
  // }
  
  // try {
  //   const res = await addNewBlogToDB(result.data)
  //   return { result: res}
  // } catch (error) {
  //   console.error(error)
  //   return { error }
  // } finally {
  //   revalidatePath("/")
  // }
}