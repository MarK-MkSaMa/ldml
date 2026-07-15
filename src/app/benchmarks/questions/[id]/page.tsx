import Link from "next/link";
import { notFound } from "next/navigation";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  getPublicBenchmarkQuestion,
  type PublicBenchmarkQuestionDetail,
} from "@/lib/benchmarks";

export const dynamic = "force-dynamic";

export default async function PublicBenchmarkQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const question = await getPublicBenchmarkQuestion(id);
  if (!question) notFound();

  const correctResults = question.results.filter((result) => result.isCorrect);
  const wrongResults = question.results.filter((result) => !result.isCorrect);

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader maxWidth="max-w-[96rem]" />
      <AnnouncementBanner />

      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <Link
          href="/benchmarks#questions"
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          ← 返回公开题库
        </Link>

        <header className="mt-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm font-medium text-zinc-500">公开基准题库</p>
          <h1 className="mt-2 break-words text-3xl font-bold tracking-tight [overflow-wrap:anywhere]">
            完整题目
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
            <span className="break-words [overflow-wrap:anywhere]">
              上传者：{question.uploaderName}
            </span>
            <span>上传日期：{formatDate(question.createdAt)}</span>
            <span>测试结果：{question.results.length} 条</span>
          </div>
        </header>

        <section className="mt-6 space-y-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <TextBlock title="题目" content={question.question} />
          <TextBlock title="参考答案" content={question.referenceAnswer} />
          <TextBlock title="判题说明" content={question.judgeNote || "暂无判题说明"} muted={!question.judgeNote} />
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">模型测试结果</h2>
            <p className="mt-1 text-sm text-zinc-500">
              展示已录入的人工判题结论；模型回答和备注仅在有记录时显示。
            </p>
          </div>

          {question.results.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
              暂时还没有测试结果
            </p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <ResultGroup title="正确结果" results={correctResults} tone="green" />
              <ResultGroup title="错误结果" results={wrongResults} tone="red" />
            </div>
          )}
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}

function TextBlock({
  title,
  content,
  muted = false,
}: {
  title: string;
  content: string;
  muted?: boolean;
}) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{title}</h2>
      <div
        className={`whitespace-pre-wrap break-words rounded-lg bg-zinc-50 px-4 py-3 text-sm leading-7 [overflow-wrap:anywhere] dark:bg-zinc-900/70 ${
          muted ? "text-zinc-400" : "text-zinc-700 dark:text-zinc-300"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function ResultGroup({
  title,
  results,
  tone,
}: {
  title: string;
  results: PublicBenchmarkQuestionDetail["results"];
  tone: "green" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300"
      : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300";

  return (
    <div className="min-w-0 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClass}`}>
          {results.length} 个模型
        </span>
      </div>
      {results.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400 dark:border-zinc-800">
          暂无
        </p>
      ) : (
        <ul className="space-y-3">
          {results.map((result) => (
            <li key={result.id} className="min-w-0 rounded-lg border border-zinc-100 p-4 dark:border-zinc-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="break-words text-sm font-semibold [overflow-wrap:anywhere]">
                  {result.modelName}
                </span>
                <span className="text-xs text-zinc-500">更新：{formatDate(result.updatedAt)}</span>
              </div>
              {result.modelAnswer && (
                <ResultText title="模型回答" content={result.modelAnswer} />
              )}
              {result.note && <ResultText title="备注" content={result.note} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResultText({ title, content }: { title: string; content: string }) {
  return (
    <div className="mt-3">
      <div className="mb-1 text-xs font-medium text-zinc-500">{title}</div>
      <div className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-700 [overflow-wrap:anywhere] dark:text-zinc-300">
        {content}
      </div>
    </div>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}
