import { fetchAllGenres } from "@/lib/prisma/books/genre";
import AddNewBook from "../_components/add-new-book";
import { fetchAllAuthors } from "@/lib/prisma/books/authors";
import { getBookByName } from "../_actions/add-new-genre";

interface BooksManagePageProps {
	params: { edit: string };
	searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function Page({
	params,
	searchParams,
}: BooksManagePageProps) {

	const book = searchParams?.edit && typeof searchParams.edit === "string"
		? await getBookByName(searchParams.edit)
		: undefined;

	const genres = await fetchAllGenres();
	const authors = await fetchAllAuthors();

	return (
		<main className="mt-16 flex flex-col gap-4 lg:w-6/12 mx-auto">
			<h1 className="text-3xl font-bold font-serif">Add a new book 📚</h1>
			<AddNewBook genres={genres.data} authors={authors.data} book={book?.data} />
		</main>
	);
}
