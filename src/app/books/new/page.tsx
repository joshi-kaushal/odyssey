import { fetchAllGenres } from "@/lib/prisma/books/genre";
import AddNewBook from "../_components/add-new-book";
import { fetchAllAuthors } from "@/lib/prisma/books/authors";
import { getBookByName } from "../_actions/add-new-genre";

interface BooksSManagePageProps {
	params: { edit: string };
	searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function Page({
	params,
	searchParams,
}: BooksSManagePageProps) {

	const book = searchParams?.edit && typeof searchParams.edit === "string"
		? await getBookByName(searchParams.edit)
		: undefined;

	const genres = await fetchAllGenres();
	const authors = await fetchAllAuthors();

	return (
		<main className="flex flex-col gap-4 w-6/12 mx-auto justify-center min-h-screen">
			<AddNewBook genres={genres.data} authors={authors.data} book={book?.data} />
		</main>
	);
}
