import { z } from "zod";

export const GenreSchema = z.object({
    id: z.string().optional(),
    genre: z.string().min(1, "Genre name should not be null"),
    description: z.string().min(3, "Genre description should not be less than 3 characters"),
    parent: z.string().optional(),
    parentId: z.string().optional()
    // books: z.array(z.string()).optional()
})

export type Genre = z.infer<typeof GenreSchema>;