"use client";

import React, { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import addNewBlog from "@/app/blog/_actions/add-blog-action";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addCategory } from "@/lib/prisma/blog/category";
import { addTag } from "@/lib/prisma/blog/tags";
import { format } from "date-fns";
import Image from "next/image";
import { LuX } from "react-icons/lu";
import { toast } from "sonner";
import FormField from "@/components/common/form-field";
import DragAndDrop from "@/components/ui/drag-n-drop";
import { Input } from "@/components/ui/input";
import Multiselect from "@/components/ui/select-create";

export default function AddBlog({ tags, categories, blog }: AddBlogProps) {
  const [thumbnail, setThumbnail] = useState<File | string>(
    blog?.thumbnail || ""
  );
  const { pending } = useFormStatus();
  const formRef = useRef<HTMLFormElement>(null);

  const initialFieldValues = {
    title: blog?.title || "",
    slug: blog?.slug || "",
    description: blog?.description || "",
    url: blog?.url || "",
    date: blog?.date ? format(new Date(blog.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    category: blog?.category,
    language: blog?.language || "English",
    platform: blog?.platform || PLATFORMS[0].value,
    tags: blog?.tags,
    thumbnail: thumbnail,
  };

  const [formState, formAction] = useFormState(addNewBlog, {
    success: undefined,
    errors: undefined,
    fieldValues: initialFieldValues,
  });

  useEffect(() => {
    if (formState?.success) {
      toast.success(blog?.title ? "The blog has been edited." : "A new blog has been added successfully.");
      if (!blog?.title) setThumbnail("");
    } else if (formState?.errors) {
      toast.error(JSON.stringify(formState.errors));
      setThumbnail("");
    }
  }, [formState]);

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-4 my-4"
      >
        {/* Title */}
        <FormField name={"Title"} error={formState?.errors?.title}>
          <Input
            id="Title"
            placeholder="Title"
            type="text"
            name="title"
            defaultValue={formState?.fieldValues?.title}
            className={`${formState?.errors?.title
              ? "border-red-500 focus-visible:ring-red-500"
              : ""
              }`}
          />
        </FormField>

        {/* Slug */}
        <FormField name={"Slug"} error={formState?.errors?.title}>
          <Input
            id="Slug"
            placeholder="Slug"
            type="text"
            name="slug"
            defaultValue={formState?.fieldValues?.slug}
            className={`${formState?.errors?.slug
              ? "border-red-500 focus-visible:ring-red-500"
              : ""
              }`}
          />
        </FormField>

        {/* Description */}
        <FormField name={"Description"} error={formState?.errors?.description}>
          <div className="relative">
            <Textarea
              id="Description"
              placeholder="Description"
              name="description"
              rows={4}
              defaultValue={formState?.fieldValues?.description}
              className={`${formState?.errors?.description
                ? "border-red-500 focus-visible:ring-red-500"
                : ""
                }`}
            />
            <div className="absolute right-0 -top-6">
              <span className="text-xs text-neutral-500">
                {formState?.fieldValues?.description?.length}/200
              </span>
            </div>
          </div>
        </FormField>

        {/* URL */}
        <FormField name={"Published URL"} error={formState?.errors?.url}>
          <Input
            id="Published URL"
            placeholder="Published URL"
            type="text"
            name="url"
            defaultValue={formState?.fieldValues?.url}
            className={`${formState?.errors?.url
              ? "border-red-500 focus-visible:ring-red-500"
              : ""
              }`}
          />
        </FormField>

        {/* Date */}
        <FormField name={"Date"} error={formState?.errors?.date}>
          <Input
            type="date"
            name="date"
            id="date"
            defaultValue={
              formState?.fieldValues?.date
                ? format(new Date(formState?.fieldValues?.date), "yyyy-MM-dd")
                : format(new Date(), "yyyy-MM-dd")
            }
            className={`${formState?.errors?.date
              ? "border-red-500 focus-visible:ring-red-500"
              : ""
              }`}
          />
        </FormField>

        {/* Platform */}
        <FormField name={"Platform"} error={formState?.errors?.platform}>
          <Select
            name="platform"
            defaultValue={
              PLATFORMS.filter(
                (p) => p.value === formState?.fieldValues?.platform
              )[0]?.value
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent
              id={"Platform"}
              className={`${formState?.errors?.platform
                ? "border-red-500 focus-visible:ring-red-500"
                : ""
                }`}
            >
              {PLATFORMS.map((platform) => (
                <SelectItem value={platform.value} key={platform.value}>
                  {platform.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {/* Language */}
        <FormField name={"Language"} error={formState?.errors?.language}>
          <Select
            name="language"
            defaultValue={formState?.fieldValues?.language}
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
            </SelectContent>
          </Select>
        </FormField>

        {/* Category */}
        <FormField name={"Category"} error={formState?.errors?.categoryId}>
          <Multiselect
            placeholder="Select category"
            options={categories}
            onCreateOption={addCategory}
            name="category"
            values={formState?.fieldValues?.category}
          />
        </FormField>

        {/* Tags */}
        <FormField name={"Tags"} error={formState?.errors?.tagId}>
          <Multiselect
            placeholder="Select or create tags"
            options={tags}
            isMulti
            onCreateOption={addTag}
            name="tags"
            values={formState?.fieldValues?.tags}
          />
        </FormField>

        {/* Thumbnail */}
        <FormField name={"Thumbnail"} error={formState?.errors?.thumbnail}>
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
              {thumbnail ? (
                <div className="flex pt-5 overflow-x-auto flex-nowrap scrollbar-hide mx-auto">
                  <div className="flex-none mr-3">
                    <div className="group relative size-96">
                      <Image
                        priority={false}
                        src={thumbnail as string}
                        alt={`Cover image for ${formState?.fieldValues?.title}`}
                        width={100}
                        height={100}
                        className="object-cover aspect-video border border-gray-300 border-dashed rounded"
                      />
                      <button
                        type="button"
                        className="absolute p-1 rounded-full cursor-pointer -right-3 -top-3 bg-red-50 group-hover:flex"
                        onClick={() => setThumbnail("")}
                      >
                        <LuX className="size-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mx-auto text-center">
                  Drag and drop or click to select images
                </p>
              )}
            </section>
          </DragAndDrop>
        </FormField>

        <RenderSubmitButton pending={pending} title={blog?.title || ""} />
      </form>
    </>
  );
}

interface RenderSubmitButtonProps {
  pending: boolean;
  title: string;
}

const RenderSubmitButton: React.FC<RenderSubmitButtonProps> = ({ pending, title }) => {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding..." : title ? "Update blog" : "Add a new blog"}
    </Button>
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

interface Tag {
  id: string;
  value: string;
  label: string;
}

const LANGUAGES = ["English", "Marathi", "Hindi"];

interface AddBlogProps {
  tags: Tag[];
  categories: Tag[];
  blog: Blog | undefined;
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
