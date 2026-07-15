/**
 * /admin/categories —— 模型分类管理
 *
 * "分类"对应模型的类型（文字 / 生图 / 生视频 / 音频 / ...）
 */
import Link from "next/link";
import { listCategoriesForAdmin } from "@/lib/admin-categories";
import { CategoryRowActions } from "./row-actions";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const rows = await listCategoriesForAdmin();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">模型分类</h1>
          <p className="mt-2 text-sm text-zinc-500">
            管理网站的顶层模型类型。新建分类后，记得到{" "}
            <Link
              href="/admin/dimensions"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              维度管理
            </Link>{" "}
            为它添加评分维度，否则用户无法对该分类下的模型评分。
          </p>
        </div>
        <Link
          href="/admin/categories/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          + 新建分类
        </Link>
      </div>

      <p className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        ⚠️ 删除分类将级联删除该分类下的所有维度、模型、评分、评分历史与统计聚合。请谨慎操作。
      </p>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          还没有分类
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3 font-medium">顺序</th>
                <th className="px-4 py-3 font-medium">名称</th>
                <th className="px-4 py-3 font-medium">slug</th>
                <th className="px-4 py-3 font-medium">维度数</th>
                <th className="px-4 py-3 font-medium">模型数</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
                >
                  <td className="px-4 py-3 tabular-nums text-zinc-500">
                    {c.order}
                  </td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {c.slug}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{c.dimensionCount}</td>
                  <td className="px-4 py-3 tabular-nums">{c.modelCount}</td>
                  <td className="px-4 py-3 text-right">
                    <CategoryRowActions
                      id={c.id}
                      name={c.name}
                      modelCount={c.modelCount}
                      dimensionCount={c.dimensionCount}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
