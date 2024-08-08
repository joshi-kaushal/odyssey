"use client"

import { useEffect, useRef } from "react";
import { Genre } from "@/lib/zod/GenreSchema";
import FormField from "@/app/blog/_components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Multiselect from "@/components/ui/select-create";
import { Textarea } from "@/components/ui/textarea";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import { addNewGenre } from "../_actions/add-new-genre";

export default function AddBookGenre({ genres }: { genres: Genre[] }) {
	const formRef = useRef<HTMLFormElement>(null)
	const genreOptions = genres.map(genre => {
		return { id: genre.id!, value: genre.id!, label: genre.genre }
	})

	const { pending } = useFormStatus();
	const [formState, formAction] = useFormState(addNewGenre, {
		success: undefined,
		errors: undefined,
		fieldValues: {
			genre: "",
			description: "",
			parent: ""
		}
	})

	const handleOnSelectedParentChange = (value: any) => {
		formState.fieldValues.parent = value
	}

	useEffect(() => {
		if (formState.success) {
			toast.success("A new genre has been added successfully.");
		} else if (formState.errors) {
			toast.error(formState.errors);
		}
	}, [formState]);

	return (
		<section className="bg-neutral-100 p-4 rounded-xl">
			<h2 className="text-lg font-semibold">Add new genre</h2>

			<form
				ref={formRef}
				action={formAction}
				className="flex flex-col gap-4 my-4"
			>
				<FormField name="Genre" error={formState?.errors?.genre}>
					<Input
						id="genre"
						placeholder="Genre name"
						type="text"
						name="genre"
						className={`${formState?.errors?.title
							? "border-red-500 focus-visible:ring-red-500"
							: ""
							}`}
					/>
				</FormField>

				<FormField name="Description" error={formState?.errors?.description}>
					<Textarea
						id="description"
						placeholder="One line about the genre"
						rows={1}
						name="description"
						className={`${formState?.errors?.description
							? "border-red-500 focus-visible:ring-red-500"
							: ""
							}`}
					></Textarea>
				</FormField>

				<FormField name="Parent category" error={formState?.error?.parent}>
					<Multiselect
						placeholder="Select parent category"
						options={genreOptions}
						name="parent"
						values={formState?.fieldValues?.parent}
						onOptionChange={handleOnSelectedParentChange}
					/>
				</FormField>

				<RenderSubmitButton pending={pending} />
			</form>
		</section>
	)
}

interface RenderSubmitButtonProps {
	pending: boolean;
}

const RenderSubmitButton: React.FC<RenderSubmitButtonProps> = ({ pending }) => {
	return (
		<Button type="submit" disabled={pending}>
			{pending ? "Adding..." : "Add a new genre"}
		</Button>
	);
};