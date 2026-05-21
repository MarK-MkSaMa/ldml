/**
 * /profile —— 个人中心
 *
 * 显示：基本信息 / 我的评分 / 我的评论
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getMyVotes, getMyComments } from "@/lib/profile";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "个人中心 · LDML",
};

const TABS = [
  { value: "votes", label: "我的评分" },
  { value: "comments", label: "我的评论" },
] as const;

type Tab = (typeof TABS)[number]["value"];

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/profile");

  const sp = await searchParams;
  const tab: Tab = TABS.find((t) => t.value === sp.tab)?.value ?? "votes";

  // 重新查 user，session 里的可能滞后（如最近改了 trust_level）
  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id));

  const [votes, comments] = await Promise.all([
    getMyVotes(session.user.id),
    getMyComments(session.user.id),
  ]);

  // 按模型分组评分
  const votesByModel = new Map<
    string,
    {
      modelSlug: string;
      modelName: string;
      modelVendor: string | null;
      dims: { dimensionName: string; score: number; updatedAt: Date }[];
      lastAt: Date;
    }
  >();
  for (const v of votes) {
    const key = v.modelId;
    const g = votesByModel.get(key);
    if (g) {
      g.dims.push({
        dimensionName: v.dimensionName,
        score: v.score,
        updatedAt: v.updatedAt,
      });
      if (v.updatedAt > g.lastAt) g.lastAt = v.updatedAt;
    } else {
      votesByModel.set(key, {
        modelSlug: v.modelSlug,
        modelName: v.modelName,
        modelVendor: v.modelVendor,
        dims: [
          {
            dimensionName: v.dimensionName,
            score: v.score,
            updatedAt: v.updatedAt,
          },
        ],
        lastAt: v.updatedAt,
      });
    }
  }
  const votesGrouped = [...votesByModel.entries()]
    .sort((a, b) => b[1].lastAt.getTime() - a[1].lastAt.getTime())
    .map(([modelId, g]) => ({ modelId, ...g }));

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader maxWidth="max-w-4xl" />

      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        {/* 基本信息 */}
        <section className="mb-8 flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          {userRow?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userRow.avatarUrl}
              alt=""
              className="h-16 w-16 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="text-xl font-bold tracking-tight">
                {userRow?.username ?? session.user.username}
              </h1>
              {userRow?.isAdmin && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                  管理员
                </span>
              )}
              <span className="text-xs text-zinc-500">
                Linux DO ID: {userRow?.linuxdoId}
              </span>
              <span className="text-xs text-zinc-500">
                信任等级 Lv {userRow?.trustLevel}
              </span>
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              注册于{" "}
              {userRow?.createdAt.toLocaleString("zh-CN", { hour12: false })}
            </div>
            <div className="mt-3 flex gap-4 text-sm">
              <span>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {votes.length}
                </strong>
                <span className="ml-1 text-zinc-500">评分</span>
              </span>
              <span>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {votesGrouped.length}
                </strong>
                <span className="ml-1 text-zinc-500">个模型</span>
              </span>
              <span>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {comments.length}
                </strong>
                <span className="ml-1 text-zinc-500">评论</span>
              </span>
            </div>
          </div>
        </section>

        {/* Tab */}
        <nav className="mb-6 flex gap-4 border-b border-zinc-200 dark:border-zinc-800">
          {TABS.map((t) => {
            const active = t.value === tab;
            return (
              <Link
                key={t.value}
                href={t.value === "votes" ? "/profile" : `/profile?tab=${t.value}`}
                className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                    : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        {tab === "votes" && (
          <section>
            {votesGrouped.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
                你还没有评分任何模型
              </p>
            ) : (
              <ul className="space-y-3">
                {votesGrouped.map((g) => (
                  <li
                    key={g.modelId}
                    className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/models/${g.modelSlug}`}
                          className="font-medium hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                        >
                          {g.modelName}
                        </Link>
                        {g.modelVendor && (
                          <span className="ml-2 text-xs text-zinc-500">
                            {g.modelVendor}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500">
                        {g.lastAt.toLocaleString("zh-CN", { hour12: false })}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
                      {g.dims.map((d) => (
                        <div
                          key={d.dimensionName}
                          className="flex items-center justify-between"
                        >
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {d.dimensionName}
                          </span>
                          <span className="tabular-nums font-medium">{d.score}</span>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "comments" && (
          <section>
            {comments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
                你还没有发表过评论
              </p>
            ) : (
              <ul className="space-y-3">
                {comments.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="mb-2 flex flex-wrap items-baseline gap-x-3 text-xs">
                      <Link
                        href={`/models/${c.modelSlug}`}
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {c.modelName}
                      </Link>
                      <span className="text-zinc-500">
                        {c.createdAt.toLocaleString("zh-CN", { hour12: false })}
                      </span>
                      {c.editedAt && (
                        <span className="text-zinc-400">已编辑</span>
                      )}
                      {c.parentId && (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          回复
                        </span>
                      )}
                      {c.isHidden && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                          已隐藏
                        </span>
                      )}
                      {c.isDeleted && (
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                          已删除
                        </span>
                      )}
                    </div>
                    {c.isDeleted ? (
                      <p className="text-sm italic text-zinc-400">
                        [此评论已被删除]
                      </p>
                    ) : (
                      <div
                        className="markdown-body text-sm"
                        dangerouslySetInnerHTML={{ __html: c.contentHtml }}
                      />
                    )}
                    <div className="mt-2 text-xs text-zinc-500">
                      👍 {c.likeCount} · 👎 {c.dislikeCount}
                      {c.reportCount > 0 && (
                        <span className="ml-3 text-red-600 dark:text-red-400">
                          被举报 {c.reportCount} 次
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
