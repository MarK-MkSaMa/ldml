"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  createDimensionAdmin,
  updateDimensionAdmin,
  deleteDimensionAdmin,
} from "@/lib/admin-dimensions";

async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("无权限");
}

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
}

export async function createDimensionAction(formData: FormData) {
  await requireAdmin();
  await createDimensionAdmin(parseInput(formData));
  bust();
  redirect("/admin/dimensions");
}

export async function updateDimensionAction(id: number, formData: FormData) {
  await requireAdmin();
  await updateDimensionAdmin(id, parseInput(formData));
  bust();
  redirect("/admin/dimensions");
}

export async function deleteDimensionAction(id: number) {
  await requireAdmin();
  await deleteDimensionAdmin(id);
  bust();
}
