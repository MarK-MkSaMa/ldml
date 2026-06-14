import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { getCurrentUserFresh } from "@/lib/current-user";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { ModelRequestForm } from "./model-request-form";

export const dynamic = "force-dynamic";

export default async function NewModelRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const [{ category: categorySlug }, user, categoryRows] = await Promise.all([
    searchParams,
    getCurrentUserFresh(),
    db.select().from(categories).orderBy(asc(categories.order)),
  ]);
  const selectedCategory =
    categoryRows.find((c) => c.slug === categorySlug) ?? categoryRows[0];

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />
      <AnnouncementBanner />

      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <nav className="mb-4 text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            ← 返回排行榜
          </Link>
        </nav>

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">申请添加新模型</h1>
          <p className="mt-2 text-sm text-zinc-500">
            提交后会进入管理员审核队列；审核通过后，模型会以观察区状态加入排行榜。
          </p>
        </div>

        {!user ? (
          <Notice
            title="需要登录"
            message="请先使用 Linux DO 登录后再提交模型申请。"
            actionHref="/login"
            actionText="去登录"
          />
        ) : user.trustLevel < 1 ? (
          <Notice
            title="信任等级不足"
            message={`你的信任等级为 ${user.trustLevel}，需要达到 1 级才能提交模型申请。`}
          />
        ) : categoryRows.length === 0 ? (
          <Notice title="暂无分类" message="当前还没有可申请的模型分类。" />
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <ModelRequestForm
              categories={categoryRows}
              initialCategoryId={selectedCategory?.id ?? 0}
            />
          </div>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}

function Notice({
  title,
  message,
  actionHref,
  actionText,
}: {
  title: string;
  message: string;
  actionHref?: string;
  actionText?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <p className="mt-2 text-zinc-500">{message}</p>
      {actionHref && actionText && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {actionText}
        </Link>
      )}
    </div>
  );
}
