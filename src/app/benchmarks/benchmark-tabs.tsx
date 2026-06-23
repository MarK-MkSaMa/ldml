import Link from "next/link";

export function BenchmarkTabs({ active }: { active: "leaderboard" | "questions" | "submit" }) {
  return (
    <nav className="mb-8 flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800">
      <TabLink href="/benchmarks" active={active === "leaderboard"}>
        排行榜
      </TabLink>
      <TabLink href="/benchmarks/questions" active={active === "questions"}>
        公开题库
      </TabLink>
      <TabLink href="/benchmarks/submit" active={active === "submit"}>
        上传题目
      </TabLink>
    </nav>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
        active
          ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
          : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      {children}
    </Link>
  );
}
