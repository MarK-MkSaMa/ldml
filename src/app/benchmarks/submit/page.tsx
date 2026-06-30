import Link from "next/link";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUserFresh } from "@/lib/current-user";
import { BenchmarkQuestionForm } from "../benchmark-question-form";

export const dynamic = "force-dynamic";

export default async function SubmitBenchmarkQuestionPage() {
  const user = await getCurrentUserFresh();
  const canSubmit = Boolean(user && user.trustLevel >= 1);

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader maxWidth="max-w-[96rem]" />
      <AnnouncementBanner />

      <div className="mx-auto w-full max-w-[96rem] flex-1 px-6 py-8">
        <nav className="mb-4 text-sm text-zinc-500">
          <Link href="/benchmarks" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            ← 返回基准测试
          </Link>
        </nav>

        <section className="mx-auto max-w-3xl rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-lg font-semibold">上传题目</h1>
          <p className="mt-2 text-sm text-zinc-500">
            需要登录且信任等级 ≥ 1。提交后进入待审核，管理员通过后会在基准测试页公开展示。
          </p>
          {!user && (
            <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              请先登录后再提交题目。
            </p>
          )}
          {user && user.trustLevel < 1 && (
            <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              你的信任等级为 {user.trustLevel}，暂不能提交题目。
            </p>
          )}
          <div className="mt-5">
            <BenchmarkQuestionForm canSubmit={canSubmit} />
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
