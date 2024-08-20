import { z } from "zod";

export const BlogSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title should not be null"),
  slug: z.string().refine((str) => !str.includes(" "), {
    message:
      "Slug must contain only one word (no spaces, dash and underscore allowed)",
  }),
  description: z
    .string()
    .max(200, "Description should not exceed 200 characters")
    .optional(),
  url: z
    .string()
    .refine(
      (value) =>
        /^(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9]{2,}\.)+[a-zA-Z]{2,}(?:\/[a-zA-Z0-9\-\._~%\+]*)*$/.test(
          value
        ),
      {
        message: "Please enter a valid URL",
      }
    ),
  date: z.coerce.date(),
  platform: z.string(),
  language: z.string(),
  category: z.string(),
  tags: z.array(z.string()).optional(),
  thumbnail: z.string().optional(),
});

export type BlogFields = z.infer<typeof BlogSchema>;