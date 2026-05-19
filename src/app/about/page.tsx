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

          <h2>评分规则</h2>
          <ul>
            <li>每个用户用 Linux DO 账号登录后可对模型评分</li>
            <li>需要 Linux DO <strong>信任等级 ≥ 1</strong> 才能投票</li>
            <li>每个维度独立打 <strong>1–10 分</strong>；不熟悉的维度可以跳过</li>
            <li>已评分可随时修改或撤回</li>
            <li>
              展示给用户看的是 <strong>真实算术均分</strong>；排行用
              <strong>贝叶斯加权分</strong>计算，避免少票模型霸榜
            </li>
          </ul>

          <h2>新模型缓冲</h2>
          <ul>
            <li>
              <strong>观察区</strong>：新加入的模型先在观察区接受投票，未到门槛前不计入正式榜
            </li>
            <li>
              <strong>正式榜</strong>：满足"上架 ≥ 7 天 或 总票数 ≥ 50"任一条件后晋升
            </li>
          </ul>

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
