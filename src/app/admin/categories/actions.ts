"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCategoryAdmin,
  updateCategoryAdmin,
  deleteCategoryAdmin,
} from "@/lib/admin-categories";
import { requireAdminFresh } from "@/lib/current-user";

function parseInput(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  return {
    slug: get("slug"),
    name: get("name"),
    order: Number(get("order")) || 0,
  };
}

function bust() {
  // 分类变更会影响前台导航 Tab + 后台多处
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
}

export async function createCategoryAction(formData: FormData) {
  await requireAdminFresh();
  await createCategoryAdmin(parseInput(formData));
  bust();
  redirect("/admin/categories");
}

export async function updateCategoryAction(id: number, formData: FormData) {
  await requireAdminFresh();
  await updateCategoryAdmin(id, parseInput(formData));
  bust();
  redirect("/admin/categories");
}

export async function deleteCategoryAction(id: number) {
  await requireAdminFresh();
  await deleteCategoryAdmin(id);
  bust();
}
