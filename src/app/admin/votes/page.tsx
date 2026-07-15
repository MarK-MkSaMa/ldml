import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories, type ModelStatus } from "@/db/schema";
import { listVoteModelsForAdmin } from "@/lib/admin-votes";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<ModelStatus, { name: string; cls: string }> = {
  draft: { name: "草稿", cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  observing: { name: "观察区", cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" },
  listed: { name: "正式榜", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  archived: { name: "归档", cls: "bg-zinc-100 text-zinc-500 line-through dark:bg-zinc-800 dark:text-zinc-500" },
};

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function AdminVotesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const parsedCategoryId = sp.category ? Number(sp.category) : undefined;
  const categoryId = Number.isInteger(parsedCategoryId) ? parsedCategoryId : undefined;

  const [allCategories, rows] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.order)),
    listVoteModelsForAdmin({ categoryId }),
  ]);

  const categoryById = new Map(allCategories.map((c) => [c.id, c]));

  function urlWithCategory(value: number | undefined): string {
    return value === undefined ? "/admin/votes" : `/admin/votes?category=${value}`;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">投票管理</h1>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <FilterPicker
          label="分类"
          all={[{ id: undefined, name: "全部" }, ...allCategories.map((c) => ({ id: c.id, name: c.name }))]}
          current={categoryId}
          buildUrl={urlWithCategory}
        />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          没有匹配的模型
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3 font-medium">名称</th>
                <th className="px-4 py-3 font-medium">分类</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">投票人数</th>
                <th className="px-4 py-3 font-medium">投票条数</th>
                <th className="px-4 py-3 font-medium">最近投票</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const cat = categoryById.get(m.categoryId);
                const label = STATUS_LABELS[m.status];
                return (
                  <tr key={m.id} className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/votes/${m.id}`}
                        className="font-medium hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                      >
                        {m.name}
                      </Link>
                      <div className="text-xs text-zinc-500">
                        {m.vendor ?? "—"} · /{m.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">{cat?.name ?? "?"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${label.cls}`}>{label.name}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{m.voteUsers}</td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{m.voteCount}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(m.lastVotedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/votes/${m.id}`} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
                        查看投票
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterPicker<T extends number | undefined>({
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
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-zinc-500">{label}</span>
      <div className="flex flex-wrap gap-1">
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
