import Link from "next/link";
import { listModelRequestsForAdmin } from "@/lib/model-requests";
import { modelRequestStatusEnum, type ModelRequestStatus } from "@/db/schema";
import { ModelRequestRowActions } from "./row-actions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<ModelRequestStatus, { name: string; cls: string }> = {
  pending: { name: "待审核", cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" },
  approved: { name: "已通过", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  rejected: { name: "已拒绝", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

export default async function AdminModelRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status && modelRequestStatusEnum.includes(sp.status as ModelRequestStatus)
    ? (sp.status as ModelRequestStatus)
    : undefined;
  const rows = await listModelRequestsForAdmin({ status });

  function urlWith(nextStatus: ModelRequestStatus | undefined) {
    return nextStatus ? `/admin/model-requests?status=${nextStatus}` : "/admin/model-requests";
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">模型申请</h1>
        <p className="mt-2 text-sm text-zinc-500">
          审核用户提交的新模型申请。通过后会创建 status=observing、pinned=false 的模型。
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <span className="py-1 text-zinc-500">状态</span>
        <FilterLink href={urlWith(undefined)} active={status === undefined}>全部</FilterLink>
        {modelRequestStatusEnum.map((s) => (
          <FilterLink key={s} href={urlWith(s)} active={status === s}>
            {STATUS_LABELS[s].name}
          </FilterLink>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          没有匹配的申请
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3 font-medium">模型</th>
                <th className="px-4 py-3 font-medium">分类</th>
                <th className="px-4 py-3 font-medium">提交人</th>
                <th className="px-4 py-3 font-medium">日期</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const label = STATUS_LABELS[r.status];
                return (
                  <tr
                    key={r.id}
                    className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium">{r.name}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {r.vendor || "—"} · /{r.slug}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        协议：{r.licenseText || "—"}
                        {r.homepageUrl && (
                          <>
                            {" · "}
                            <a
                              href={r.homepageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                              官网
                            </a>
                          </>
                        )}
                      </div>
                      {r.rejectReason && (
                        <div className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
                          拒绝原因：{r.rejectReason}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-zinc-600 dark:text-zinc-400">
                      {r.categoryName}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-zinc-600 dark:text-zinc-400">
                      {r.requesterName}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-zinc-600 dark:text-zinc-400">
                      <div>提交：{formatDateTime(r.createdAt)}</div>
                      {r.reviewedAt && <div>审核：{formatDateTime(r.reviewedAt)}</div>}
                      {r.releasedAt && <div>发布：{r.releasedAt}</div>}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${label.cls}`}>
                        {label.name}
                      </span>
                      {r.createdModelId && (
                        <div className="mt-2 text-xs">
                          <Link
                            href={`/admin/models/${r.createdModelId}`}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            查看模型
                          </Link>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <ModelRequestRowActions id={r.id} name={r.name} status={r.status} />
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

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </Link>
  );
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}
