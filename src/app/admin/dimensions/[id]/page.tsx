import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getDimensionByIdForAdmin,
  listCategoriesForAdmin,
} from "@/lib/admin-dimensions";
import { DimensionForm } from "../dimension-form";
import { updateDimensionAction } from "../actions";

export default async function EditDimensionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dimensionId = Number(id);
  if (!Number.isInteger(dimensionId) || dimensionId <= 0) notFound();

  const [d, cats] = await Promise.all([
    getDimensionByIdForAdmin(dimensionId),
    listCategoriesForAdmin(),
  ]);
  if (!d) notFound();

  const boundAction = async (formData: FormData) => {
    "use server";
    await updateDimensionAction(dimensionId, formData);
  };

  return (
    <div>
      <nav className="mb-4 text-sm text-zinc-500">
        <Link
          href="/admin/dimensions"
          className="hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← 返回维度列表
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">编辑维度</h1>
      <DimensionForm
        initial={{
          categoryId: d.categoryId,
          slug: d.slug,
          name: d.name,
          description: d.description ?? "",
          order: d.order,
        }}
        categories={cats}
        action={boundAction}
        submitLabel="保存修改"
      />
    </div>
  );
}
