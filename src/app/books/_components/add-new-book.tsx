"use client";

import React, { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "../../../components/ui/input";
import Multiselect from "../../../components/ui/select-create";
import { toast } from "sonner";
import { LuX } from "react-icons/lu";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import FormField from "../../../components/common/form-field";
import { Button } from "@/components/ui/button";
import { addNewAuthor } from "@/lib/prisma/books/authors";
import { Book } from "@/lib/zod/Books";
import addNewBook from "../_actions/add-new-book";

export type FormState = {
    success: boolean | undefined;
    errors: Record<keyof Book, string> | undefined;
    fieldValues: Book;
};

export default function AddNewBook({ genres, authors, book }: any) {
    const { pending } = useFormStatus();
    const formRef = useRef<HTMLFormElement>(null);

    const [formState, formAction] = useFormState(addNewBook, {
        success: undefined,
        errors: undefined,
        fieldValues: {
            name: book?.name || "",
            authors: book?.authors || "",
            genre: book?.genre || "",
            status: book?.status || "",
            own: book?.own || "",
            language: book?.language || "",
            review: book?.review || "",
            date: book?.date || Date.now()
        },
    });

    useEffect(() => {
        if (formState?.success) {
            toast.success("A new book has been added successfully.");
        } else if (formState?.errors) {
            toast.error(formState?.errors);
        }
    }, [formState]);

    return (
        <>
            <form
                ref={formRef}
                action={formAction}
                className="flex flex-col gap-4 my-4"
            >
                {/* name */}
                <FormField name={"Book Name"} error={formState?.errors?.name}>
                    <Input
                        id="name"
                        placeholder="name"
                        type="text"
                        name="name"
                        defaultValue={formState?.fieldValues?.name || ""}
                        className={`${formState?.errors?.name
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                            }`}
                    />
                </FormField>

                {/* Authors */}
                <FormField name={"Author(s)"} error={formState?.errors?.authors}>
                    <Multiselect
                        placeholder="Select one more authors, create if not present"
                        options={authors}
                        isMulti
                        onCreateOption={addNewAuthor}
                        name="authors"
                        values={formState?.fieldValues?.authors}
                    />
                </FormField>

                {/* Review */}
                <FormField name={"Book review"} error={formState?.errors?.description}>
                    <Textarea
                        id="Description"
                        placeholder="Description"
                        name="review"
                        rows={4}
                        defaultValue={formState?.fieldValues?.review}
                        className={`${formState?.errors?.description
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                            }`}
                    />
                </FormField>

                {/* Date */}
                <FormField name={"Date date"} error={formState?.errors?.date}>
                    <Input
                        type="date"
                        name="date"
                        id="date"
                        defaultValue={
                            formState?.fieldValues?.date
                                ? format(new Date(formState?.fieldValues.date), "yyyy-MM-dd")
                                : format(new Date(), "yyyy-MM-dd")
                        }
                        className={`${formState?.errors?.date
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                            }`}
                    />
                </FormField>

                {/* Own */}
                <FormField name={"How do you own it?"} error={formState?.errors?.platform}>
                    <Select
                        name="own"
                        defaultValue={
                            BOOK_OWN_TYPE.filter(
                                (o) => o.value === formState?.fieldValues?.own
                            )[0]?.value || BOOK_OWN_TYPE[0].value
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="How do you own it?" />
                        </SelectTrigger>
                        <SelectContent
                            id={"own"}
                            className={`${formState?.errors?.own
                                ? "border-red-500 focus-visible:ring-red-500"
                                : ""
                                }`}
                        >
                            {BOOK_OWN_TYPE.map((o) => (
                                <SelectItem value={o.value} key={o.value}>
                                    {o.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>

                {/* Language */}
                <FormField name={"Language"} error={formState?.errors?.language}>
                    <Select
                        name="language"
                        defaultValue="Marathi"
                    // defaultValue={formState?.fieldValues?.language}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Language" />
                        </SelectTrigger>
                        <SelectContent
                            id={"Language"}
                            className={`${formState?.errors?.language
                                ? "border-red-500 focus-visible:ring-red-500"
                                : ""
                                }`}
                        >
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Marathi">Marathi</SelectItem>
                            <SelectItem value="Hindi">Hindi</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </FormField>

                {/* Category */}
                <FormField name={"Genre"} error={formState?.errors?.categoryId}>
                    <Multiselect
                        placeholder="Select genre"
                        options={genres}
                        name="genre"
                        values={formState?.fieldValues?.category}
                    />
                </FormField>

                {/* date */}
                <FormField name={"Have you date it?"} error={formState?.errors?.date}>
                    <Select
                        name="status"
                        defaultValue="no"
                    // defaultValue={formState?.fieldValues?.status}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Reading status" />
                        </SelectTrigger>
                        <SelectContent
                            id={"Language"}
                            className={`${formState?.errors?.status
                                ? "border-red-500 focus-visible:ring-red-500"
                                : ""
                                }`}
                        >
                            <SelectItem value="reading">Currently reading</SelectItem>
                            <SelectItem value="read">Read</SelectItem>
                            <SelectItem value="future">Plan to read</SelectItem>
                            <SelectItem value="no">Haven&apos;t read yet</SelectItem>
                        </SelectContent>
                    </Select>
                </FormField>

                <RenderSubmitButton pending={pending} />
            </form>
        </>
    );
}

interface RenderSubmitButtonProps {
    pending: boolean;
}

const RenderSubmitButton: React.FC<RenderSubmitButtonProps> = ({ pending }) => {
    return (
        <Button type="submit" disabled={pending}>
            {pending ? "Adding..." : "Add a new blog"}
        </Button>
    );
};

const BOOK_OWN_TYPE = [
    { value: "physical", label: "Physical book" },
    { value: "digital", label: "Have digital copy" },
    { value: "no", label: "Don't own the book" }
]