import Link from "next/link";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  getBenchmarkLeaderboard,
  listPublicBenchmarkQuestions,
  type BenchmarkLeaderboardRow,
  type PublicBenchmarkQuestion,
} from "@/lib/benchmarks";

export const dynamic = "force-dynamic";

export default async function BenchmarksPage() {
  const [leaderboard, questions] = await Promise.all([
    getBenchmarkLeaderboard(),
    listPublicBenchmarkQuestions(),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader maxWidth="max-w-[96rem]" />
      <AnnouncementBanner />

      <div className="mx-auto w-full max-w-[96rem] flex-1 px-6 py-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">公开题库与人工判题结果</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">基准测试</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
              用社区维护的标准题目和参考答案测试模型表现；排行榜根据已录入的人工判题结果实时汇总。
            </p>
          </div>
          <Link
            href="/benchmarks/submit"
            className="inline-flex shrink-0 items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            上传题目
          </Link>
        </header>

        <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] 2xl:grid-cols-[24rem_minmax(0,1fr)]">
          <LeaderboardSection leaderboard={leaderboard} />
          <QuestionGrid questions={questions} />
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}

function LeaderboardSection({ leaderboard }: { leaderboard: BenchmarkLeaderboardRow[] }) {
  return (
    <section className="h-fit self-start rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:sticky lg:top-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">模型基准测试排行榜</h2>
          <p className="mt-1 text-sm text-zinc-500">按正确数、正确率和测试题数排序。</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          {leaderboard.length} 个模型
        </span>
      </div>
      {leaderboard.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
          暂时还没有测试结果
        </p>
      ) : (
        <ol className="space-y-2">
          {leaderboard.map((row, index) => (
            <li
              key={row.modelName}
              className="rounded-lg border border-zinc-100 p-3 text-sm dark:border-zinc-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-xs font-semibold text-zinc-400">#{index + 1}</span>
                    <span className="break-words font-medium [overflow-wrap:anywhere]">{row.modelName}</span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {row.correctCount} 对 / {row.wrongCount} 错 · {row.totalCount} 题
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  {formatRate(row.correctRate)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function QuestionGrid({ questions }: { questions: PublicBenchmarkQuestion[] }) {
  return (
    <section id="questions">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">公开题库</h2>
          <p className="mt-1 text-sm text-zinc-500">已通过审核的题目，可用于复现和补充模型测试结果。</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          {questions.length} 道题
        </span>
      </div>
      {questions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          暂时还没有已通过审核的题目
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {questions.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </ul>
      )}
    </section>
  );
}

function QuestionCard({ question }: { question: PublicBenchmarkQuestion }) {
  return (
    <li className="flex min-h-full min-w-0 flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <span className="min-w-0 break-words [overflow-wrap:anywhere]">上传者：{question.uploaderName}</span>
        <span className={`rounded-full px-2 py-0.5 ${question.isTested ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"}`}>
          {question.isTested ? "已测试" : "未测试"}
        </span>
      </div>

      <div className="flex-1 space-y-3">
        <CompactBlock title="题目" content={question.question} lines="line-clamp-5" />
        <CompactBlock title="参考答案" content={question.referenceAnswer} lines="line-clamp-3" />
        {question.judgeNote && (
          <CompactBlock title="判题说明" content={question.judgeNote} lines="line-clamp-2" />
        )}
      </div>

      <div className="mt-4 space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <ModelPills title="正确" models={question.correctModels} tone="green" />
        <ModelPills title="错误" models={question.wrongModels} tone="red" />
        <Link
          href={`/benchmarks/questions/${question.id}`}
          className="inline-flex text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          查看完整题目 →
        </Link>
      </div>
    </li>
  );
}

function CompactBlock({
  title,
  content,
  lines,
}: {
  title: string;
  content: string;
  lines: string;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-zinc-500">{title}</div>
      <p className={`whitespace-pre-wrap break-words text-sm leading-6 text-zinc-700 [overflow-wrap:anywhere] dark:text-zinc-300 ${lines}`}>
        {content}
      </p>
    </div>
  );
}

function ModelPills({
  title,
  models,
  tone,
}: {
  title: string;
  models: string[];
  tone: "green" | "red";
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-zinc-500">{title}</div>
      {models.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 px-2 py-1 text-xs text-zinc-400 dark:border-zinc-800">
          暂无
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {models.map((model) => (
            <Badge key={model} tone={tone}>{model}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "green" | "red" }) {
  const cls =
    tone === "green"
      ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300"
      : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300";
  return <span className={`max-w-full break-words rounded-full px-2 py-1 text-xs [overflow-wrap:anywhere] ${cls}`}>{children}</span>;
}

function formatRate(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
