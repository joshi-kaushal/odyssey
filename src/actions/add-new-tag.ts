"use server"

import { addCategory } from "@/lib/prisma/category"
import { addTag } from "@/lib/prisma/tags"

export async function addNewTag(inputValue: string) {
  const newOption = await addTag(inputValue)
  return newOption
} 

export async function addNewCategory(inputValue: string) {
  const newOption = await addCategory(inputValue)
  return newOption
} 