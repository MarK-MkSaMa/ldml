"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  createDimensionAdmin,
  updateDimensionAdmin,
  deleteDimensionAdmin,
} from "@/lib/admin-dimensions";
import { requireAdminFresh } from "@/lib/current-user";

function parseInput(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  return {
    categoryId: Number(get("categoryId")),
    slug: get("slug"),
    name: get("name"),
    description: get("description") || null,
    order: Number(get("order")) || 0,
  };
}

function bust() {
  revalidatePath("/admin/dimensions");
  revalidatePath("/", "layout");
  updateTag("rankings");
}

export async function createDimensionAction(formData: FormData) {
  await requireAdminFresh();
  await createDimensionAdmin(parseInput(formData));
  bust();
  redirect("/admin/dimensions");
}

export async function updateDimensionAction(id: number, formData: FormData) {
  await requireAdminFresh();
  await updateDimensionAdmin(id, parseInput(formData));
  bust();
  redirect("/admin/dimensions");
}

export async function deleteDimensionAction(id: number) {
  await requireAdminFresh();
  await deleteDimensionAdmin(id);
  bust();
}
