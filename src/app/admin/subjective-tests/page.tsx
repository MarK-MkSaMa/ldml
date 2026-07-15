import Link from "next/link";
import { subjectiveTestStatusEnum, type SubjectiveTestStatus } from "@/db/schema";
import {
  listSubjectiveTestCategories,
  listSubjectiveTestsForAdmin,
} from "@/lib/subjective-tests";
import {
  createSubjectiveTestActivityAction,
  createSubjectiveTestEntryAction,
  deleteSubjectiveTestEntryAction,
  updateSubjectiveTestActivityAction,
  updateSubjectiveTestEntryAction,
  updateSubjectiveTestStatusAction,
} from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<SubjectiveTestStatus, { name: string; cls: string }> = {
  draft: { name: "草稿", cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" },
  published: { name: "已发布", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  archived: { name: "已归档", cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" },
};

export default async function AdminSubjectiveTestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status && subjectiveTestStatusEnum.includes(sp.status as SubjectiveTestStatus)
    ? (sp.status as SubjectiveTestStatus)
    : undefined;
  const [categories, rows] = await Promise.all([
    listSubjectiveTestCategories(),
    listSubjectiveTestsForAdmin({ status }),
  ]);

  function urlWith(nextStatus: SubjectiveTestStatus | undefined) {
    return nextStatus ? `/admin/subjective-tests?status=${nextStatus}` : "/admin/subjective-tests";
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">主观测试</h1>
        <p className="mt-2 text-sm text-zinc-500">创建主观测试活动，维护活动状态、模型输出、投票人数与实时 Elo 统计。</p>
      </div>

      <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">创建活动</h2>
        <ActivityForm action={createSubjectiveTestActivityAction} categories={categories} />
      </section>

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <span className="py-1 text-zinc-500">状态</span>
        <FilterLink href={urlWith(undefined)} active={status === undefined}>全部</FilterLink>
        {subjectiveTestStatusEnum.map((s) => (
          <FilterLink key={s} href={urlWith(s)} active={status === s}>{STATUS_LABELS[s].name}</FilterLink>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">没有匹配的活动</p>
      ) : (
        <ul className="space-y-5">
          {rows.map((row) => {
            const label = STATUS_LABELS[row.status];
            return (
              <li key={row.id} className="min-w-0 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${label.cls}`}>{label.name}</span>
                      <span className="break-words [overflow-wrap:anywhere]">{row.categoryName}</span>
                      <span>{row.voteCount} 人投票</span>
                      <span className="break-words [overflow-wrap:anywhere]">创建者：{row.creatorName}</span>
                      <span>创建：{formatDateTime(row.createdAt)}</span>
                    </div>
                    <h2 className="break-words text-xl font-semibold [overflow-wrap:anywhere]">{row.title}</h2>
                    {row.status === "published" && (
                      <Link href={`/subjective-tests/${row.id}`} className="mt-2 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400">查看前台详情</Link>
                    )}
                  </div>
                  <StatusForm id={row.id} status={row.status} />
                </div>

                <details className="mb-5 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950" open={row.status === "draft"}>
                  <summary className="cursor-pointer text-sm font-semibold">编辑活动字段</summary>
                  <ActivityForm action={updateSubjectiveTestActivityAction} categories={categories} activity={row} />
                </details>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div>
                    <h3 className="text-sm font-semibold">模型输出</h3>
                    {row.entries.length === 0 ? (
                      <p className="mt-2 rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-xs text-zinc-500 dark:border-zinc-700">还没有添加输出</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {row.entries.map((entry) => (
                          <details key={entry.id} className="min-w-0 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                            <summary className="cursor-pointer break-words text-sm font-medium [overflow-wrap:anywhere]">#{entry.order} {entry.modelName}</summary>
                            <EntryForm action={updateSubjectiveTestEntryAction} activityId={row.id} entry={entry} />
                            <form action={deleteSubjectiveTestEntryAction} className="mt-2">
                              <input type="hidden" name="id" value={entry.id} />
                              <input type="hidden" name="activityId" value={row.id} />
                              <button type="submit" className="text-xs text-red-600 hover:underline dark:text-red-400">删除该输出</button>
                            </form>
                          </details>
                        ))}
                      </div>
                    )}
                    <EntryForm action={createSubjectiveTestEntryAction} activityId={row.id} />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold">当前活动 Elo 统计</h3>
                    {row.ranking.length === 0 ? (
                      <p className="mt-2 text-xs text-zinc-500">暂无输出或投票</p>
                    ) : (
                      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <table className="w-full text-xs">
                          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
                            <tr>
                              <th className="px-3 py-2 font-medium">#</th>
                              <th className="px-3 py-2 font-medium">模型</th>
                              <th className="px-3 py-2 font-medium">Elo</th>
                              <th className="px-3 py-2 font-medium">对局</th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.ranking.map((rank, index) => (
                              <tr key={rank.key} className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800">
                                <td className="px-3 py-2">{index + 1}</td>
                                <td className="px-3 py-2 font-medium">{rank.modelName}</td>
                                <td className="px-3 py-2 tabular-nums">{rank.elo}</td>
                                <td className="px-3 py-2 tabular-nums">{rank.gameCount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ActivityForm({
  action,
  categories,
  activity,
}: {
  action: (formData: FormData) => void | Promise<void>;
  categories: Awaited<ReturnType<typeof listSubjectiveTestCategories>>;
  activity?: Awaited<ReturnType<typeof listSubjectiveTestsForAdmin>>[number];
}) {
  return (
    <form action={action} className="mt-4 space-y-3">
      {activity && <input type="hidden" name="id" value={activity.id} />}
      <div className="grid gap-3 md:grid-cols-[1fr_180px_160px]">
        <input name="title" required maxLength={160} defaultValue={activity?.title} className={inputCls} placeholder="活动标题" />
        <select name="categoryId" required defaultValue={activity?.categoryId ?? categories[0]?.id} className={inputCls}>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select name="status" required defaultValue={activity?.status ?? "draft"} className={inputCls}>
          {subjectiveTestStatusEnum.map((status) => <option key={status} value={status}>{STATUS_LABELS[status].name}</option>)}
        </select>
      </div>
      <input name="linuxdoUrl" maxLength={500} defaultValue={activity?.linuxdoUrl ?? ""} className={inputCls} placeholder="Linux DO 活动帖链接（可选）" />
      <textarea name="requirement" required rows={4} maxLength={20000} defaultValue={activity?.requirement} className={inputCls} placeholder="测试需求" />
      <textarea name="resultNote" rows={3} maxLength={20000} defaultValue={activity?.resultNote ?? ""} className={inputCls} placeholder="结果说明（可选）" />
      <button type="submit" className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">{activity ? "保存活动" : "创建活动"}</button>
    </form>
  );
}

function StatusForm({ id, status }: { id: string; status: SubjectiveTestStatus }) {
  return (
    <form action={updateSubjectiveTestStatusAction} className="flex flex-wrap items-center gap-2 text-xs">
      <input type="hidden" name="id" value={id} />
      <select name="status" defaultValue={status} className="rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-950">
        {subjectiveTestStatusEnum.map((s) => <option key={s} value={s}>{STATUS_LABELS[s].name}</option>)}
      </select>
      <button type="submit" className="rounded-md bg-zinc-900 px-2 py-1 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">更新状态</button>
    </form>
  );
}

function EntryForm({
  action,
  activityId,
  entry,
}: {
  action: (formData: FormData) => void | Promise<void>;
  activityId: string;
  entry?: { id: string; modelName: string; output: string; order: number };
}) {
  return (
    <form action={action} className="mt-3 space-y-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <input type="hidden" name="activityId" value={activityId} />
      <div className="grid gap-3 md:grid-cols-[1fr_120px]">
        <input name="modelName" required maxLength={120} defaultValue={entry?.modelName} className={inputCls} placeholder="模型名" />
        <input name="order" type="number" required defaultValue={entry?.order ?? 0} className={inputCls} placeholder="排序" />
      </div>
      <textarea name="output" required rows={entry ? 5 : 4} maxLength={50000} defaultValue={entry?.output} className={inputCls} placeholder="模型输出" />
      <button type="submit" className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">{entry ? "更新输出" : "添加输出"}</button>
    </form>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`rounded-md px-2.5 py-1 text-xs transition-colors ${active ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"}`}>
      {children}
    </Link>
  );
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(value);
}

const inputCls = "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100";
