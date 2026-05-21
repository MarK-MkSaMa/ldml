import Link from "next/link";
import { CategoryForm } from "../category-form";
import { createCategoryAction } from "../actions";

export default function NewCategoryPage() {
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
      <h1 className="mb-2 text-2xl font-bold tracking-tight">新建分类</h1>
      <p className="mb-6 text-sm text-zinc-500">
        建好后请去维度管理为该分类配置至少一个评分维度。
      </p>
      <CategoryForm action={createCategoryAction} submitLabel="创建" />
    </div>
  );
}
