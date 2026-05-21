import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryByIdForAdmin } from "@/lib/admin-categories";
import { CategoryForm } from "../category-form";
import { updateCategoryAction } from "../actions";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cid = Number(id);
  if (!Number.isInteger(cid) || cid <= 0) notFound();

  const c = await getCategoryByIdForAdmin(cid);
  if (!c) notFound();

  const boundAction = async (formData: FormData) => {
    "use server";
    await updateCategoryAction(cid, formData);
  };

  return (
    <div>
      <nav className="mb-4 text-sm text-zinc-500">
        <Link
          href="/admin/categories"
          className="hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← 返回分类列表
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">编辑分类</h1>
      <CategoryForm
        initial={{
          slug: c.slug,
          name: c.name,
          order: c.order,
        }}
        action={boundAction}
        submitLabel="保存修改"
        isEdit
        originalSlug={c.slug}
      />
    </div>
  );
}
