import { z } from "zod";
const ObjectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const BookSchema = z.object({
    id: ObjectId.optional(),
    name: z.string(),
    review: z.string(),
    authors: z.array(z.string()),
    genre: z.string(),
    status: z.string(),
    own: z.string(),
    date: z.coerce.date(),
});

export const GenreSchema = z.object({
    id: ObjectId.optional(),
    value: z.string().min(1, "Genre name should not be null"),
    label: z.string().min(1, "Genre name should not be null"),
    description: z.string().min(3, "Genre description should not be less than 3 characters"),
    parent: z.string().optional(),
    parentId: z.string().optional(),
    // books: z.array(BookSchema),
})

export const AuthorSchema = z.object({
    id: ObjectId.optional(),
    value: z.string(),
    label: z.string(),
    bookId: z.array(ObjectId),
});

export type Genre = z.infer<typeof GenreSchema>;
export type Book = z.infer<typeof BookSchema>;
export type Author = z.infer<typeof AuthorSchema>;
