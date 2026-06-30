/**
 * /admin/models —— 模型列表
 *
 * 支持 URL 参数筛选：?category=2&status=listed
 */
import Link from "next/link";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { listModelsForAdmin } from "@/lib/admin-models";
import type { ModelStatus } from "@/db/schema";
import { modelStatusEnum } from "@/db/schema";
import { ModelRowActions } from "./row-actions";
import { PromoteButton } from "./promote-button";
import { ModelsDevSyncButton } from "./models-dev-sync-button";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<ModelStatus, { name: string; cls: string }> = {
  draft: { name: "草稿", cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  observing: { name: "观察区", cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" },
  listed: { name: "正式榜", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  archived: { name: "归档", cls: "bg-zinc-100 text-zinc-500 line-through dark:bg-zinc-800 dark:text-zinc-500" },
};

export default async function AdminModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const categoryId = sp.category ? Number(sp.category) : undefined;
  const status = sp.status && modelStatusEnum.includes(sp.status as ModelStatus)
    ? (sp.status as ModelStatus)
    : undefined;

  const [allCategories, rows] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.order)),
    listModelsForAdmin({ categoryId, status }),
  ]);

  const categoryById = new Map(allCategories.map((c) => [c.id, c]));

  // 当前 URL 构造工具：保留其他筛选条件
  const baseParams = new URLSearchParams();
  if (categoryId !== undefined) baseParams.set("category", String(categoryId));
  if (status !== undefined) baseParams.set("status", status);

  function urlWith(overrides: Record<string, string | undefined>): string {
    const u = new URLSearchParams(baseParams);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") u.delete(k);
      else u.set(k, v);
    }
    const s = u.toString();
    return s ? `/admin/models?${s}` : "/admin/models";
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">模型管理</h1>
        <div className="flex items-center gap-3">
          <PromoteButton />
          <ModelsDevSyncButton />
          <Link
            href="/admin/models/new"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            + 添加生图/生视频模型
          </Link>
        </div>
      </div>

      {/* 筛选条 */}
      <div className="mb-6 flex flex-wrap gap-3">
        <FilterPicker
          label="分类"
          all={[{ id: undefined, name: "全部" }, ...allCategories.map((c) => ({ id: c.id, name: c.name }))]}
          current={categoryId}
          buildUrl={(v) => urlWith({ category: v === undefined ? undefined : String(v) })}
        />
        <FilterPicker
          label="状态"
          all={[
            { id: undefined as string | undefined, name: "全部" },
            ...modelStatusEnum.map((s) => ({ id: s as string | undefined, name: STATUS_LABELS[s].name })),
          ]}
          current={status}
          buildUrl={(v) => urlWith({ status: v ?? undefined })}
        />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          没有匹配的模型
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3 font-medium">名称</th>
                <th className="px-4 py-3 font-medium">来源 lab</th>
                <th className="px-4 py-3 font-medium">Weight</th>
                <th className="px-4 py-3 font-medium">分类</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">置顶</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const cat = categoryById.get(m.categoryId);
                const label = STATUS_LABELS[m.status];
                return (
                  <tr
                    key={m.id}
                    className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/models/${m.id}`}
                        className="font-medium hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                      >
                        {m.name}
                      </Link>
                      <div className="text-xs text-zinc-500">
                        /{m.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                      {m.lab ?? m.vendor ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                      {m.openWeights === null ? "—" : m.openWeights ? "Open" : "Closed"}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                      {cat?.name ?? "?"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${label.cls}`}>
                        {label.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {m.pinned ? "📌" : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ModelRowActions id={m.id} status={m.status} pinned={m.pinned} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * 简易筛选：渲染成一组链接 chips
 */
function FilterPicker<T extends number | string | undefined>({
  label,
  all,
  current,
  buildUrl,
}: {
  label: string;
  all: { id: T; name: string }[];
  current: T;
  buildUrl: (v: T) => string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500">{label}</span>
      <div className="flex gap-1">
        {all.map((opt) => {
          const active = opt.id === current;
          return (
            <Link
              key={String(opt.id ?? "all")}
              href={buildUrl(opt.id)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {opt.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
