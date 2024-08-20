import { fetchAllGenres } from "@/lib/prisma/books/genre";
import AddBookGenre from "../_components/add-book-genre";

export default async function BooksDashboardPage() {
    const genres = await fetchAllGenres();

    return (
        <div className="mt w-11/12 md:w-8/12 mx-auto">
            <div className="flex items-center justify-between p-4">
                <div className="flex flex-col gap-2 md:flex-row md:gap-4 md:items-center">
                    <h1 className="text-3xl font-bold">Books</h1>{" "}
                    <p className="px-2 py-1 border-none rounded-lg bg-green-400/70">
                        123 books
                    </p>
                </div>
            </div>

            <AddBookGenre genres={genres.data} />
        </div>
    )
}