import Link from "next/link";
import { ArrowRight, FlaskConical, ListChecks, Megaphone, Trophy } from "lucide-react";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const FEATURES = [
  {
    title: "评分排行榜",
    description: "社区用户可以按维度给模型打分，并在模型详情页留下评论与使用反馈。排行榜汇总真实主观体验，帮助你快速了解不同模型在实际使用中的口碑。",
    href: "/rankings/text",
    cta: "去评分和评论",
    icon: Trophy,
    links: [
      { href: "/rankings/text", label: "文字模型榜" },
      { href: "/rankings/image", label: "生图模型榜" },
      { href: "/comments", label: "全站评论" },
    ],
  },
  {
    title: "基准测试",
    description: "用户可以提交和维护题库，用标准题目、参考答案与判题说明来测试大模型的推理能力。通过公开题库和人工测试结果，更直观地比较模型的答题表现。",
    href: "/benchmarks",
    cta: "查看基准测试",
    icon: FlaskConical,
    links: [
      { href: "/benchmarks", label: "基准排行榜" },
      { href: "/benchmarks/questions", label: "公开题库" },
      { href: "/benchmarks/submit", label: "上传题目" },
    ],
  },
  {
    title: "主观测试",
    description: "通过投票对模型完成同一任务的效果进行排序，让社区共同决出执行任务最好的模型。系统会基于投票结果生成 Elo 排名，体现模型在具体任务里的偏好胜率。",
    href: "/subjective-tests",
    cta: "参与主观投票",
    icon: ListChecks,
    links: [
      { href: "/subjective-tests", label: "投票活动" },
      { href: "/subjective-tests", label: "Elo 排行榜" },
    ],
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader maxWidth="max-w-[96rem]" />
      <AnnouncementBanner />

      <div className="mx-auto w-full max-w-[96rem] flex-1 px-6 py-10">
        <section className="grid gap-8 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-10">
          <div>
            <p className="text-sm font-medium text-zinc-500">Linux DO 社区模型排行榜</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
              用社区评分、公开测试和主观投票，帮你更快找到合适的大模型。
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
              LDML 聚合社区用户对模型的真实评分、基准测试题库与人工测试结果，并提供主观偏好投票。你可以查看榜单、参与评分、贡献题目，也可以通过评论了解更多使用体验。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <PrimaryLink href="/rankings/text">进入评分排行榜</PrimaryLink>
              <PrimaryLink href="/benchmarks">查看基准测试</PrimaryLink>
              <PrimaryLink href="/subjective-tests">参与主观测试</PrimaryLink>
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-50 p-5 dark:bg-zinc-900/70">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">快速入口</h2>
            <div className="mt-4 space-y-3">
              <QuickLink href="/benchmarks/submit" label="添加题库题目" />
              <QuickLink href="/model-requests/new?category=text" label="申请添加新模型" />
              <QuickLink href="/announcements" label="查看站点公告" />
              <QuickExternalLink href="https://linux.do/t/topic/2255927" label="Linux DO 网站主贴" />
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">你可以在这里做什么？</h2>
              <p className="mt-2 text-sm text-zinc-500">LDML 围绕三大核心功能组织：评分、基准测试和主观投票。</p>
            </div>
            <Link href="/announcements" className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100">
              <Megaphone className="h-4 w-4" aria-hidden />
              查看公告
            </Link>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.href}
                  className="flex min-h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-zinc-900 p-2.5 text-white dark:bg-zinc-100 dark:text-zinc-900">
                        <Icon className="h-5 w-5" aria-hidden />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-zinc-400">0{index + 1}</div>
                        <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{feature.title}</h3>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 flex-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{feature.description}</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {feature.links.map((link) => (
                      <Link
                        key={`${feature.title}-${link.href}-${link.label}`}
                        href={link.href}
                        className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>

                  <Link
                    href={feature.href}
                    className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {feature.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-sm leading-7 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">关于 LDML</h2>
          <p className="mt-2">
            LDML 是面向 Linux DO 社区的大模型排行榜与测试站点，评分和反馈来自社区用户。本站为公益项目，与 Linux DO 官方没有关联。
          </p>
          <p className="mt-2">
            如需反馈问题或参与项目，可以前往 Linux DO 网站主贴、联系维护者，或前往 GitHub 查看源码并提交 issue。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <SecondaryExternalLink href="https://linux.do/t/topic/2255927">Linux DO 网站主贴</SecondaryExternalLink>
            <SecondaryExternalLink href="https://linux.do/u/markskz/summary">联系维护者</SecondaryExternalLink>
            <SecondaryExternalLink href="https://github.com/MarK-MkSaMa/ldml">查看 GitHub</SecondaryExternalLink>
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <span>{label}</span>
      <ArrowRight className="h-4 w-4 text-zinc-400" aria-hidden />
    </Link>
  );
}

function QuickExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <span>{label}</span>
      <ArrowRight className="h-4 w-4 text-zinc-400" aria-hidden />
    </a>
  );
}

function SecondaryExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </a>
  );
}
