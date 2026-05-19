/**
 * /admin/dimensions
 *
 * 按分类分组展示所有维度。
 */
import Link from "next/link";
import { listDimensionsForAdmin } from "@/lib/admin-dimensions";
import { DimensionRowActions } from "./row-actions";

export const dynamic = "force-dynamic";

export default async function AdminDimensionsPage() {
  const groups = await listDimensionsForAdmin();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">维度管理</h1>
        <Link
          href="/admin/dimensions/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          + 新建维度
        </Link>
      </div>

      <p className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        ⚠️ 删除维度会一起删掉该维度下的所有投票记录与统计数据，请谨慎操作。
      </p>

      <div className="space-y-8">
        {groups.map(({ category, dims }) => (
          <section
            key={category.id}
            className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-baseline justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="font-medium">{category.name}</h2>
              <span className="text-xs text-zinc-500">
                {dims.length} 个维度
              </span>
            </div>

            {dims.length === 0 ? (
              <p className="px-4 py-6 text-sm text-zinc-500">
                该分类下还没有维度
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-100 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800">
                  <tr>
                    <th className="px-4 py-2 font-medium">顺序</th>
                    <th className="px-4 py-2 font-medium">名称</th>
                    <th className="px-4 py-2 font-medium">slug</th>
                    <th className="px-4 py-2 font-medium">描述</th>
                    <th className="px-4 py-2 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {dims.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
                    >
                      <td className="px-4 py-3 text-zinc-500 tabular-nums">
                        {d.order}
                      </td>
                      <td className="px-4 py-3 font-medium">{d.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                        {d.slug}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                        {d.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DimensionRowActions id={d.id} name={d.name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
