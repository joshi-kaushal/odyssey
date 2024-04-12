"use client";

import React, { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "../../../components/ui/input";
import { DatePicker } from "../../../components/ui/date-picker";
import { Button } from "../../../components/ui/button";
import addNewBlog from "@/actions/add-form";
import Multiselect from "../../../components/ui/select-create";
import { addCategory } from "@/lib/prisma/category";
import { addTag } from "@/lib/prisma/tags";
import { toast } from "sonner";
import DragAndDrop from "../../../components/ui/drag-n-drop";
import Image from "next/image";
import { LuX } from "react-icons/lu";
import { BlogFields } from "@/lib/zod/BlogSchema";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import uploadImage from "@/lib/cloudinary/upload-image";

interface Tag {
  id: string;
  value: string;
  label: string;
}

interface AddBlogProps {
  tags: Tag[];
  categories: Tag[];
  blog: Blog;
}

interface Blog {
  category: Tag | null;
  tags: any;
  id: string;
  title: string;
  slug: string;
  description: string;
  url: string;
  date: Date;
  platform: string;
  language: string;
  categoryId: string;
  tagId: string[];
  thumbnail: string;
}

export default function AddBlog({ tags, categories, blog }: AddBlogProps) {
  const [thumbnail, setThumbnail] = useState<File | string | null>(
    blog?.thumbnail || null
  );
  const { pending } = useFormStatus();
  const formRef = useRef<HTMLFormElement>(null);

  const [formState, formAction] = useFormState(addNewBlog, {
    success: undefined,
    errors: undefined,
    fieldValues: {
      title: blog.title || "",
      slug: blog.slug || "",
      description: blog.description || "",
      url: blog.url || "",
      date: blog.date || new Date(),
      category: blog.category,
      language: blog.language || "English",
      platform: blog.platform || PLATFORMS[0],
      tags: blog.tags,
      thumbnail: thumbnail,
    },
  });
  useEffect(() => {
    if (formState.success) {
      toast.success("A new blog has been added successfully.");
    } else if (formState.errors) {
      toast.error("Something went wrong.");
      console.error("Error while adding the blog: ", formState.errors);
    }
  }, [formState]);

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-3 my-4"
      >
        <div>
          {/* Title */}
          <Input
            placeholder="Title"
            type="text"
            name="title"
            defaultValue={formState.fieldValues?.title || ""}
            className={`${
              formState?.errors?.title
                ? "border-red-500 focus-visible:ring-red-500 "
                : ""
            }`}
          />
          <p className="pt-1 text-xs font-semibold text-red-400">
            {formState?.errors?.title}
          </p>
        </div>

        {/* Slug */}
        <Input
          placeholder="Slug"
          type="text"
          name="slug"
          defaultValue={formState.fieldValues?.slug}
        />

        {/* Description */}
        <Textarea
          placeholder="Description"
          name="description"
          rows={4}
          defaultValue={formState.fieldValues?.description}
        />

        {/* URL */}
        <Input
          placeholder="Published URL"
          type="text"
          name="url"
          defaultValue={formState.fieldValues?.url}
        />

        {/* Date */}
        <Input
          type="date"
          name="date"
          id="date"
          defaultValue={
            formState?.fieldValues?.date
              ? format(new Date(formState.fieldValues.date), "yyyy-MM-dd")
              : format(new Date(), "yyyy-MM-dd")
          }
        />

        {/* Platform */}
        <Select
          name="platform"
          defaultValue={
            PLATFORMS.filter(
              (p) => p.value === formState.fieldValues?.platform
            )[0]?.value
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            {PLATFORMS.map((platform) => (
              <SelectItem value={platform.value} key={platform.value}>
                {platform.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Language */}
        <Select name="language" defaultValue={formState.fieldValues?.language}>
          <SelectTrigger>
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="English">English</SelectItem>
            <SelectItem value="Marathi">Marathi</SelectItem>
            <SelectItem value="Hindi">Hindi</SelectItem>
          </SelectContent>
        </Select>

        {/* Category */}
        <Multiselect
          placeholder="Select category"
          options={categories}
          onCreateOption={addCategory}
          name="category"
          values={formState.fieldValues?.category}
        />

        {/* Tags */}
        <Multiselect
          placeholder="Select or create tags"
          options={tags}
          isMulti
          onCreateOption={addTag}
          name="tags"
          values={formState.fieldValues?.tags}
        />

        {/* Thumbnail */}
        <Input type="file" name="thumbnail" />

        <DragAndDrop
          multiple={false}
          accept={{
            "image/png": [".png", ".jpg", ".jpeg", ".webp", ".avif"],
          }}
          onChange={setThumbnail}
          maxSize={20_00_000}
          name="thumbnail"
          formRef={formRef}
        >
          <section className="flex flex-col justify-center w-full h-24 items-center px-3 py-2 text-sm border border-slate-200rounded-md cursor-pointer hover:bg-slate-100 hover:border-slate-200 border-input bg-background ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">
            <p className="mx-auto text-center">
              Drag and drop or click to select images
            </p>
            {(thumbnail || formState.fieldValues?.thumbnail) && (
              <p>Current image will be replaced</p>
            )}
          </section>
        </DragAndDrop>

        {thumbnail && (
          <div className="flex pt-5 overflow-x-auto flex-nowrap scrollbar-hide mx-auto">
            <div className="flex-none mr-3">
              <div className="group relative size-96">
                <Image
                  priority={false}
                  src={thumbnail as string}
                  alt={`Cover image for ${formState.fieldValues?.title}`}
                  width={100}
                  height={100}
                  onLoad={() => console.log("Image loaded")} // Optional, for debugging
                  className="object-cover aspect-video border border-gray-300 border-dashed rounded"
                />
                <div
                  className="absolute p-1 rounded-full cursor-pointer -right-3 -top-3 bg-red-50 group-hover:flex"
                  onClick={() => setThumbnail(null)}
                >
                  <LuX className="size-4 text-red-500" />
                </div>
              </div>
            </div>
          </div>
        )}

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
    <button type="submit" disabled={pending}>
      {pending ? "Adding..." : "Add a new blog"}
    </button>
  );
};

const PLATFORMS = [
  { value: "personal", label: "Personal blog" },
  { value: "freecodecamp", label: "FreeCodeCamp" },
  { value: "dev.to", label: "Dev.to" },
  { value: "hackernoon", label: "Hackernoon" },
  { value: "showwcase", label: "Showwcase" },
  { value: "reactplay", label: "ReactPlay" },
  { value: "thedapplist", label: "The Dapp List" },
  { value: "nextbillion", label: "Nextbillion" },
  { value: "flycode", label: "FlyCode" },
];
