"use client";

import React, { useEffect, useState } from "react";
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
import { Input } from "../ui/input";
import { DatePicker } from "../ui/date-picker";
import { Button } from "../ui/button";
import addNewBlog from "@/actions/add-form";
import Multiselect from "../ui/select-create";
import { addCategory } from "@/lib/prisma/category";
import { addTag } from "@/lib/prisma/tags";
import { toast } from "sonner";
import DragAndDrop from "../ui/drag-n-drop";
import Image from "next/image";
import { ShieldCloseIcon } from "lucide-react";

interface Tag {
  id: string;
  value: string;
  label: string;
}

interface AddBlogProps {
  tags: Tag[];
  categories: Tag[];
}

interface Option {
  id?: string;
  value: string;
  label: string;
}

export default function AddBlog({ tags, categories }: AddBlogProps) {
  // const [thumbnail, setThumbnail] = useState([]);
  const [date, setDate] = useState<Date>(new Date());
  const { pending } = useFormStatus();

  const [formState, formAction] = useFormState(addNewBlog, {
    success: undefined,
    errors: undefined,
    fieldValues: {
      title: "",
      slug: "",
      description: "",
      url: "",
      date: date,
      category: "",
      language: "",
      platform: "",
      tags: [],
      thumbnail: "",
    },
  });

  useEffect(() => {
    if (formState.success) {
      toast.success("A new blog has been added successfully.");
    } else {
      toast.error("Something went wrong.");
      console.log(formState.errors);
    }
  }, [formState]);

  return (
    <AlertDialog>
      <AlertDialogTrigger>Add Blog</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add a new blog</AlertDialogTitle>
          <AlertDialogDescription>
            Writing blogs made you who you are today. Never stop writing!
          </AlertDialogDescription>
        </AlertDialogHeader>

        {formState.success && <p>Blog added to db</p>}
        <form action={formAction} className="flex flex-col gap-3 my-4">
          <div>
            <Input
              placeholder="Title"
              type="text"
              name="title"
              className={`${
                formState?.errors?.title
                  ? "border-red-500 focus-visible:ring-red-500 "
                  : ""
              }`}
            />
            <p className="text-red-400 text-xs font-semibold pt-1">
              {" "}
              {formState?.errors?.title}{" "}
            </p>
          </div>
          <Input placeholder="Slug" type="text" name="slug" />
          <Input
            placeholder="Description"
            type="textarea"
            name="description"
            aria-rowcount={4}
          />
          <Input placeholder="Published URL" type="text" name="url" />
          {/* <DatePicker name="date" date={date} setDate={setDate} /> */}
          <label htmlFor="date">date</label>
          <input type="date" name="date" id="date" />
          <Select name="platform" defaultValue={PLATFORMS[0].value}>
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
          {/* defaultValue={formData.language} onValueChange={(e) => handleSelectFields("language", e)} */}
          <Select name="language" defaultValue="English">
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
          />
          {/* Tags */}
          <Multiselect
            placeholder="Select or create tags"
            options={tags}
            isMulti
            onCreateOption={addTag}
            name="tags"
          />
          <Input type="file" name="thumbnail" />

          {/* <DragAndDrop
            multiple={false}
            accept={{
              "image/png": [".png", ".jpg", ".jpeg", ".webp", ".avif"],
            }}
            maxSize={20_00_000}
            onChange={setThumbnail}
            name="thumbnail"
          >
            <section className="flex h-10 cursor-pointer hover:bg-slate-100 hover:border-slate-100 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">
              <p className="text-center mx-auto">
                Drag and drop or click to select images
              </p>
            </section>
          </DragAndDrop> */}

          {/* {Boolean(thumbnail && thumbnail.length) && (
            <div className="flex flex-nowrap overflow-x-auto pt-5 scrollbar-hide">
              {thumbnail?.map((screenshot: any | string, i: number) => {
                return (
                  <div key={i} className="mr-3 flex-none">
                    <div className="group relative h-[58px] w-[58px] sm:h-[47px] sm:w-[47px]">
                      <Image
                        src={screenshot.imageSrc || screenshot}
                        alt={screenshot.alt || screenshot.filename}
                        width={100}
                        height={100}
                        className="h-full w-full rounded border border-dashed border-gray-300 object-cover"
                      />
                      <div
                        className="absolute -right-3 -top-3 cursor-pointer rounded-full bg-red-50 p-1 group-hover:flex"
                        onClick={() => {
                          setThumbnail([]);
                        }}
                      >
                        <ShieldCloseIcon className="h-[16px] w-[16px] text-red-500" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )} */}

          <RenderSubmitButton pending={pending} />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const RenderSubmitButton = (pending: boolean) => {
  return (
    <Button type="submit" disabled={!pending}>
      {!pending ? "Adding..." : "Add a new blog"}
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

// const validateBlogForm = async (blog: FormData) => {
//   // const thumbnailURL = await uploadImage(blog.get("thumbnail"))
//   const thumbnailURL = "await uploadImage(blog.get())"; // TODO: Change this back to normal
//   console.log(blog.get("photos"));
//   const newBlog = {
//     title: blog.get("title"),
//     slug: blog.get("slug"),
//     description: blog.get("description"),
//     url: blog.get("url"),
//     // date: date,
//     category: blog.get("category"),
//     platform: blog.get("platform"),
//     language: blog.get("language"),
//     tags: blog.getAll("tags"),
//     thumbnail: thumbnailURL,
//   };

//   // const result = BlogSchema.safeParse(newBlog)
//   // if (!result.success) {
//   //     let errorMessage = ""
//   //     result.error.issues.forEach((issue: any) => {
//   //         errorMessage += `${issue.path} : ${issue.message} . `
//   //     })
//   //     alert(errorMessage)
//   //     return;
//   // }

//   // const response = await addNewBlog(JSON.stringify(result.data))

//   // if (response?.result?.title === newBlog.title) {
//   //     alert("New blog added successfully")
//   //     return
//   // }
// };
