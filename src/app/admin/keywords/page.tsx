/**
 * /admin/keywords —— 评论关键字黑名单管理
 */
import { listKeywords } from "@/lib/admin-keywords";
import { KeywordForm } from "./keyword-form";
import { KeywordRowActions } from "./row-actions";

export const dynamic = "force-dynamic";

const ACTION_LABEL = {
  block: { name: "拒绝写入", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  hide: { name: "写入即隐藏", cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" },
};

export default async function AdminKeywordsPage() {
  const rows = await listKeywords();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">关键字黑名单</h1>
        <p className="mt-2 text-sm text-zinc-500">
          用于过滤评论中的违规内容。block 会拒绝发表；hide 允许写入但立即隐藏供审核。
        </p>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          添加规则
        </h2>
        <KeywordForm />
      </div>

      <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        已有规则（{rows.length}）
      </h2>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          还没有规则
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3 font-medium">关键字 / 正则</th>
                <th className="px-4 py-3 font-medium">类型</th>
                <th className="px-4 py-3 font-medium">动作</th>
                <th className="px-4 py-3 font-medium">添加时间</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((k) => {
                const label = ACTION_LABEL[k.action as "block" | "hide"];
                return (
                  <tr
                    key={k.id}
                    className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{k.pattern}</td>
                    <td className="px-4 py-3 text-xs">
                      {k.isRegex ? (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          正则
                        </span>
                      ) : (
                        <span className="text-zinc-500">普通文本</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${label.cls}`}>
                        {label.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {k.createdAt.toLocaleString("zh-CN", { hour12: false })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <KeywordRowActions id={k.id} pattern={k.pattern} />
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
