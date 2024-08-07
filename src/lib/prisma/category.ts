"use server";

import prisma from "./prisma";
import kebabCase from "lodash.kebabcase";

export async function addCategory(label: string) {
  const value = kebabCase(label);
  return prisma.category.create({
    data: {
      value,
      label,
    },
  });
}

export async function findCategory(value: string) {
  return prisma.category.findFirst({
    where: {
      value,
    },
  });
}

export async function fetchCategories() {
  return prisma.category.findMany({});
}
export async function findCategoryById(id: string) {
  return prisma.category.findFirst({
    where: {
      id: id,
    },
  });
}
