/**
 * 关于页
 */
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "关于 · LDML 大模型排行榜",
};

export default function AboutPage() {
  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader maxWidth="max-w-3xl" />

      <article className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">关于 LDML</h1>
        <p className="mt-3 text-sm text-zinc-500">
          Linux DO 大模型排行榜
        </p>

        <section className="markdown-body mt-8 space-y-6 text-zinc-800 dark:text-zinc-200">
          <p>LDML 是面向 Linux DO 社区的大模型投票排行榜站点，覆盖多种模型类型。<br />
          评分来自社区用户的真实投票，纯公益，保证真实。<br />
          注：本站与 Linux DO 官方没有任何关联，仅为 马克MkSaMa 自主维护的公益网站</p>

          <h2>提交新模型 / 反馈问题</h2>
          <p>
            有新模型希望加入榜单，或发现错误数据 / Bug，请到Linux DO私信站点维护者{" "}
            <a
              href="https://linux.do/u/markskz/summary"
              target="_blank"
              rel="noopener noreferrer"
            >
              马克MkSaMa
            </a>{" "}
            。
          </p>

          <h2>开源</h2>
          <p>
            项目源代码托管在{" "}
            <a
              href="https://github.com/MarK-MkSaMa/ldml"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            ，欢迎围观和提 issue。
          </p>
        </section>
      </article>

      <SiteFooter />
    </main>
  );
}
