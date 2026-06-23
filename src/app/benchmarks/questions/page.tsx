import { AnnouncementBanner } from "@/components/announcement-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listPublicBenchmarkQuestions } from "@/lib/benchmarks";
import { BenchmarkTabs } from "../benchmark-tabs";

export const dynamic = "force-dynamic";

export default async function BenchmarkQuestionsPage() {
  const questions = await listPublicBenchmarkQuestions();

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader maxWidth="max-w-[96rem]" />
      <AnnouncementBanner />

      <div className="mx-auto w-full max-w-[96rem] flex-1 px-6 py-8">
        <BenchmarkTabs active="questions" />

        <section>
          <h1 className="mb-4 text-lg font-semibold">公开题库</h1>
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
        </section>
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
