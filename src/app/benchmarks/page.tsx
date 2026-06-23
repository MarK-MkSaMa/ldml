import { FlaskConical } from "lucide-react";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUserFresh } from "@/lib/current-user";
import { getBenchmarkLeaderboard, listPublicBenchmarkQuestions } from "@/lib/benchmarks";
import { BenchmarkQuestionForm } from "./benchmark-question-form";

export const dynamic = "force-dynamic";

export default async function BenchmarksPage() {
  const [user, leaderboard, questions] = await Promise.all([
    getCurrentUserFresh(),
    getBenchmarkLeaderboard(),
    listPublicBenchmarkQuestions(),
  ]);
  const canSubmit = Boolean(user && user.trustLevel >= 1);

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader maxWidth="max-w-[96rem]" />
      <AnnouncementBanner />

      <div className="mx-auto w-full max-w-[96rem] flex-1 px-6 py-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-zinc-900 p-3 text-white dark:bg-zinc-100 dark:text-zinc-900">
            <FlaskConical className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">基准测试</h1>
            <p className="mt-2 text-sm text-zinc-500">
              面向文字模型的公开题库与人工评测结果，按后台录入的模型名聚合排行。
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-6">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="mb-4 text-lg font-semibold">模型基准测试排行榜</h2>
              {leaderboard.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
                  暂时还没有测试结果
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                      <tr>
                        <th className="py-3 pr-4 font-medium">排名</th>
                        <th className="py-3 pr-4 font-medium">模型</th>
                        <th className="py-3 pr-4 font-medium">正确数</th>
                        <th className="py-3 pr-4 font-medium">错误数</th>
                        <th className="py-3 pr-4 font-medium">已测试题数</th>
                        <th className="py-3 font-medium">正确率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((row, index) => (
                        <tr key={row.modelName} className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800">
                          <td className="py-3 pr-4 font-medium">#{index + 1}</td>
                          <td className="py-3 pr-4 font-medium">{row.modelName}</td>
                          <td className="py-3 pr-4 text-green-700 dark:text-green-400">{row.correctCount}</td>
                          <td className="py-3 pr-4 text-red-600 dark:text-red-400">{row.wrongCount}</td>
                          <td className="py-3 pr-4">{row.totalCount}</td>
                          <td className="py-3">{formatRate(row.correctRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-4 text-lg font-semibold">公开题库</h2>
              {questions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
                  暂时还没有已通过审核的题目
                </p>
              ) : (
                <ul className="space-y-4">
                  {questions.map((question) => (
                    <li key={question.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                        <span>上传者：{question.uploaderName}</span>
                        <span className={`rounded-full px-2 py-0.5 ${question.isTested ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"}`}>
                          {question.isTested ? "已完成测试" : "未测试"}
                        </span>
                      </div>
                      <Block title="题目内容" content={question.question} />
                      <Block title="参考答案" content={question.referenceAnswer} />
                      {question.judgeNote && <Block title="判题说明" content={question.judgeNote} />}
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <ModelList title="答案正确" models={question.correctModels} tone="green" />
                        <ModelList title="答案错误" models={question.wrongModels} tone="red" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold">上传题目</h2>
            <p className="mt-2 text-sm text-zinc-500">
              需要登录且信任等级 ≥ 1。提交后进入待审核，管理员通过后公开展示。
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
          </aside>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}

function Block({ title, content }: { title: string; content: string }) {
  return (
    <div className="mt-3">
      <div className="mb-1 text-xs font-medium text-zinc-500">{title}</div>
      <div className="whitespace-pre-wrap rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300">
        {content}
      </div>
    </div>
  );
}

function ModelList({
  title,
  models,
  tone,
}: {
  title: string;
  models: string[];
  tone: "green" | "red";
}) {
  const cls = tone === "green"
    ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300"
    : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300";
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-zinc-500">{title}</div>
      {models.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-xs text-zinc-400 dark:border-zinc-800">
          暂无
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {models.map((model) => (
            <span key={model} className={`rounded-full px-2 py-1 text-xs ${cls}`}>
              {model}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function formatRate(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
