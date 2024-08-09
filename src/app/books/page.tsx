import { fetchAllBooks } from "@/lib/prisma/books/books";
import Link from "next/link";
import DeleteBookButton from "./_components/delete-book";

export default async function Page() {
    const books = await fetchAllBooks();

    return (
        <>
            <div className="mt-16 w-11/12 md:w-8/12 mx-auto">
                <div className="flex items-center justify-between p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:gap-4 md:items-center">
                        <h1 className="text-3xl font-bold">Books</h1>{" "}
                        <p className="px-2 py-1 border-none rounded-lg bg-green-400/70">
                            {books.data?.length} books
                        </p>
                    </div>

                    <div>
                        <Link
                            href="/book/new"
                            className="hover:text-blue-500/80 transition-all text-blue-500 duration-300 ease-in-out font-semibold"
                        >
                            Add new book
                        </Link>
                    </div>
                </div>
            </div>
            <hr className="px-4 my-8 text-gray-600" />

            <div>
                {books.data?.map((book) => {
                    const authors = book.authors.join(", ")
                    return (
                        <div
                            className="flex flex-col gap-2 p-4 transition-all duration-300 mt w-11/12 md:w-8/12 mx-auto ease-in-out border-b md:justify-between md:flex-row md:gap-0 hover:bg-slate-100 last:border-none"
                            key={book.id}
                        >
                            <div>
                                <p className="font-bold text-lg">{book.name}</p>
                                <div className="flex gap-2 md:flex-row">
                                    <p className="font-semibold">{book.genre}</p>
                                    •
                                    <p>{authors}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 md:gap-4">
                                <DeleteBookButton name={book.name} />
                                <Link
                                    href={`/books/new?edit=${book.name}`}
                                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2"
                                >
                                    Edit
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
